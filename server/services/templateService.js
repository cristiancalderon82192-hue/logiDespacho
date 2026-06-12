const fs = require('fs');
const path = require('path');

const TEMPLATE_FILE = path.join(__dirname, '../data/whatsapp_template.json');

// Crear carpeta si no existe
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const DEFAULT_TEMPLATE = "¡Hola, {{nombre}}! 👋\n\nTu pedido con número de guía *{{id_factura}}* ha sido marcado como *{{estado}}*.\n\nPuedes descargar y ver tu comprobante de entrega oficial haciendo clic en el siguiente enlace:\n{{link}}\n\n¡Gracias por preferir a LogiDespacho! 🚚";

function getTemplate() {
    try {
        if (fs.existsSync(TEMPLATE_FILE)) {
            const data = fs.readFileSync(TEMPLATE_FILE, 'utf8');
            const parsed = JSON.parse(data);
            return parsed.mensaje || DEFAULT_TEMPLATE;
        }
    } catch (err) {
        console.error("Error reading template file", err);
    }
    return DEFAULT_TEMPLATE;
}

function saveTemplate(mensaje) {
    try {
        fs.writeFileSync(TEMPLATE_FILE, JSON.stringify({ mensaje }), 'utf8');
        return true;
    } catch (err) {
        console.error("Error saving template file", err);
        return false;
    }
}

function formatMessage(template, data) {
    let text = template;
    for (const key in data) {
        // Regex para reemplazar todas las instancias de {{key}}
        const regex = new RegExp(`{{${key}}}`, 'g');
        text = text.replace(regex, data[key]);
    }
    return text;
}

module.exports = {
    getTemplate,
    saveTemplate,
    formatMessage
};
