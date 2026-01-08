export default function ProductoImagen({ handleImageChange, preview }) {
  return (
    <div className="col-md-6 col-12">
      <label className="form-label">Imagen</label>
      <input
        type="file"
        className="form-control"
        onChange={handleImageChange}
        accept="image/*"
      />

      {preview && (
        <div className="mt-2">
          <img
            src={preview}
            alt="preview"
            className="img-thumbnail"
            style={{ maxHeight: 140, maxWidth: "100%" }}
          />
        </div>
      )}
    </div>
  );
}
