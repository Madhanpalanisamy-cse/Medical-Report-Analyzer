const fs = require("fs");
const pdf = require("pdf-parse");

async function extractPDF(file){

 const buffer =
 fs.readFileSync(file);

 const data =
 await pdf(buffer);

 return data.text;
}

module.exports = extractPDF;