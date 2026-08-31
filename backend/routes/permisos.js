// backend/routes/permisos.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const auth = require("../middleware/auth");
const {
  MODULOS,
  MODULO_KEYS,
  ROLES_CONFIGURABLES,
  permisosPorDefecto,
} = require("../permisos_modulos");

/* =====================================================
   Helpers reutilizables
===================================================== */

// Devuelve un objeto { modulo: bool } efectivo para un rol
async function getPermisosRol(rol) {
  if (rol === "superadmin") {
    return Object.fromEntries(MODULO_KEYS.map((k) => [k, true]));
  }

  const base = permisosPorDefecto(rol);

  try {
    const [rows] = await db.query(
      "SELECT modulo, permitido FROM permisos_rol WHERE rol = ?",
      [rol]
    );
    for (const r of rows) {
      if (MODULO_KEYS.includes(r.modulo)) {
        base[r.modulo] = !!r.permitido;
      }
    }
  } catch (e) {
    console.error("getPermisosRol:", e.message);
  }

  return base;
}

// ¿El rol puede acceder a un módulo?
async function rolPuede(rol, modulo) {
  if (rol === "superadmin") return true;
  const permisos = await getPermisosRol(rol);
  return !!permisos[modulo];
}

// Middleware factory: exige permiso sobre un módulo
function requierePermiso(modulo) {
  return async (req, res, next) => {
    try {
      const rol = req.user?.rol;
      if (await rolPuede(rol, modulo)) return next();
      return res.status(403).json({ message: "No autorizado para este módulo" });
    } catch (e) {
      return res.status(500).json({ message: "Error verificando permisos" });
    }
  };
}

function soloSuperadmin(req, res, next) {
  if (req.user?.rol !== "superadmin") {
    return res.status(403).json({ message: "Solo el superadministrador" });
  }
  next();
}

/* =====================================================
   RUTAS
===================================================== */

// Módulos permitidos para el usuario logueado (usado por el frontend)
router.get("/me", auth, async (req, res) => {
  try {
    const rol = req.user?.rol;
    const permisos = await getPermisosRol(rol);
    const modulos = Object.keys(permisos).filter((k) => permisos[k]);
    return res.json({ rol, modulos });
  } catch (e) {
    console.error("GET /permisos/me:", e);
    return res.status(500).json({ message: "Error al obtener permisos" });
  }
});

// Matriz completa (solo superadmin) -> para el módulo de Permisos
router.get("/", auth, soloSuperadmin, async (req, res) => {
  try {
    const matriz = {};
    for (const rol of ROLES_CONFIGURABLES) {
      matriz[rol] = await getPermisosRol(rol);
    }
    return res.json({ modulos: MODULOS, roles: ROLES_CONFIGURABLES, matriz });
  } catch (e) {
    console.error("GET /permisos:", e);
    return res.status(500).json({ message: "Error al obtener permisos" });
  }
});

// Actualizar permisos de un rol (solo superadmin)
router.put("/:rol", auth, soloSuperadmin, async (req, res) => {
  try {
    const { rol } = req.params;
    const { modulos } = req.body || {};

    if (!ROLES_CONFIGURABLES.includes(rol)) {
      return res.status(400).json({ message: "Rol no configurable" });
    }
    if (!modulos || typeof modulos !== "object") {
      return res.status(400).json({ message: "Datos inválidos" });
    }

    const entradas = Object.entries(modulos).filter(([k]) =>
      MODULO_KEYS.includes(k)
    );

    for (const [modulo, permitido] of entradas) {
      await db.query(
        `INSERT INTO permisos_rol (rol, modulo, permitido)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE permitido = VALUES(permitido)`,
        [rol, modulo, permitido ? 1 : 0]
      );
    }

    return res.json({ message: "Permisos actualizados" });
  } catch (e) {
    console.error("PUT /permisos/:rol:", e);
    return res.status(500).json({ message: "Error al actualizar permisos" });
  }
});

module.exports = router;
module.exports.getPermisosRol = getPermisosRol;
module.exports.rolPuede = rolPuede;
module.exports.requierePermiso = requierePermiso;
