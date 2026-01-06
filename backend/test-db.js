const db = require("./db");

(async () => {
  try {
    const [r] = await db.query("SELECT 1 AS ok");
    console.log("✅ Conectado:", r);
    process.exit(0);
  } catch (e) {
    console.error("❌ Error DB:", e.message);
    process.exit(1);
  }
})();
