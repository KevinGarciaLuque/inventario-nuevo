const db = require("./db");
const bcrypt = require("bcryptjs");

(async () => {
  try {
    const NUEVA = "123456";
    const hash = await bcrypt.hash(NUEVA, 10);

    // Resetea todos (excepto admin id=1 si quieres)
    const [r] = await db.query(
      "UPDATE usuarios SET password = ? WHERE id <> 1",
      [hash]
    );

    console.log("✅ Password reseteada para usuarios:", r.affectedRows);
    console.log("👉 Nueva contraseña para todos: ", NUEVA);
    process.exit(0);
  } catch (e) {
    console.error("❌ Error:", e.message);
    process.exit(1);
  }
})();
