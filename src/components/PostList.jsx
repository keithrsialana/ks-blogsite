import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function PostList({
  limit = 10,
  isAdmin = false,
  refreshKey = 0,
  onEdit,
  onDelete,
}) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPosts() {
      setLoading(true);
      setError("");

      try {
        let query = supabase
          .from("post")
          .select("*, photo_item(*)")
          .order("created_at", { ascending: false })
          .limit(limit);

        if (!isAdmin) query = query.eq("hidden", false);

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;
        if (!cancelled) setPosts(data ?? []);
      } catch (fetchError) {
        if (!cancelled) setError(fetchError.message || "Unable to load posts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPosts();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, limit, refreshKey]);

  if (loading) return <p>Loading posts...</p>;
  if (error) return <p role="alert">{error}</p>;
  if (posts.length === 0) return <p>No posts yet.</p>;

  return (
    <>
      {posts.map((p) => (
        <article key={p.id} style={{ margin: "2rem 0" }}>
          <h2>{p.title}</h2>
          <small>{new Date(p.created_at).toLocaleDateString()}</small>
          {isAdmin && p.hidden && <p>Hidden from visitors</p>}
          <p>{p.content}</p>
          {p.photo_item.map((img) => {
            const { data } = supabase.storage
              .from("post-images")
              .getPublicUrl(img.path);
            return (
              <img
                key={img.id}
                src={data.publicUrl}
                alt={img.caption || ""}
                style={{ maxWidth: "100%" }}
              />
            );
          })}
          {isAdmin && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" onClick={() => onEdit(p)}>
                Edit
              </button>
              <button type="button" onClick={() => onDelete(p)}>
                Delete
              </button>
            </div>
          )}
        </article>
      ))}
    </>
  );
}