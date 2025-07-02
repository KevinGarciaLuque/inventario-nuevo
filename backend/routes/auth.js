const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query("SELECT * FROM usuarios WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }
    const user = rows[0];

    // Compatibilidad: contraseñas hasheadas (bcrypt) o "planas" para demo
    let match = false;
    if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
      match = await bcrypt.compare(password, user.password);
    } else {
      match = password === user.password;
    }

    if (!match) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    // JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      process.env.JWT_SECRET || "secreto_demo", // Cámbialo en producción
      { expiresIn: "2h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

module.exports = router;

