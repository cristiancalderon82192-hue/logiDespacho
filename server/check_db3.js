require('dotenv').config({path: './.env'});
const pool = require('./db');
pool.query("SELECT p.id, d.bodega_id FROM bodega_pendientes p JOIN bodega_pendientes_detalle d ON p.id = d.pendiente_id WHERE p.factura_num = '894651'").then(r => {
  console.log(r[0]);
  process.exit();
});
