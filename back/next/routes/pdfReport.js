const express =
require("express");

const PDFDocument =
require("pdfkit");

const router =
express.Router();

router.post(
"/download",
(req,res)=>{

 const {
 score,
 risk,
 analysis
 } = req.body;

 const doc =
 new PDFDocument();

 res.setHeader(
 "Content-Type",
 "application/pdf"
 );

 res.setHeader(
 "Content-Disposition",
 "attachment; filename=report.pdf"
 );

 doc.pipe(res);

 doc.fontSize(24)
 .text(
 "Medical AI Report"
 );

 doc.moveDown();

 doc.text(
 "Health Score: " +
 score
 );

 doc.text(
 "Risk Level: " +
 risk
 );

 doc.moveDown();

 doc.text(
 analysis
 );

 doc.end();

});

module.exports =
router;