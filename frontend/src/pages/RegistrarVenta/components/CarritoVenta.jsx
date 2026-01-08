import { Button, Image, Table, Badge } from "react-bootstrap";
import { FaTrash } from "react-icons/fa";
import { getImgSrc } from "../utils/ventaUtils";

const n2 = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function CarritoVenta({
  carrito,
  modificarCantidad,
  quitarProducto,
}) {
  return (
    <>
      <h4 className="mt-0 mb-4">Carrito de Venta</h4>

      <div
        className="mb-4"
        style={{
          maxHeight: "300px",
          height: "300px",
          overflowY: "auto",
          overflowX: "auto",
          border: "1px solid #dee2e6",
        }}
      >
        <Table
          striped
          bordered
          hover
          className="sticky-header"
          style={{ minWidth: "980px" }}
        >
          <thead className="table-light sticky-top">
            <tr>
              <th>Imagen</th>
              <th>Código</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Ubicación</th>
              <th>Descripción</th>
              <th className="text-end">Precio venta</th>
              <th className="text-center">Desc %</th>
              <th className="text-end">Precio Final</th>
              <th className="text-center">Cantidad</th>
              <th className="text-end">Subtotal</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {carrito.map((item) => {
              // ✅ Compatibilidad: usa tus campos del hook primero,
              // y si no existen, cae a los nombres antiguos.
              const precioBase = n2(item.precio_unitario ?? item.precio);
              const desc = Math.max(
                0,
                Math.min(100, n2(item.descuento_pct ?? item.descuento))
              );

              const precioFinal = n2(
                item.precio_final ?? precioBase * (1 - desc / 100)
              );

              const cant = Math.max(1, n2(item.cantidad));

              // ✅ Usa subtotal_linea si viene calculado desde el hook
              const sub = n2(item.subtotal_linea ?? precioFinal * cant);

              return (
                <tr key={item.id}>
                  <td>
                    <Image
                      src={getImgSrc(item.imagen)}
                      width={50}
                      height={50}
                      rounded
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  </td>

                  <td>{item.codigo || "-"}</td>
                  <td className="fw-semibold">{item.nombre}</td>
                  <td>{item.categoria || "-"}</td>
                  <td>{item.ubicacion || "-"}</td>
                  <td style={{ maxWidth: 220 }}>{item.descripcion || "-"}</td>

                  <td className="text-end">{precioBase.toFixed(2)} L</td>

                  <td className="text-center">
                    {desc > 0 ? (
                      <Badge bg="success">{desc.toFixed(2)}%</Badge>
                    ) : (
                      <span className="text-muted">0%</span>
                    )}
                  </td>

                  <td className="text-end">{precioFinal.toFixed(2)} L</td>

                  <td style={{ width: 120 }}>
                    <input
                      type="number"
                      min="1"
                      value={item.cantidad}
                      className="form-control form-control-sm"
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        modificarCantidad(
                          item.id,
                          Number.isFinite(val) ? val : 1
                        );
                      }}
                    />
                  </td>

                  <td className="text-end">{sub.toFixed(2)} L</td>

                  <td className="text-center" style={{ width: 60 }}>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => quitarProducto(item.id)}
                    >
                      <FaTrash />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </>
  );
}
