import { useState } from "react";
import PostList from "../components/PostList";
import { supabase } from "../supabase";

const imageBucket = "post-images";

async function createImagePath(postId, file) {
  const randomBytes = window.crypto.getRandomValues(new Uint8Array(32));
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", randomBytes);
  const hash = Array.from(new Uint8Array(hashBuffer), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  const extension = file.name.match(/\.([a-z0-9]{1,10})$/i)?.[1].toLowerCase() || "img";

  return `${postId}/${hash}.${extension}`;
}

async function removePostImages(postId, paths) {
  if (paths.length === 0) return;

  const { error: recordError } = await supabase
    .from("photo_item")
    .delete()
    .eq("post_id", postId)
    .in("path", paths);

  if (recordError) {
    throw new Error(`Unable to remove image records: ${recordError.message}`);
  }

  const { error: storageError } = await supabase.storage
    .from(imageBucket)
    .remove(paths);

  if (storageError) {
    throw new Error(`Unable to remove uploaded image files: ${storageError.message}`);
  }
}

async function savePostImages(postId, files) {
  const uploadedPaths = [];
  const storage = supabase.storage.from(imageBucket);

  try {
    for (const file of files) {
      const path = await createImagePath(postId, file);
      const { error } = await storage.upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) {
        throw new Error(`Unable to upload image to Supabase Storage: ${error.message}`, {
          cause: error,
        });
      }
      uploadedPaths.push(path);
    }

    if (uploadedPaths.length > 0) {
      const { error } = await supabase.from("photo_item").insert(
        uploadedPaths.map((path) => ({ path, post_id: postId }))
      );
      if (error) {
        throw new Error(`Unable to save image records in photo_item: ${error.message}`, {
          cause: error,
        });
      }
    }

    return uploadedPaths;
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const { error: cleanupError } = await storage.remove(uploadedPaths);
      if (cleanupError) {
        throw new Error(
          `${error.message || "Unable to upload post images."} Cleanup failed: ${cleanupError.message}`,
          { cause: error }
        );
      }
    }
    throw error;
  }
}

export default function Blog({ isAdmin }) {
  const [count, setCount] = useState(10);
  const [page, setPage] = useState(1);
  const [authError, setAuthError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ title: "", content: "", hidden: false });
  const [selectedImages, setSelectedImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function startNewPost() {
    setEditingId(null);
    setDraft({ title: "", content: "", hidden: false });
    setSelectedImages([]);
    setAuthError("");
    setEditorOpen(true);
  }

  function startEditing(post) {
    setEditingId(post.id);
    setDraft({
      title: post.title,
      content: post.content,
      hidden: post.hidden,
    });
    setSelectedImages([]);
    setAuthError("");
    setEditorOpen(true);
  }

  async function savePost(event) {
    event.preventDefault();
    setAuthError("");
    setSaving(true);

    const post = {
      title: draft.title.trim(),
      content: draft.content.trim(),
      hidden: draft.hidden,
    };

    try {
      if (editingId) {
        const uploadedPaths = await savePostImages(editingId, selectedImages);
        const { error } = await supabase
          .from("post")
          .update({ ...post, updated_at: new Date().toISOString() })
          .eq("id", editingId);

        if (error) {
          if (uploadedPaths.length > 0) {
            try {
              await removePostImages(editingId, uploadedPaths);
            } catch (cleanupError) {
              throw new Error(
                `${error.message} Image cleanup failed: ${cleanupError.message}`,
                { cause: cleanupError }
              );
            }
          }
          throw error;
        }
      } else {
        const { data, error } = await supabase
          .from("post")
          .insert(post)
          .select("id")
          .single();
        if (error) throw error;

        try {
          await savePostImages(data.id, selectedImages);
        } catch (imageError) {
          const { error: deleteError } = await supabase
            .from("post")
            .delete()
            .eq("id", data.id);
          if (deleteError) {
            throw new Error(
              `${imageError.message} The post could not be rolled back: ${deleteError.message}`,
              { cause: imageError }
            );
          }
          throw imageError;
        }
      }

      setEditorOpen(false);
      setEditingId(null);
      setSelectedImages([]);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setAuthError(error.message || "Unable to save the post.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePost(post) {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) {
      return;
    }

    setAuthError("");
    try {
      const { error } = await supabase.from("post").delete().eq("id", post.id);
      if (error) throw error;
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
        <form onSubmit={savePost} className="post-editor">
          <h2>{editingId ? "Edit post" : "Create post"}</h2>
          <label className="form-field">
            Title
            <input
              type="text"
              value={draft.title}
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
              required
            />
          </label>
          <label className="form-field">
            Content
            <textarea
              value={draft.content}
              onChange={(event) =>
                setDraft({ ...draft, content: event.target.value })
              }
              required
              rows={8}
            />
          </label>
          <label className="form-field image-upload-field">
            Images
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                if (files.some((file) => !file.type.startsWith("image/"))) {
                  setAuthError("Select image files only.");
                  event.target.value = "";
                  return;
                }
                setAuthError("");
                setSelectedImages(files);
              }}
            />
            {selectedImages.length > 0 && (
              <span className="selected-image-count">
                {selectedImages.length} image
                {selectedImages.length === 1 ? "" : "s"} selected
              </span>
            )}
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={draft.hidden}
              onChange={(event) =>
                setDraft({ ...draft, hidden: event.target.checked })
              }
            />{" "}
            Hide from visitors
          </label>
          <div className="form-actions">
            <button
              type="submit"
              className="save-post-button"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save post"}
            </button>
            <button
              type="button"
              className="cancel-post-button"
              onClick={() => {
                setEditorOpen(false);
                setEditingId(null);
                setSelectedImages([]);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {authError && <p role="alert">{authError}</p>}

      <label className="post-count">
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

      <PostList
        limit={count}
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