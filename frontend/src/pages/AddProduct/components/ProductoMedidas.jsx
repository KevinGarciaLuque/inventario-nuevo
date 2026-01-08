export default function ProductoMedidas({
  form,
  handleChange,
  unidadesOrdenadas,
}) {
  return (
    <>
      <div className="col-md-4 col-12">
        <label className="form-label">Cantidad / Contenido</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className="form-control"
          name="contenido_medida"
          value={form.contenido_medida}
          onChange={handleChange}
          placeholder="Ej: 5, 2.5, 750"
        />
        <small className="text-muted">(Opcional)</small>
      </div>

      <div className="col-md-4 col-12">
        <label className="form-label">Unidad de medida</label>
        <select
          className="form-select"
          name="unidad_medida_id"
          value={form.unidad_medida_id}
          onChange={handleChange}
        >
          <option value="">Seleccionar (opcional)</option>
          {unidadesOrdenadas.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre} ({u.abreviatura}) — {u.tipo}
            </option>
          ))}
        </select>
        <small className="text-muted">
          Administrable desde “Unidades de Medida”.
        </small>
      </div>
    </>
  );
}
