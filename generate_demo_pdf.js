const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument();
const outPath = 'demo_report.pdf';
const stream = fs.createWriteStream(outPath);

doc.pipe(stream);

doc.fontSize(20).text('Medical Report – Demo', { align: 'center' });

doc.moveDown();

doc.fontSize(12).text('Patient: John Doe');

doc.text(`Date: ${new Date().toLocaleDateString()}`);

doc.moveDown();

doc.text('Findings:');
doc.list([
  'Blood glucose: 110 mg/dL (normal)',
  'LDL cholesterol: 130 mg/dL (borderline high)',
  'Blood pressure: 128/78 mmHg (pre‑hypertension)'
]);

doc.moveDown();

doc.text('Conclusion: No acute concerns, routine follow‑up recommended.');

doc.end();

stream.on('finish', () => {
  console.log('Demo PDF created at', outPath);
});
