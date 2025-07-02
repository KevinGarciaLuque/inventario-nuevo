import React from "react";
import { Toast } from "react-bootstrap";

export default function ToastAlert({
  show,
  message,
  variant = "success",
  onClose,
}) {
  return (
    <Toast
      show={show}
      bg={variant}
      onClose={onClose}
      delay={2500}
      autohide
      className="position-fixed bottom-0 end-0 m-4"
      style={{ zIndex: 9999 }}
    >
      <Toast.Body className="text-white fw-bold">{message}</Toast.Body>
    </Toast>
  );
}
