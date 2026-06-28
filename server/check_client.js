const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'c:/Users/MAXIMILIANO/Documents/proyecto_sw/logiDespacho/server/.env' });

async function main() {
  const db = await mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [c] = await db.query('SELECT * FROM clientes WHERE nombre = ?', ['AGROPECUARIA JURADO S.A.S']);
  console.log('Clientes:', c);
  
  process.exit(0);
}
main();
