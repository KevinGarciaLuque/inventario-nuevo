export default function ProductoPrecio({ form, handleChange }) {
  return (
    <>
      <div className="col-md-4 col-12">
        <label className="form-label">
          Precio de costo <small className="text-muted">(uso interno)</small>
        </label>
        <input
          type="number"
          step="0.01"
          className="form-control"
          name="precio_costo"
          value={form.precio_costo ?? ""}
          onChange={handleChange}
          placeholder="Ej: 120.50"
        />
      </div>

      <div className="col-md-4 col-12">
        <label className="form-label">Precio de venta</label>
        <input
          type="number"
          step="0.01"
          className="form-control"
          name="precio"
          value={form.precio ?? ""}
          onChange={handleChange}
          required
        />
      </div>

      <div className="col-md-4 col-12">
        <label className="form-label">
          Descuento % <small className="text-muted">(opcional)</small>
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          className="form-control"
          name="descuento"
          value={form.descuento ?? ""}
          onChange={handleChange}
          placeholder="Ej: 10"
        />
        <small className="text-muted">Se aplicará al precio de venta.</small>
      </div>
    </>
  );
}
