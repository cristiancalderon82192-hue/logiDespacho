const chunkText = ` 29,327.73 19155955 174,499.99 5CONCOLOR SUPERBLANCOX5KL JUNTA ESTREC.`;
const regexIvaCodigo = /([\d\.,]+)\s+(19|5|0)(?:\n)?([A-Z0-9]{4,8})(?:\n([A-Z0-9]{1,3}))?(?=\s)/g;
const codeMatches = [...chunkText.matchAll(regexIvaCodigo)];
const codeMatch = codeMatches.length > 0 ? codeMatches[0] : null;
console.log(codeMatch ? codeMatch[0] : "null");
