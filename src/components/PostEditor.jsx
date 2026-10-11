// Name: PostEditor
// Parameters:
//     draft - Current post form values.
//     onDraftChange - Updates form values.
//     tags - Available tags.
//     tagsLoading - Whether tags are loading.
//     tagsError - Tag loading error message.
//     selectedImages - Images chosen for upload.
//     onImagesChange - Updates chosen images and validation errors.
//     saving - Whether a save is in progress.
//     savingDraft - Whether the local draft is being saved.
//     draftSaved - Whether the current form is saved locally.
//     formResetKey - Remounts uncontrolled form elements after clearing.
//     isEditing - Whether editing an existing post.
//     onSubmit - Handles form submission.
//     onSaveDraft - Saves a new post draft locally.
//     onClear - Clears the new post form and saved draft.
//     onCancel - Closes the editor.
// Description: Renders the post creation and editing form, including tag and image selection.
// Author: Keith Sialana
export default function PostEditor({
  draft,
  onDraftChange,
  tags,
  tagsLoading,
  tagsError,
  selectedImages,
  onImagesChange,
  saving,
  savingDraft,
  draftSaved,
  formResetKey,
  isEditing,
  onSubmit,
  onSaveDraft,
  onClear,
  onCancel,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="post-editor"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-editor-title"
    >
      <h2 id="post-editor-title">{isEditing ? "Edit post" : "Create post"}</h2>
      {draft.tags.length > 0 && (
        <ul className="selected-tags" aria-label="Selected tags">
          {draft.tags.map((tag) => (
            <li className="tag-chip" key={tag}>
              {tag}
            </li>
          ))}
        </ul>
      )}
      <fieldset className="tag-picker form-field">
        <legend>Tag</legend>
        <details key={formResetKey}>
          <summary>
            {tagsLoading
              ? "Loading tags..."
              : draft.tags.length > 0
                ? `${draft.tags.length} selected`
                : "Select tags"}
          </summary>
          <div className="tag-picker-options">
            {tagsError ? (
              <p role="alert">{tagsError}</p>
            ) : tags.length > 0 ? (
              tags.map(({ tag_name: tagName }) => (
                <label key={tagName}>
                  <input
                    type="checkbox"
                    checked={draft.tags.includes(tagName)}
                    disabled={tagsLoading}
                    onChange={(event) => {
                      const nextTags = event.target.checked
                        ? [...draft.tags, tagName]
                        : draft.tags.filter((tag) => tag !== tagName);
                      onDraftChange({ ...draft, tags: nextTags });
                    }}
                  />
                  {tagName}
                </label>
              ))
            ) : (
              <p>No tags available.</p>
            )}
          </div>
        </details>
      </fieldset>
      <label className="form-field">
        Title
        <input
          type="text"
          value={draft.title}
          onChange={(event) =>
            onDraftChange({ ...draft, title: event.target.value })
          }
          required
        />
      </label>
      <label className="form-field">
        Content
        <textarea
          value={draft.content}
          onChange={(event) =>
            onDraftChange({ ...draft, content: event.target.value })
          }
          required
          rows={8}
        />
      </label>
      <label className="form-field image-upload-field">
        Images
        <input
          key={formResetKey}
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.some((file) => !file.type.startsWith("image/"))) {
              onImagesChange([], "Select image files only.");
              event.target.value = "";
              return;
            }
            onImagesChange(files, "");
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
            onDraftChange({ ...draft, hidden: event.target.checked })
          }
        />{" "}
        Hide from visitors
      </label>
      <div className="form-actions">
        {!isEditing && (
          <>
            <button
              type="button"
              className="clear-post-button"
              onClick={onClear}
              disabled={saving || savingDraft}
            >
              Clear
            </button>
            <button
              type="button"
              className="save-draft-button"
              onClick={onSaveDraft}
              disabled={saving || savingDraft}
            >
              {savingDraft ? "Saving draft..." : "Save draft"}
            </button>
          </>
        )}
        <button
          type="submit"
          className="save-post-button"
          disabled={saving || savingDraft}
        >
          {saving ? "Saving..." : "Publish post"}
        </button>
        <button
          type="button"
          className="cancel-post-button"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
      {draftSaved && (
        <p role="status">Draft saved on this device.</p>
      )}
    </form>
  );
}
