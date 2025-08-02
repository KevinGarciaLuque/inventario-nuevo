import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import { Modal, Button, Form } from "react-bootstrap";
import { CheckCircleFill, XCircleFill } from "react-bootstrap-icons";

const API_URL = "http://localhost:3000"; // Cambia si usas .env

export default function EditProductModal({
  show,
  product,
  categorias,
  ubicaciones,
  onClose,
  onUpdated,
}) {
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    categoria_id: "",
    ubicacion_id: "",
    stock: 0,
    stock_minimo: 1,
    precio: "",
    imagen: "",
  });
  const [imagenFile, setImagenFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  // Estado de modales
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [successType, setSuccessType] = useState("success"); // o "danger"

  useEffect(() => {
    if (product) {
      setForm({
        codigo: product.codigo || "",
        nombre: product.nombre || "",
        descripcion: product.descripcion || "",
        categoria_id: product.categoria_id || "",
        ubicacion_id: product.ubicacion_id || "",
        stock: product.stock || 0,
        stock_minimo: product.stock_minimo || 1,
        precio: product.precio || "",
        imagen: product.imagen || "",
      });
      setPreview(
        product.imagen
          ? product.imagen.startsWith("http")
            ? product.imagen
            : product.imagen.startsWith("/uploads")
            ? API_URL + product.imagen
            : API_URL + "/uploads/" + product.imagen
          : null
      );
      setImagenFile(null);
    }
  }, [product]);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImagenFile(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let imageUrl = form.imagen;

    if (imagenFile) {
      const formData = new FormData();
      formData.append("imagen", imagenFile);
      try {
        const res = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        imageUrl = res.data.path || res.data.url || res.data.filename;
      } catch (err) {
        setSuccessType("danger");
        setSuccessMsg("Error al subir la imagen.");
        setShowSuccess(true);
        setLoading(false);
        return;
      }
    }

    try {
      await api.put(`/productos/${product.id}`, {
        ...form,
        imagen: imageUrl || null, // ✅ corregido aquí también
      });
      setSuccessType("success");
      setSuccessMsg("¡Producto actualizado correctamente!");
      setShowSuccess(true);
      onUpdated();
    } catch (error) {
      setSuccessType("danger");
      setSuccessMsg("Error al actualizar el producto.");
      setShowSuccess(true);
    }
    setLoading(false);
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    onClose();
  };

  return (
    <>
      {/* Modal principal */}
      <Modal show={show} onHide={onClose} centered size="lg" backdrop="static">
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>Editar Producto</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="row g-3">
              <div className="col-md-6 col-12">
                <Form.Label>Código</Form.Label>
                <Form.Control
                  name="codigo"
                  value={form.codigo}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col-md-6 col-12">
                <Form.Label>Nombre</Form.Label>
                <Form.Control
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col-md-6 col-12">
                <Form.Label>Categoría</Form.Label>
                <Form.Select
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
                </Form.Select>
              </div>
              <div className="col-md-6 col-12">
                <Form.Label>Ubicación</Form.Label>
                <Form.Select
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
                </Form.Select>
              </div>
              <div className="col-md-4 col-12">
                <Form.Label>Stock</Form.Label>
                <Form.Control
                  type="number"
                  name="stock"
                  value={form.stock}
                  min={0}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col-md-4 col-12">
                <Form.Label>Stock mínimo</Form.Label>
                <Form.Control
                  type="number"
                  name="stock_minimo"
                  value={form.stock_minimo}
                  min={1}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col-md-4 col-12">
                <Form.Label>Precio</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="precio"
                  value={form.precio}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col-12">
                <Form.Label>Descripción</Form.Label>
                <Form.Control
                  as="textarea"
                  name="descripcion"
                  rows={2}
                  value={form.descripcion}
                  onChange={handleChange}
                />
              </div>
              <div className="col-12 col-sm-6">
                <Form.Label>Imagen</Form.Label>
                <Form.Control
                  type="file"
                  onChange={handleImageChange}
                  accept="image/*"
                />
                {preview && (
                  <div className="mt-2">
                    <img
                      src={preview}
                      alt="preview"
                      className="img-thumbnail"
                      style={{ maxHeight: 90, maxWidth: "100%" }}
                    />
                  </div>
                )}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="d-flex flex-column flex-sm-row gap-2">
            <Button
              variant="outline-secondary"
              onClick={onClose}
              disabled={loading}
              className="w-40 w-sm-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={loading}
              className="w-40 w-sm-auto"
            >
              {loading ? "Guardando..." : "Guardar Cambios"}
             
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal de éxito/error */}
      <Modal
        show={showSuccess}
        onHide={handleCloseSuccess}
        centered
        backdrop="static"
      >
        <Modal.Body className="text-center py-4">
          {successType === "success" ? (
            <CheckCircleFill size={65} color="#198754" className="mb-3" />
          ) : (
            <XCircleFill size={65} color="#dc3545" className="mb-3" />
          )}
          <h4
            className={`mb-3 fw-bold ${
              successType === "success" ? "text-success" : "text-danger"
            }`}
          >
            {successMsg}
          </h4>
          <Button
            variant={successType === "success" ? "success" : "danger"}
            size="lg"
            className="px-4"
            onClick={handleCloseSuccess}
          >
            Cerrar
          </Button>
        </Modal.Body>
      </Modal>
    </>
  );
}
