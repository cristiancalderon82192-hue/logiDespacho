require('dotenv').config();
const db = require('./db');

const createTableQuery = `
CREATE TABLE IF NOT EXISTS plantillas_pdf (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_empresa VARCHAR(255) NOT NULL,
  keyword_identificador VARCHAR(255) NOT NULL,
  regex_id_factura TEXT,
  regex_cliente TEXT,
  regex_nit_cliente TEXT,
  regex_telefono_cliente TEXT,
  regex_valor_factura TEXT,
  regex_lista_codigos TEXT,
  regex_lista_descripciones TEXT,
  regex_lista_cantidades TEXT,
  regex_lista_unidades TEXT,
  regex_lista_precios_unitarios TEXT,
  regex_lista_bodegas TEXT,
  regex_lista_pesos TEXT,
  regex_lista_precios_totales TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

db.query(createTableQuery)
  .then(() => {
    console.log('Tabla plantillas_pdf creada exitosamente.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error creando la tabla:', err);
    process.exit(1);
  });
