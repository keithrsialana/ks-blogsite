import { useState } from "react";
import PostList from "../components/PostList";
import PostEditor from "../components/PostEditor";
import {
  createPost,
  deletePost as deletePostFromSupabase,
  updatePost,
} from "../controllers/supabaseController";

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
        await updatePost(editingId, post, selectedImages);
      } else {
        await createPost(post, selectedImages);
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
        <PostEditor
          draft={draft}
          onDraftChange={setDraft}
          selectedImages={selectedImages}
          onImagesChange={(files, error) => {
            setSelectedImages(files);
            setAuthError(error);
          }}
          saving={saving}
          isEditing={Boolean(editingId)}
          onSubmit={savePost}
          onCancel={() => {
            setEditorOpen(false);
            setEditingId(null);
            setSelectedImages([]);
          }}
        />
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