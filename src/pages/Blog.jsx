import { useEffect, useState } from "react";
import PostList from "../components/PostList";
import PostEditor from "../components/PostEditor";
import {
  createPost,
  deletePost as deletePostFromSupabase,
  fetchTags,
  updatePost,
} from "../controllers/supabaseController";

const postDraftStorageKey = "ks-blogsite-post-draft";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error(`Unable to read image "${file.name}".`));
      }
    };
    reader.onerror = () =>
      reject(reader.error || new Error(`Unable to read image "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

function fileFromDataUrl(image) {
  const match = /^data:([^;,]+);base64,(.*)$/.exec(image.dataUrl);
  if (!match) {
    throw new Error(`The saved image "${image.name}" is invalid.`);
  }

  const binary = window.atob(match[2]);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new File([bytes], image.name, {
    type: match[1],
    lastModified: image.lastModified,
  });
}

function loadPostDraft() {
  const savedDraft = window.localStorage.getItem(postDraftStorageKey);
  if (!savedDraft) return null;

  const parsed = JSON.parse(savedDraft);
  if (
    parsed?.version !== 1 ||
    typeof parsed.title !== "string" ||
    typeof parsed.content !== "string" ||
    typeof parsed.hidden !== "boolean" ||
    !Array.isArray(parsed.tags) ||
    !parsed.tags.every((tag) => typeof tag === "string") ||
    !Array.isArray(parsed.images)
  ) {
    throw new Error("The saved post draft is invalid and could not be loaded.");
  }

  const images = parsed.images.map((image) => {
    if (
      typeof image?.name !== "string" ||
      typeof image.dataUrl !== "string" ||
      !Number.isFinite(image.lastModified)
    ) {
      throw new Error("The saved post draft contains an invalid image.");
    }
    return fileFromDataUrl(image);
  });

  return {
    draft: {
      title: parsed.title,
      content: parsed.content,
      hidden: parsed.hidden,
      tags: parsed.tags,
    },
    images,
  };
}

// Name: Blog
// Parameters:
//     isAdmin - Whether the current user can manage posts.
// Description: Renders blog controls, manages post editing, and filters the post list.
// Author: Keith Sialana
export default function Blog({ isAdmin }) {
  const [count, setCount] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedTag, setSelectedTag] = useState("");
  const [tags, setTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [tagsError, setTagsError] = useState("");
  const [authError, setAuthError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({
    title: "",
    content: "",
    hidden: false,
    tags: [],
  });
  const [selectedImages, setSelectedImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    // Name: loadTags
    // Parameters:
    //     None - This function takes no parameters.
    // Description: Fetches available tags and updates the loading or error state.
    // Author: Keith Sialana
    async function loadTags() {
      try {
        const fetchedTags = await fetchTags();
        if (!cancelled) setTags(fetchedTags);
      } catch (error) {
        if (!cancelled) {
          setTagsError(error.message || "Unable to load tags.");
        }
      } finally {
        if (!cancelled) setTagsLoading(false);
      }
    }

    loadTags();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!editorOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Name: handleKeyDown
    // Parameters:
    //     event - The keyboard event to inspect.
    // Description: Closes the post editor when Escape is pressed and no save is in progress.
    // Author: Keith Sialana
    function handleKeyDown(event) {
      if (event.key === "Escape" && !saving) {
        setEditorOpen(false);
        setEditingId(null);
        setSelectedImages([]);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [editorOpen, saving]);

  // Name: startNewPost
  // Parameters:
  //     None - This function takes no parameters.
  // Description: Resets the editor draft and opens a new post form.
  // Author: Keith Sialana
  function startNewPost() {
    setEditingId(null);
    setDraft({ title: "", content: "", hidden: false, tags: [] });
    setSelectedImages([]);
    setDraftSaved(false);
    setAuthError("");
    try {
      const savedDraft = loadPostDraft();
      if (savedDraft) {
        setDraft(savedDraft.draft);
        setSelectedImages(savedDraft.images);
      }
    } catch (error) {
      setAuthError(error.message || "Unable to load the saved draft.");
    }
    setEditorOpen(true);
  }

  // Name: startEditing
  // Parameters:
  //     post - The post to load into the editor.
  // Description: Loads an existing post into the editor and opens the edit form.
  // Author: Keith Sialana
  function startEditing(post) {
    setEditingId(post.id);
    setDraft({
      title: post.title,
      content: post.content,
      hidden: post.hidden,
      tags: Array.isArray(post.tags) ? post.tags : [],
    });
    setSelectedImages([]);
    setDraftSaved(false);
    setAuthError("");
    setEditorOpen(true);
  }

  // Name: saveDraft
  // Parameters:
  //     None - Saves the current new-post form in browser storage.
  // Description: Stores the post fields and selected images as a JSON draft.
  // Author: Keith Sialana
  async function saveDraft() {
    setAuthError("");
    setSavingDraft(true);
    setDraftSaved(false);
    const draftToSave = draft;
    const imagesToSave = selectedImages;

    try {
      const images = await Promise.all(
        imagesToSave.map(async (image) => ({
          name: image.name,
          lastModified: image.lastModified,
          dataUrl: await fileToDataUrl(image),
        }))
      );
      const savedDraft = {
        version: 1,
        title: draftToSave.title,
        content: draftToSave.content,
        hidden: draftToSave.hidden,
        tags: draftToSave.tags,
        images,
      };
      window.localStorage.setItem(
        postDraftStorageKey,
        JSON.stringify(savedDraft)
      );
      if (draft === draftToSave && selectedImages === imagesToSave) {
        setDraftSaved(true);
      }
    } catch (error) {
      setAuthError(
        error.name === "QuotaExceededError"
          ? "Unable to save the draft because it exceeds this browser's local storage capacity. Try removing or resizing images."
          : error.message || "Unable to save the draft in this browser."
      );
    } finally {
      setSavingDraft(false);
    }
  }

  // Name: clearNewPost
  // Parameters:
  //     None - Clears the new-post form without changing the saved local draft.
  // Description: Resets all create-post fields while preserving stored draft data.
  // Author: Keith Sialana
  function clearNewPost() {
    setDraft({ title: "", content: "", hidden: false, tags: [] });
    setSelectedImages([]);
    setDraftSaved(false);
    setFormResetKey((key) => key + 1);
    setAuthError("");
  }

  // Name: savePost
  // Parameters:
  //     event - The post editor form submission event.
  // Description: Creates or updates a post and refreshes the post list on success.
  // Author: Keith Sialana
  async function savePost(event) {
    event.preventDefault();
    setAuthError("");
    setSaving(true);

    const post = {
      title: draft.title.trim(),
      content: draft.content.trim(),
      hidden: draft.hidden,
      tags: [...draft.tags],
    };

    try {
      if (editingId) {
        await updatePost(editingId, post, selectedImages);
      } else {
        await createPost(post, selectedImages);
      }

      let draftCleanupError = "";
      if (!editingId) {
        try {
          window.localStorage.removeItem(postDraftStorageKey);
        } catch (error) {
          draftCleanupError =
            error.message || "Unable to clear the saved local draft.";
        }
      }
      setEditorOpen(false);
      setEditingId(null);
      setSelectedImages([]);
      setRefreshKey((key) => key + 1);
      if (draftCleanupError) {
        setAuthError(
          `Post saved, but the local draft could not be cleared: ${draftCleanupError}`
        );
      }
    } catch (error) {
      setAuthError(error.message || "Unable to save the post.");
    } finally {
      setSaving(false);
    }
  }

  // Name: deletePost
  // Parameters:
  //     post - The post to confirm and delete.
  // Description: Confirms and deletes a post, then refreshes the post list.
  // Author: Keith Sialana
  async function deletePost(post) {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) {
      return;
    }

    setAuthError("");
    try {
      await deletePostFromSupabase(post.id);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setAuthError(error.message || "Unable to delete the post.");
    }
  }

  return (
    <section>
      <h1 className="blog-title">Keith's Blog</h1>

      {isAdmin && (
        <div className="blog-toolbar">
          <button
            type="button"
            className="create-post-button"
            onClick={startNewPost}
          >
            Create post
          </button>
        </div>
      )}

      {isAdmin && editorOpen && (
        <div
          className="post-editor-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setEditorOpen(false);
              setEditingId(null);
              setSelectedImages([]);
            }
          }}
        >
          <PostEditor
            draft={draft}
            onDraftChange={(nextDraft) => {
              setDraft(nextDraft);
              setDraftSaved(false);
            }}
            tags={tags}
            tagsLoading={tagsLoading}
            tagsError={tagsError}
            selectedImages={selectedImages}
            onImagesChange={(files, error) => {
              setSelectedImages(files);
              setDraftSaved(false);
              setAuthError(error);
            }}
            saving={saving}
            savingDraft={savingDraft}
            draftSaved={draftSaved}
            formResetKey={formResetKey}
            isEditing={Boolean(editingId)}
            onSubmit={savePost}
            onSaveDraft={saveDraft}
            onClear={clearNewPost}
            onCancel={() => {
              if (saving) return;
              setEditorOpen(false);
              setEditingId(null);
              setSelectedImages([]);
            }}
          />
        </div>
      )}

      {authError && <p role="alert">{authError}</p>}

      <div className="blog-filters">
        <label className="blog-filter">
          Show latest{" "}
          <select
            value={count ?? "all"}
            onChange={(event) => {
              setCount(
                event.target.value === "all" ? null : Number(event.target.value)
              );
              setPage(1);
            }}
          >
            <option value={10}>10 posts</option>
            <option value={20}>20 posts</option>
            <option value={50}>50 posts</option>
            {isAdmin && <option value="all">All posts</option>}
          </select>
        </label>

        <label className="blog-filter">
          Tags{" "}
          <select
            value={selectedTag}
            disabled={tagsLoading || Boolean(tagsError)}
            onChange={(event) => {
              setSelectedTag(event.target.value);
              setPage(1);
            }}
          >
            <option value="">None</option>
            {tagsLoading && (
              <option value="loading" disabled>
                Loading tags...
              </option>
            )}
            {!tagsLoading && !tagsError && tags.length === 0 && (
              <option value="empty" disabled>
                No tags found
              </option>
            )}
            {tags.map(({ tag_name: tagName }) => (
              <option key={tagName} value={tagName}>
                {tagName}
              </option>
            ))}
          </select>
        </label>
      </div>
      {tagsError && <p role="alert">{tagsError}</p>}

      <PostList
        limit={count}
        tag={selectedTag}
        onTagSelect={(tag) => {
          setSelectedTag(tag);
          setPage(1);
        }}
        page={page}
        onPageChange={setPage}
        isAdmin={isAdmin}
        refreshKey={refreshKey}
        onEdit={startEditing}
        onDelete={deletePost}
      />
    </section>
  );
}