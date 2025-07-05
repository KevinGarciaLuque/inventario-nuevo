import React from "react";
import Login from "./components/Login";
import Layout from "./components/Layout";
import { useUser } from "./context/UserContext"; // <--- usa tu hook
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/App.css"; // Asegúrate de tener tus estilos personalizados

export default function App() {
  const { user, loading, login, logout } = useUser();

  if (loading) {
    // Puedes poner un spinner o simplemente null
    return (
      <div className="d-flex min-vh-100 align-items-center justify-content-center">
        <div className="spinner-border text-warning" role="status"></div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100 d-flex flex-column">
      {!user ? (
        <Login onLogin={login} />
      ) : (
        <Layout user={user} onLogout={logout} />
      )}
    </div>
  );
}

