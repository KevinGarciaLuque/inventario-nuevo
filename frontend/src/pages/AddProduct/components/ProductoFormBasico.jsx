export default function ProductoFormBasico({ form, handleChange }) {
  return (
    <>
      <div className="col-md-4 col-12">
        <label className="form-label">Código</label>
        <input
          className="form-control"
          name="codigo"
          value={form.codigo}
          onChange={handleChange}
          required
        />
      </div>

      <div className="col-md-4 col-12">
        <label className="form-label">Nombre</label>
        <input
          className="form-control"
          name="nombre"
          value={form.nombre}
          onChange={handleChange}
          required
        />
      </div>

      <div className="col-md-4 col-12">
        <label className="form-label">Lote</label>
        <input
          className="form-control"
          name="lote"
          value={form.lote}
          onChange={handleChange}
          placeholder="Ej: LOTE-2025-001"
        />
      </div>

      <div className="col-md-4 col-12">
        <label className="form-label">Fecha de vencimiento</label>
        <input
          type="date"
          className="form-control"
          name="fecha_vencimiento"
          value={form.fecha_vencimiento}
          onChange={handleChange}
        />
        <small className="text-muted">(Opcional)</small>
      </div>
    </>
  );
}
