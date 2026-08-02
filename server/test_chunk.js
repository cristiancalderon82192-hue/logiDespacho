const chunkText = `Continúa...

COPIA
% Dcto
CL 82 # 80 -15
8163500 Ext.(200) - 3113084593
COTIZACION-B4
Número:
Fecha:
 13976
Vencimiento:
Señores:
LONDOÑO RENSON DE JESUS
Nit:  901248396
Valor Und
Nit:
BARRIO SAN FELIPE
Asesor: KAREN LORENA HE
Valor Total% IvaCódigo
Tel . 3105035877   
ANTIOQUIA   COLOMBIA
Copia
71980645
Cantidad
B4 - CERAMICA 4
1-ago.-2026  10:24 a.m.
Página 2 de 2
Descripción
DEPÓSITO Y CERÁMICAS EL RODEO ZOMAC S.A.S
BodUndPeso
1-ago.-2026
Vlr Iva Inclu.
 5.00  41,596.64 19060074 423,225.04 9PEGACOR ULTRA GRIS X 25 KLS`;

const regexIvaCodigo = /\b(19|5|0)(?:\n)?([A-Z0-9]{4,8})(?:\n([A-Z0-9]{1,3}))?\b/g;
const codeMatches = [...chunkText.matchAll(regexIvaCodigo)];
const codeMatch = codeMatches.length > 0 ? codeMatches[codeMatches.length - 1] : null;
console.log(codeMatch ? codeMatch[0] : "null");
