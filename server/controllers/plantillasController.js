const db = require('../db');

exports.getPlantillas = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM plantillas_pdf ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener plantillas:', error);
    res.status(500).json({ error: 'Error al obtener plantillas' });
  }
};

exports.getPlantillaById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM plantillas_pdf WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Plantilla no encontrada' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener plantilla:', error);
    res.status(500).json({ error: 'Error al obtener plantilla' });
  }
};

exports.createPlantilla = async (req, res) => {
  try {
    const {
      nombre_empresa, keyword_identificador,
      regex_id_factura, regex_cliente, regex_nit_cliente, regex_telefono_cliente, regex_valor_factura,
      regex_lista_codigos, regex_lista_descripciones, regex_lista_cantidades, regex_lista_unidades,
      regex_lista_precios_unitarios, regex_lista_bodegas, regex_lista_pesos, regex_lista_precios_totales
    } = req.body;

    if (!nombre_empresa || !keyword_identificador) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const query = `
      INSERT INTO plantillas_pdf (
        nombre_empresa, keyword_identificador,
        regex_id_factura, regex_cliente, regex_nit_cliente, regex_telefono_cliente, regex_valor_factura,
        regex_lista_codigos, regex_lista_descripciones, regex_lista_cantidades, regex_lista_unidades,
        regex_lista_precios_unitarios, regex_lista_bodegas, regex_lista_pesos, regex_lista_precios_totales
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      nombre_empresa, keyword_identificador,
      regex_id_factura || null, regex_cliente || null, regex_nit_cliente || null, regex_telefono_cliente || null, regex_valor_factura || null,
      regex_lista_codigos || null, regex_lista_descripciones || null, regex_lista_cantidades || null, regex_lista_unidades || null,
      regex_lista_precios_unitarios || null, regex_lista_bodegas || null, regex_lista_pesos || null, regex_lista_precios_totales || null
    ];

    const [result] = await db.query(query, values);
    res.status(201).json({ id: result.insertId, message: 'Plantilla creada con éxito' });
  } catch (error) {
    console.error('Error al crear plantilla:', error);
    res.status(500).json({ error: 'Error al crear plantilla' });
  }
};

exports.updatePlantilla = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre_empresa, keyword_identificador,
      regex_id_factura, regex_cliente, regex_nit_cliente, regex_telefono_cliente, regex_valor_factura,
      regex_lista_codigos, regex_lista_descripciones, regex_lista_cantidades, regex_lista_unidades,
      regex_lista_precios_unitarios, regex_lista_bodegas, regex_lista_pesos, regex_lista_precios_totales
    } = req.body;

    const query = `
      UPDATE plantillas_pdf SET
        nombre_empresa = ?, keyword_identificador = ?,
        regex_id_factura = ?, regex_cliente = ?, regex_nit_cliente = ?, regex_telefono_cliente = ?, regex_valor_factura = ?,
        regex_lista_codigos = ?, regex_lista_descripciones = ?, regex_lista_cantidades = ?, regex_lista_unidades = ?,
        regex_lista_precios_unitarios = ?, regex_lista_bodegas = ?, regex_lista_pesos = ?, regex_lista_precios_totales = ?
      WHERE id = ?
    `;

    const values = [
      nombre_empresa, keyword_identificador,
      regex_id_factura || null, regex_cliente || null, regex_nit_cliente || null, regex_telefono_cliente || null, regex_valor_factura || null,
      regex_lista_codigos || null, regex_lista_descripciones || null, regex_lista_cantidades || null, regex_lista_unidades || null,
      regex_lista_precios_unitarios || null, regex_lista_bodegas || null, regex_lista_pesos || null, regex_lista_precios_totales || null,
      id
    ];

    const [result] = await db.query(query, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Plantilla no encontrada' });
    res.json({ message: 'Plantilla actualizada' });
  } catch (error) {
    console.error('Error al actualizar plantilla:', error);
    res.status(500).json({ error: 'Error al actualizar plantilla' });
  }
};

exports.deletePlantilla = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM plantillas_pdf WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Plantilla no encontrada' });
    res.json({ message: 'Plantilla eliminada' });
  } catch (error) {
    console.error('Error al eliminar plantilla:', error);
    res.status(500).json({ error: 'Error al eliminar plantilla' });
  }
};
