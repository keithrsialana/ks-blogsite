import { useEffect, useState } from "react";
import PostList from "../components/PostList";
import { supabase } from "../supabase";

const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase();

export default function Blog() {
  const [count, setCount] = useState(10);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ title: "", content: "", hidden: false });
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;

        if (error) setAuthError(error.message);
        setIsAdmin(
          Boolean(
            adminEmail &&
              data.session?.user.email?.toLowerCase() === adminEmail
          )
        );
      } catch (error) {
        if (active) setAuthError(error.message || "Unable to check admin access.");
      } finally {
        if (active) setAuthLoading(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(
        Boolean(
          adminEmail && session?.user.email?.toLowerCase() === adminEmail
        )
      );
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(event) {
    event.preventDefault();
    setAuthError("");

    if (!adminEmail) {
      setAuthError("Set VITE_ADMIN_EMAIL before signing in.");
      return;
    }

    if (email.trim().toLowerCase() !== adminEmail) {
      setAuthError("This account is not allowed to manage posts.");
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) setAuthError(error.message);
      else setPassword("");
    } catch (error) {
      setAuthError(error.message || "Unable to sign in.");
    }
  }

  async function signOut() {
    setAuthError("");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setEditorOpen(false);
      setEditingId(null);
    } catch (error) {
      setAuthError(error.message || "Unable to sign out.");
    }
  }

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

      {authLoading ? (
        <p>Checking admin access...</p>
      ) : isAdmin ? (
        <div style={{ marginBottom: "1rem" }}>
          <button type="button" onClick={startNewPost}>
            Create post
          </button>{" "}
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      ) : (
        <form onSubmit={signIn} style={{ marginBottom: "1rem" }}>
          <h2>Admin sign in</h2>
          {!adminEmail && (
            <p role="alert">
              Admin sign-in is not configured. Add VITE_ADMIN_EMAIL to your
              project&apos;s .env file, then restart the dev server.
            </p>
          )}
          <label>
            Email{" "}
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>{" "}
          <label>
            Password{" "}
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>{" "}
          <button type="submit">Sign in</button>
        </form>
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
        <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
          <option value={10}>10 posts</option>
          <option value={20}>20 posts</option>
          <option value={50}>50 posts</option>
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