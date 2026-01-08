export default function ProductoSubmit({ loading }) {
  return (
    <div className="col-md-6 col-12 d-flex align-items-end">
      <button
        type="submit"
        className="btn btn-warning w-100"
        disabled={loading}
      >
        {loading ? "Guardando..." : "Guardar Producto"}
      </button>
    </div>
  );
}
