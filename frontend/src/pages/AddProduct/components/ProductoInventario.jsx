export default function ProductoInventario({
  form,
  handleChange,
  categorias,
  ubicaciones,
}) {
  return (
    <>
      <div className="col-md-4 col-12">
        <label className="form-label">Categoría</label>
        <select
          className="form-select"
          name="categoria_id"
          value={form.categoria_id}
          onChange={handleChange}
          required
        >
          <option value="">Seleccionar</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="col-md-4 col-12">
        <label className="form-label">Ubicación</label>
        <select
          className="form-select"
          name="ubicacion_id"
          value={form.ubicacion_id}
          onChange={handleChange}
          required
        >
          <option value="">Seleccionar</option>
          {ubicaciones.map((ub) => (
            <option key={ub.id} value={ub.id}>
              {ub.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="col-md-4 col-12">
        <label className="form-label">Stock</label>
        <input
          type="number"
          className="form-control"
          name="stock"
          value={form.stock}
          min={0}
          onChange={handleChange}
          required
        />
      </div>

      <div className="col-md-4 col-12">
        <label className="form-label">Stock mínimo</label>
        <input
          type="number"
          className="form-control"
          name="stock_minimo"
          value={form.stock_minimo}
          min={1}
          onChange={handleChange}
          required
        />
      </div>
    </>
  );
}
