export default function PostEditor({
  draft,
  onDraftChange,
  selectedImages,
  onImagesChange,
  saving,
  isEditing,
  onSubmit,
  onCancel,
}) {
  return (
    <form onSubmit={onSubmit} className="post-editor">
      <h2>{isEditing ? "Edit post" : "Create post"}</h2>
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
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
