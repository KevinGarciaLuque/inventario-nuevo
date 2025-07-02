const fs = require("fs");
const mysql = require("mysql2");

require("dotenv").config(); // Solo si usas variables de entorno

const connection = mysql.createConnection({
  host: "trolley.proxy.rlwy.net",
  port: 30629,
  user: "root",
  password: "CHEBwVnzywQGvscBFYdJEySXurgwERla",
  database: "railway",
  multipleStatements: true, // MUY IMPORTANTE
});

// Lee el archivo SQL (cambia el nombre si tu archivo no es dump.sql)
const sql = fs.readFileSync("./dump.sql", "utf8");

connection.query(sql, (err, results) => {
  if (err) {
    console.error("❌ Error ejecutando SQL:", err);
  } else {
    console.log("✅ ¡Importación completada!");
  }
  connection.end();
});
