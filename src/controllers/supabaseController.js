import { supabase } from "../supabase";

const imageBucket = "post-images";

function throwIfError(error) {
  if (error) throw error;
}

function withTagNameArray(post) {
  if (
    !Array.isArray(post.tags) ||
    post.tags.some((tagName) => typeof tagName !== "string")
  ) {
    throw new Error("Post tags must be an array of tag names.");
  }

  return { ...post, tags: [...post.tags] };
}

async function createImagePath(postId, file) {
  const randomBytes = window.crypto.getRandomValues(new Uint8Array(32));
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", randomBytes);
  const hash = Array.from(new Uint8Array(hashBuffer), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  const extension =
    file.name.match(/\.([a-z0-9]{1,10})$/i)?.[1].toLowerCase() || "img";

  return `${postId}/${hash}.${extension}`;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  throwIfError(error);
  return data.session;
}

export function subscribeToAuthChanges(onSessionChange) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    onSessionChange(session);
  });

  return () => subscription.unsubscribe();
}

export async function signInWithPassword(credentials) {
  const { error } = await supabase.auth.signInWithPassword(credentials);
  throwIfError(error);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  throwIfError(error);
}

export async function fetchTags() {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("tag_name", { ascending: true });
  throwIfError(error);

  return data ?? [];
}

function createPostsQuery(isAdmin) {
  let query = supabase
    .from("post")
    .select("*, photo_item(*)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (!isAdmin) query = query.eq("hidden", false);
  return query;
}

export async function fetchPosts({ isAdmin, limit, page, tag }) {
  if (tag) {
    const batchSize = 500;
    const allPosts = [];
    let totalCount = 0;

    for (let start = 0; start === 0 || start < totalCount; ) {
      const { data, count, error } = await createPostsQuery(isAdmin).range(
        start,
        start + batchSize - 1
      );
      throwIfError(error);

      const batch = data ?? [];
      if (start === 0) totalCount = count ?? 0;
      if (batch.length === 0) break;

      allPosts.push(...batch);
      start += batch.length;
    }

    const matchingPosts = allPosts.filter(
      (post) => Array.isArray(post.tags) && post.tags.includes(tag)
    );
    const start = limit === null ? 0 : (page - 1) * limit;
    const end = limit === null ? undefined : start + limit;

    return {
      posts: matchingPosts.slice(start, end),
      totalCount: matchingPosts.length,
    };
  }

  let query = createPostsQuery(isAdmin);
  if (limit !== null) {
    const start = (page - 1) * limit;
    query = query.range(start, start + limit - 1);
  }
  const { data, count, error } = await query;
  throwIfError(error);

  return { posts: data ?? [], totalCount: count ?? 0 };
}

export function getPostImageUrl(path) {
  const { data } = supabase.storage.from(imageBucket).getPublicUrl(path);
  return data.publicUrl;
}

async function removePostImages(postId, paths) {
  if (paths.length === 0) return;

  const { error: recordError } = await supabase
    .from("photo_item")
    .delete()
    .eq("post_id", postId)
    .in("path", paths);
  throwIfError(recordError);

  const { error: storageError } = await supabase.storage
    .from(imageBucket)
    .remove(paths);
  throwIfError(storageError);
}

async function uploadPostImages(postId, files) {
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
        throw new Error(
          `Unable to upload image to Supabase Storage: ${error.message}`,
          { cause: error }
        );
      }
      uploadedPaths.push(path);
    }

    if (uploadedPaths.length > 0) {
      const { error } = await supabase.from("photo_item").insert(
        uploadedPaths.map((path) => ({ path, post_id: postId }))
      );
      if (error) {
        throw new Error(
          `Unable to save image records in photo_item: ${error.message}`,
          { cause: error }
        );
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

export async function createPost(post, imageFiles) {
  const { data, error } = await supabase
    .from("post")
    .insert(withTagNameArray(post))
    .select("id")
    .single();
  throwIfError(error);

  try {
    await uploadPostImages(data.id, imageFiles);
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

  return data.id;
}

export async function updatePost(postId, post, imageFiles) {
  const postWithTags = withTagNameArray(post);
  const uploadedPaths = await uploadPostImages(postId, imageFiles);
  const { error } = await supabase
    .from("post")
    .update({
      ...postWithTags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);

  if (error) {
    if (uploadedPaths.length > 0) {
      try {
        await removePostImages(postId, uploadedPaths);
      } catch (cleanupError) {
        throw new Error(
          `${error.message} Image cleanup failed: ${cleanupError.message}`,
          { cause: cleanupError }
        );
      }
    }
    throw error;
  }
}

export async function deletePost(postId) {
  const { error } = await supabase.from("post").delete().eq("id", postId);
  throwIfError(error);
}
