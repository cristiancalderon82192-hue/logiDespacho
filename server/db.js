// UBICACIÓN: server/db.js
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root', 
  database: 'logistica_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Exportamos con .promise() para poder usar async/await cómodamente
module.exports = pool.promise();