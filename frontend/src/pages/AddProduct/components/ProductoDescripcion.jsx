export default function ProductoDescripcion({ form, handleChange }) {
  return (
    <div className="col-md-8 col-12">
      <label className="form-label">Descripción</label>
      <textarea
        className="form-control"
        name="descripcion"
        rows={2}
        value={form.descripcion}
        onChange={handleChange}
      />
    </div>
  );
}
