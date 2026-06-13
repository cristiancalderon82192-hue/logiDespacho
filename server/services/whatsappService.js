const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

let client;
let qrCodeDataUrl = null;
let connectionStatus = 'DISCONNECTED'; // DISCONNECTED, QR_READY, CONNECTED, AUTHENTICATING

function initialize() {
    client = new Client({
        authStrategy: new LocalAuth({ clientId: "logidespacho-client" }),
        puppeteer: {
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process', // Crucial para reducir consumo de RAM
                '--disable-gpu'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        }
    });

    client.on('qr', async (qr) => {
        console.log('QR Code received for WhatsApp Web');
        connectionStatus = 'QR_READY';
        qrCodeDataUrl = await qrcode.toDataURL(qr);
    });

    client.on('ready', () => {
        console.log('✅ WhatsApp Web is ready!');
        connectionStatus = 'CONNECTED';
        qrCodeDataUrl = null;
    });

    client.on('authenticated', () => {
        console.log('WhatsApp Web authenticated!');
        connectionStatus = 'AUTHENTICATING';
    });

    client.on('auth_failure', msg => {
        console.error('WhatsApp Web auth failure', msg);
        connectionStatus = 'DISCONNECTED';
    });

    client.on('disconnected', (reason) => {
        console.log('WhatsApp Web disconnected', reason);
        connectionStatus = 'DISCONNECTED';
    });

    client.initialize().catch(err => {
        console.error("Error initializing WhatsApp Client:", err);
    });
}

function getStatus() {
    return {
        status: connectionStatus,
        qr: qrCodeDataUrl
    };
}

async function logout() {
    if (client) {
        try {
            await client.logout();
            connectionStatus = 'DISCONNECTED';
            qrCodeDataUrl = null;
            // Destruir el cliente y reiniciarlo
            await client.destroy();
            initialize();
            return { success: true };
        } catch (error) {
            console.error("Error during WhatsApp logout:", error);
            // Intento forzado de reinicio si falla el logout suave
            try {
                await client.destroy();
                initialize();
            } catch (e) {}
            return { success: false, error: error.message };
        }
    }
    return { success: false, error: "Client not initialized" };
}

async function sendMessage(to, message) {
    if (connectionStatus !== 'CONNECTED' || !client) {
        console.warn("⚠️ No se pudo enviar mensaje: WhatsApp no está conectado.");
        return false;
    }
    try {
        let formattedNumber = to.replace(/\D/g, ''); 
        
        // Asumimos prefijo +57 si el número tiene 10 dígitos
        if (formattedNumber.length === 10 && formattedNumber.startsWith('3')) {
            formattedNumber = '57' + formattedNumber;
        }

        const chatId = formattedNumber + "@c.us";
        await client.sendMessage(chatId, message);
        console.log(`✅ Mensaje de WhatsApp enviado exitosamente a ${formattedNumber}`);
        return true;
    } catch (error) {
        console.error("❌ Error enviando mensaje de WhatsApp:", error);
        return false;
    }
}

module.exports = {
    initialize,
    getStatus,
    logout,
    sendMessage
};
