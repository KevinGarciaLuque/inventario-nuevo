import { Button, Form, FormControl, InputGroup } from "react-bootstrap";
import { FaBroom, FaSearch } from "react-icons/fa";

export default function BuscadorProducto({
  productos,
  buscar,
  setBuscar,
  inputBuscarRef,
  buscarYAgregar,
  limpiarInputBuscar,
}) {
  return (
    <>
      <h5 className="mt-4">Buscar Producto</h5>

      <Form
        onSubmit={(e) => {
          e.preventDefault();
          buscarYAgregar();
        }}
      >
        <InputGroup className="mb-3">
          <InputGroup.Text>
            <FaSearch />
          </InputGroup.Text>

          <FormControl
            ref={inputBuscarRef}
            placeholder="Buscar producto por nombre o escanear código"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            list="sugerencias"
            enterKeyHint="search"
            inputMode="search"
            autoComplete="off"
          />

          <datalist id="sugerencias">
            {productos.map((p) => (
              <option key={p.id} value={p.nombre} />
            ))}
          </datalist>

          <Button variant="primary" type="submit">
            Agregar
          </Button>

          <Button variant="warning" type="button" onClick={limpiarInputBuscar}>
            <FaBroom />
          </Button>
        </InputGroup>
      </Form>
    </>
  );
}
