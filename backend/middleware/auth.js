// backend/middleware/auth.js
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const secret = process.env.JWT_SECRET || "0ae7!bdA@Hgf#1x2ZLK";
    const decoded = jwt.verify(token, secret);

    // ✅ el token trae { id, email, rol }
    req.user = {
      id: decoded.id,
      email: decoded.email,
      rol: decoded.rol,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: "No autenticado" });
  }
};
