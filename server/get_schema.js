require('dotenv').config();
const db = require('./db');

async function getSchema() {
  try {
    const [tables] = await db.query('SHOW TABLES');
    const tableKey = Object.keys(tables[0])[0];
    
    let schemaDef = "";
    for (let i = 0; i < tables.length; i++) {
      const tableName = tables[i][tableKey];
      schemaDef += `Table: ${tableName}\n`;
      const [columns] = await db.query(`DESCRIBE \`${tableName}\``);
      for (let j = 0; j < columns.length; j++) {
        schemaDef += `  - ${columns[j].Field} (${columns[j].Type})\n`;
      }
      schemaDef += "\n";
    }
    console.log(schemaDef);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
getSchema();
