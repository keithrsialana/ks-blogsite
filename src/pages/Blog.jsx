import { useState } from "react";
import PostList from "../components/PostList";
import { supabase } from "../supabase";

export default function Blog({ isAdmin }) {
  const [count, setCount] = useState(10);
  const [authError, setAuthError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ title: "", content: "", hidden: false });
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function startNewPost() {
    setEditingId(null);
    setDraft({ title: "", content: "", hidden: false });
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
      const result = editingId
        ? await supabase.from("post").update(post).eq("id", editingId)
        : await supabase.from("post").insert(post);

      if (result.error) throw result.error;

      setEditorOpen(false);
      setEditingId(null);
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
      <h1>Keith's Blog</h1>

      {isAdmin && (
        <div style={{ marginBottom: "1rem" }}>
          <button type="button" onClick={startNewPost}>
            Create post
          </button>
        </div>
      )}

      {isAdmin && editorOpen && (
        <form onSubmit={savePost} style={{ margin: "1rem 0" }}>
          <h2>{editingId ? "Edit post" : "Create post"}</h2>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Title
            <input
              type="text"
              value={draft.title}
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
              required
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Content
            <textarea
              value={draft.content}
              onChange={(event) =>
                setDraft({ ...draft, content: event.target.value })
              }
              required
              rows={8}
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.hidden}
              onChange={(event) =>
                setDraft({ ...draft, hidden: event.target.checked })
              }
            />{" "}
            Hide from visitors
          </label>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save post"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditorOpen(false);
                setEditingId(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {authError && <p role="alert">{authError}</p>}

      <label>
        Show latest{" "}
        <select
          value={count ?? "all"}
          onChange={(event) =>
            setCount(event.target.value === "all" ? null : Number(event.target.value))
          }
        >
          <option value={10}>10 posts</option>
          <option value={20}>20 posts</option>
          <option value={50}>50 posts</option>
          {isAdmin && <option value="all">All posts</option>}
        </select>
      </label>

      <PostList
        limit={count}
        isAdmin={isAdmin}
        refreshKey={refreshKey}
        onEdit={startEditing}
        onDelete={deletePost}
      />
    </section>
  );
}