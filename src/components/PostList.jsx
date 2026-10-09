import { Fragment, useEffect, useState } from "react";
import {
  fetchPosts,
  getPostImageUrl,
} from "../controllers/supabaseController";

const URL_PATTERN = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
const POST_DATE_FORMAT = {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

function renderLinkedContent(content) {
  return content.split(URL_PATTERN).map((part, index) => {
    if (index % 2 === 0) return part;

    const trailingPunctuation = part.match(/[.,!?;:]+$/)?.[0] ?? "";
    const url = part.slice(0, part.length - trailingPunctuation.length);
    if (!url) return part;

    return (
      <Fragment key={index}>
        <a
          href={/^www\./i.test(url) ? `https://${url}` : url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {url}
        </a>
        {trailingPunctuation}
      </Fragment>
    );
  });
}

function PostImageCarousel({ images }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) return null;

  const image = images[activeIndex];
  const imageUrl = getPostImageUrl(image.path);

  function showPrevious() {
    setActiveIndex((index) => (index - 1 + images.length) % images.length);
  }

  function showNext() {
    setActiveIndex((index) => (index + 1) % images.length);
  }

  return (
    <div className="post-carousel" role="group" aria-label="Post images">
      <img src={imageUrl} alt={image.caption || ""} loading="lazy" />
      {images.length > 1 && (
        <div className="carousel-controls">
          <button type="button" onClick={showPrevious} aria-label="Previous image">
            Previous
          </button>
          <span aria-live="polite">
            {activeIndex + 1} / {images.length}
          </span>
          <button type="button" onClick={showNext} aria-label="Next image">
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default function PostList({
  limit = 10,
  tag = "",
  page = 1,
  onPageChange,
  isAdmin = false,
  refreshKey = 0,
  onEdit,
  onDelete,
}) {
  const [posts, setPosts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPosts() {
      setLoading(true);
      setError("");

      try {
        const { posts: fetchedPosts, totalCount: fetchedCount } =
          await fetchPosts({ isAdmin, limit, page, tag });
        if (!cancelled) {
          setPosts(fetchedPosts);
          setTotalCount(fetchedCount);
        }
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
  }, [isAdmin, limit, page, refreshKey, tag]);

  const pageCount =
    limit === null ? 1 : Math.max(1, Math.ceil(totalCount / limit));

  useEffect(() => {
    if (limit !== null && page > pageCount) {
      onPageChange?.(pageCount);
    }
  }, [limit, onPageChange, page, pageCount]);

  if (loading) return <p>Loading posts...</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <div className="post-list">
      {posts.length === 0 ? (
        <p>No posts yet.</p>
      ) : (
        posts.map((p) => (
          <article key={p.id} className="post">
            <h2>{p.title}</h2>
            {Array.isArray(p.tags) && p.tags.some((tag) => typeof tag === "string") && (
              <ul className="selected-tags post-tags" aria-label="Post tags">
                {p.tags
                  .filter((tag) => typeof tag === "string")
                  .map((tag) => (
                    <li className="tag-chip" key={tag}>
                      {tag}
                    </li>
                  ))}
              </ul>
            )}
            <div className="post-dates">
              <small>
                Created at:{" "}
                {new Date(p.created_at).toLocaleString(undefined, POST_DATE_FORMAT)}
              </small>
              {p.updated_at &&
                new Date(p.updated_at) > new Date(p.created_at) && (
                  <small>
                    Updated At:{" "}
                    {new Date(p.updated_at).toLocaleString(undefined, POST_DATE_FORMAT)}
                  </small>
                )}
            </div>
            {isAdmin && p.hidden && <p>Hidden from visitors</p>}
            <p className="post-content">{renderLinkedContent(p.content)}</p>
            <PostImageCarousel images={p.photo_item ?? []} />
            {isAdmin && (
              <div className="post-actions">
                <button
                  type="button"
                  className="edit-post-button"
                  onClick={() => onEdit(p)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="delete-post-button"
                  onClick={() => onDelete(p)}
                >
                  Delete
                </button>
              </div>
            )}
          </article>
        ))
      )}
      {limit !== null && pageCount > 1 && (
        <nav className="post-pagination" aria-label="Blog post pages">
          <button
            type="button"
            onClick={() => onPageChange?.(page - 1)}
            disabled={page <= 1}
          >
            Prev
          </button>
          <span aria-live="polite">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= pageCount}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}