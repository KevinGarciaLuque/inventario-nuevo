import {
  Button,
  FormCheck,
  FormControl,
  InputGroup,
  Spinner,
  Table,
} from "react-bootstrap";
import { FaUserPlus } from "react-icons/fa";

export default function ClientesSection({
  usarRTN,
  clientesLoading,
  clientesFiltrados,
  filtroCliente,
  setFiltroCliente,
  setModalCliente,
  venta,
  setVenta,
}) {
  if (!usarRTN) return null;

  return (
    <>
      <h5>Clientes</h5>

      <InputGroup className="mb-2">
        <FormControl
          placeholder="Buscar por nombre o RTN"
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
        />
        <Button
          variant="success"
          onClick={() => setModalCliente(true)}
          title="Agregar Cliente"
        >
          <FaUserPlus className="mb-1" /> Agregar Cliente
        </Button>
      </InputGroup>

      <div className="scroll-container" style={{ maxHeight: "150px" }}>
        {clientesLoading ? (
          <Spinner animation="border" size="sm" />
        ) : (
          <Table bordered hover size="sm" responsive className="w-100">
            <thead className="table-light">
              <tr>
                <th>Nombre</th>
                <th>RTN</th>
                <th>Dirección</th>
                <th>Activo</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((cliente) => (
                <tr
                  key={cliente.id}
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    setVenta({
                      ...venta,
                      cliente_nombre: cliente.nombre,
                      cliente_rtn: cliente.rtn,
                      cliente_direccion: cliente.direccion,
                    })
                  }
                  className={
                    venta.cliente_rtn === cliente.rtn ? "table-primary" : ""
                  }
                >
                  <td>{cliente.nombre}</td>
                  <td>{cliente.rtn}</td>
                  <td>{cliente.direccion}</td>
                  <td>
                    <FormCheck
                      type="switch"
                      checked={cliente.activo}
                      disabled
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <div className="row mt-3">
        <div className="col-md-4 mb-2">
          <FormControl
            placeholder="Nombre del Cliente"
            value={venta.cliente_nombre}
            onChange={(e) =>
              setVenta({ ...venta, cliente_nombre: e.target.value })
            }
          />
        </div>
        <div className="col-md-4 mb-2">
          <FormControl
            placeholder="RTN del Cliente"
            value={venta.cliente_rtn}
            onChange={(e) =>
              setVenta({ ...venta, cliente_rtn: e.target.value })
            }
          />
        </div>
        <div className="col-md-4 mb-2">
          <FormControl
            placeholder="Dirección del Cliente"
            value={venta.cliente_direccion}
            onChange={(e) =>
              setVenta({ ...venta, cliente_direccion: e.target.value })
            }
          />
        </div>
      </div>
    </>
  );
}
