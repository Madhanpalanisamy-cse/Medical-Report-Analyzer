const fs = require("fs");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");

/**
 * Extracts text from an uploaded file based on its mime type
 * @param {Object} file - Multer file object
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromFile(file) {
  const filePath = file.path;

  if (file.mimetype === "application/pdf") {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  } else if (file.mimetype.startsWith("image/")) {
    const result = await Tesseract.recognize(filePath, "eng");
    return result.data.text;
  } else if (file.mimetype === "text/plain") {
    return fs.readFileSync(filePath, "utf-8");
  } else {
    throw new Error("Unsupported file format. Please upload a PDF, image, or text file.");
  }
}

/**
 * Calculates health score and risk level based on keywords in the text
 * @param {string} text - Report text
 * @returns {Object} { score, risk }
 */
function calculateHealthScore(text) {
  let score = 100;
  let risk = "Low";
  const lower = text.toLowerCase();

  if (lower.includes("diabetes") || lower.includes("diabetic") || lower.includes("hba1c")) {
    score -= 20;
  }
  if (lower.includes("cholesterol") || lower.includes("ldl") || lower.includes("triglycerides")) {
    score -= 15;
  }
  if (lower.includes("high blood pressure") || lower.includes("hypertension") || lower.includes("bp")) {
    score -= 15;
  }
  if (lower.includes("anaemia") || lower.includes("anemia") || lower.includes("low hemoglobin")) {
    score -= 10;
  }
  if (lower.includes("asthma") || lower.includes("bronchitis")) {
    score -= 10;
  }

  // Bound the score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  if (score < 70) risk = "Medium";
  if (score < 50) risk = "High";

  return { score, risk };
}

module.exports = {
  extractTextFromFile,
  calculateHealthScore
};
