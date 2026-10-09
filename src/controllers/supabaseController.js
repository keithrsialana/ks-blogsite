import { supabase } from "../supabase";

const imageBucket = "post-images";

// Name: throwIfError
// Parameters:
//     error - The Supabase error to check.
// Description: Throws a Supabase error when a request fails.
// Author: Keith Sialana
function throwIfError(error) {
  if (error) throw error;
}

// Name: withTagNameArray
// Parameters:
//     post - The post whose tag-name array should be validated.
// Description: Validates and copies a post's tag names into an array.
// Author: Keith Sialana
function withTagNameArray(post) {
  if (
    !Array.isArray(post.tags) ||
    post.tags.some((tagName) => typeof tagName !== "string")
  ) {
    throw new Error("Post tags must be an array of tag names.");
  }

  return { ...post, tags: [...post.tags] };
}

// Name: createImagePath
// Parameters:
//     postId - The owning post's ID.
//     file - The image file to name.
// Description: Creates a unique hashed storage path for a post image.
// Author: Keith Sialana
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

// Name: getCurrentSession
// Parameters:
//     None - This function takes no parameters.
// Description: Retrieves the current Supabase authentication session.
// Author: Keith Sialana
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  throwIfError(error);
  return data.session;
}

// Name: subscribeToAuthChanges
// Parameters:
//     onSessionChange - Callback invoked with each updated session.
// Description: Subscribes to Supabase auth changes and returns an unsubscribe function.
// Author: Keith Sialana
export function subscribeToAuthChanges(onSessionChange) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    onSessionChange(session);
  });

  return () => subscription.unsubscribe();
}

// Name: signInWithPassword
// Parameters:
//     credentials - Supabase email and password credentials.
// Description: Signs in to Supabase with email and password credentials.
// Author: Keith Sialana
export async function signInWithPassword(credentials) {
  const { error } = await supabase.auth.signInWithPassword(credentials);
  throwIfError(error);
}

// Name: signOut
// Parameters:
//     None - This function takes no parameters.
// Description: Signs out the current Supabase user.
// Author: Keith Sialana
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  throwIfError(error);
}

// Name: fetchTags
// Parameters:
//     None - This function takes no parameters.
// Description: Retrieves available tags from Supabase in tag-name order.
// Author: Keith Sialana
export async function fetchTags() {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("tag_name", { ascending: true });
  throwIfError(error);

  return data ?? [];
}

// Name: createPostsQuery
// Parameters:
//     isAdmin - Whether hidden posts should be included.
// Description: Creates an ordered post query, hiding hidden posts from visitors.
// Author: Keith Sialana
function createPostsQuery(isAdmin) {
  let query = supabase
    .from("post")
    .select("*, photo_item(*)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (!isAdmin) query = query.eq("hidden", false);
  return query;
}

// Name: fetchPosts
// Parameters:
//     isAdmin - Whether hidden posts are visible.
//     limit - Posts per page, or null for all.
//     page - Page number to retrieve.
//     tag - Optional tag name to match.
// Description: Retrieves posts with optional tag matching and pagination.
// Author: Keith Sialana
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

// Name: getPostImageUrl
// Parameters:
//     path - Storage path of the image.
// Description: Returns the public URL for a stored post image.
// Author: Keith Sialana
export function getPostImageUrl(path) {
  const { data } = supabase.storage.from(imageBucket).getPublicUrl(path);
  return data.publicUrl;
}

// Name: removePostImages
// Parameters:
//     postId - ID of the owning post.
//     paths - Image paths to delete.
// Description: Deletes image records and their stored files for a post.
// Author: Keith Sialana
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

// Name: uploadPostImages
// Parameters:
//     postId - ID of the owning post.
//     files - Image files to upload.
// Description: Uploads post images and stores their database records.
// Author: Keith Sialana
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

// Name: createPost
// Parameters:
//     post - Post data to insert.
//     imageFiles - Images to upload for the post.
// Description: Inserts a post and uploads its images, rolling back on upload failure.
// Author: Keith Sialana
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

// Name: updatePost
// Parameters:
//     postId - ID of the post to update.
//     post - Updated post data.
//     imageFiles - New images to upload.
// Description: Updates a post and uploads its images with cleanup on failure.
// Author: Keith Sialana
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

// Name: deletePost
// Parameters:
//     postId - ID of the post to delete.
// Description: Deletes a post from Supabase.
// Author: Keith Sialana
export async function deletePost(postId) {
  const { error } = await supabase.from("post").delete().eq("id", postId);
  throwIfError(error);
}
