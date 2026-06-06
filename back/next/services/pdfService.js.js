const Tesseract = require("tesseract.js");

async function extractText(imagePath){

 const result =
 await Tesseract.recognize(
 imagePath,
 "eng"
 );

 return result.data.text;
}

module.exports = extractText;