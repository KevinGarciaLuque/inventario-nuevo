// db.js
const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});


// Prueba la conexión y muestra mensaje en consola
pool.getConnection()
  .then(conn => {
    console.log('✔️ Conexión a MySQL exitosa');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error de conexión a MySQL:', err);
  });

module.exports = pool;
