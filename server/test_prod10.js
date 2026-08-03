const cp = require('./utils/cotizacionParser');

const pdfText = `Vlr Iva Inclu.
 5.00  41,596.64 19060074 423,225.04 9PEGACOR ULTRA GRIS X 25 KLS
B1 
Bul 225,00 47,025.00
 29,327.73 19155955 174,499.99 5CONCOLOR SUPERBLANCOX5KL JUNTA ESTREC.
B4 
Caja 25,00 34,900.00`;

console.log(cp.parseCotizacion(pdfText));
