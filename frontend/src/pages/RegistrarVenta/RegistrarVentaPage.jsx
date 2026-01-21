// frontend/src/pages/RegistrarVenta/RegistrarVentaPage.jsx
import { Button, Spinner } from "react-bootstrap";
import { FaBoxOpen } from "react-icons/fa";
import { useUser } from "../../context/UserContext";
import useVenta from "./hooks/useVenta";

import VentasHeader from "./components/VentasHeader";
import ClientesSection from "./components/ClientesSection";
import BuscadorProducto from "./components/BuscadorProducto";
import CarritoVenta from "./components/CarritoVenta";
import TotalesVenta from "./components/TotalesVenta";
import ModalesVenta from "./components/ModalesVenta";

export default function RegistrarVentaPage({ onChangePage = () => {} }) {
  const { user } = useUser();
  const v = useVenta({ user });

  if (v.cajaLoading) {
    return (
      <div className="container py-4">
        <div className="alert alert-info d-flex align-items-center gap-2">
          <Spinner animation="border" size="sm" />
          Consultando estado de caja...
        </div>
      </div>
    );
  }

  if (!v.cajaAbierta) {
    return (
      <div className="container py-4">
        <h2 className="mb-4 text-center">
          <FaBoxOpen className="text-primary me-2" /> Módulo de Ventas
        </h2>

        <div className="card shadow-sm border-0">
          <div className="card-body">
            <h5 className="mb-2 text-danger fw-bold">⚠️ Caja no abierta</h5>
            <p className="text-muted mb-3">
              {v.msgCaja ||
                "Para registrar ventas, primero debes realizar la apertura de caja."}
            </p>

            {v.cajaInfo ? (
              <div className="small text-muted mb-3">
                Caja ID: <strong>{v.cajaInfo.id}</strong>
              </div>
            ) : null}

            <div className="d-flex flex-wrap gap-2">
              <Button
                variant="success"
                onClick={() => onChangePage("caja-apertura")}
              >
                Ir a Apertura de Caja
              </Button>

              <Button
                variant="outline-secondary"
                onClick={v.consultarCajaEstado}
              >
                Actualizar
              </Button>

              <Button
                variant="outline-primary"
                onClick={() => onChangePage("caja-historial")}
              >
                Ver historial
              </Button>
            </div>
          </div>
        </div>

        <ModalesVenta
          modal={v.modal}
          setModal={v.setModal}
          imprimirRecibo={v.imprimirRecibo}
          modalCliente={v.modalCliente}
          handleCerrarModalCliente={v.handleCerrarModalCliente}
          formularioCliente={v.formularioCliente}
          setFormularioCliente={v.setFormularioCliente}
          handleGuardarCliente={v.handleGuardarCliente}
          modalSinCai={v.modalSinCai}
          setModalSinCai={v.setModalSinCai}
          toast={v.toast}
          feedbackModal={v.feedbackModal}
          setFeedbackModal={v.setFeedbackModal}
        />
      </div>
    );
  }

  return (
    <div className="container py-4">
      <VentasHeader
        usarRTN={v.usarRTN}
        setUsarRTN={v.setUsarRTN}
        refreshCaiTrigger={v.refreshCaiTrigger}
      />

      <ClientesSection
        usarRTN={v.usarRTN}
        clientesLoading={v.clientesLoading}
        clientesFiltrados={v.clientesFiltrados}
        filtroCliente={v.filtroCliente}
        setFiltroCliente={v.setFiltroCliente}
        setModalCliente={v.setModalCliente}
        venta={v.venta}
        setVenta={v.setVenta}
        // ✅ si lo sigues usando en clientes, ok (no estorba)
        tipoCliente={v.tipoCliente}
        setTipoCliente={v.setTipoCliente}
        descuentos={v.descuentos}
        descuentosLoading={v.descuentosLoading}
        descuentoSeleccionadoId={v.descuentoSeleccionadoId}
        setDescuentoSeleccionadoId={v.setDescuentoSeleccionadoId}
      />

      <BuscadorProducto
        productos={v.productos}
        buscar={v.buscar}
        setBuscar={v.setBuscar}
        inputBuscarRef={v.inputBuscarRef}
        buscarYAgregar={v.buscarYAgregar}
        limpiarInputBuscar={v.limpiarInputBuscar}
      />

      <CarritoVenta
        carrito={v.carrito}
        modificarCantidad={v.modificarCantidad}
        quitarProducto={v.quitarProducto}
      />

      <TotalesVenta
        total={v.total}
        totalConDescCliente={v.totalConDescCliente}
        subtotal={v.subtotal}
        impuesto={v.impuesto}
        subtotalBruto={v.subtotalBruto}
        descuentoTotal={v.descuentoTotal}
        descuentoClienteMonto={v.descuentoClienteMonto}
        descuentoClienteNombre={v.descuentoClienteObj?.nombre || ""}
        // ✅ IMPORTANTES: para que el select aparezca en el cuadro negro
        tipoCliente={v.tipoCliente}
        setTipoCliente={v.setTipoCliente}
        descuentos={v.descuentos}
        descuentosLoading={v.descuentosLoading}
        descuentoSeleccionadoId={v.descuentoSeleccionadoId}
        setDescuentoSeleccionadoId={v.setDescuentoSeleccionadoId}
        handleCambio={v.handleCambio}
        resetPagoTrigger={v.resetPagoTrigger}
        registrarVenta={v.registrarVenta}
      />

      <ModalesVenta
        modal={v.modal}
        setModal={v.setModal}
        imprimirRecibo={v.imprimirRecibo}
        modalCliente={v.modalCliente}
        handleCerrarModalCliente={v.handleCerrarModalCliente}
        formularioCliente={v.formularioCliente}
        setFormularioCliente={v.setFormularioCliente}
        handleGuardarCliente={v.handleGuardarCliente}
        modalSinCai={v.modalSinCai}
        setModalSinCai={v.setModalSinCai}
        toast={v.toast}
        feedbackModal={v.feedbackModal}
        setFeedbackModal={v.setFeedbackModal}
      />
    </div>
  );
}
