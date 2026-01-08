import { Badge, Button, Form, Spinner, Table } from "react-bootstrap";

export default function UnidadesTabla({
  loading,
  unidades,
  guardando,
  abrirEditar,
  pedirEliminar,
  toggleActivo,
  badgeTipo,
}) {
  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2">
        <Spinner animation="border" size="sm" />
        <span className="text-muted">Cargando unidades…</span>
      </div>
    );
  }

  if (unidades.length === 0) {
    return <div className="text-muted">No hay unidades registradas.</div>;
  }

  return (
    <Table bordered hover responsive className="mb-0">
      <thead className="table-light">
        <tr>
          <th>Nombre</th>
          <th>Abrev.</th>
          <th>Tipo</th>
          <th className="text-center">Activo</th>
          <th style={{ width: 230 }}></th>
        </tr>
      </thead>
      <tbody>
        {unidades.map((u) => (
          <tr key={u.id}>
            <td className="fw-semibold">{u.nombre}</td>
            <td>{u.abreviatura}</td>
            <td>{badgeTipo(u.tipo)}</td>
            <td className="text-center">
              <Form.Check
                type="switch"
                checked={!!u.activo}
                disabled={guardando}
                onChange={() => toggleActivo(u)}
              />
            </td>
            <td className="d-flex gap-2">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => abrirEditar(u)}
                disabled={guardando}
              >
                Editar
              </Button>

              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => pedirEliminar(u)}
                disabled={guardando}
              >
                Eliminar
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
