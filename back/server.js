require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");

const db = require("./db");
const { extractTextFromFile, calculateHealthScore } = require("./services/analysis");

// In-memory OTP registry mapping: email -> { otp, expiresAt }
const otpStore = new Map();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecretmedicalkey";

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../front"), { index: false }));

// Multer Storage Configuration - Using Memory Storage for Serverless environments
const storage = multer.memoryStorage();
const upload = multer({ storage });

// JWT Verification Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    req.user = { id: 1, name: "Guest" }; // Fallback to Guest
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = { id: 1, name: "Guest" }; // Fallback to Guest
      return next();
    }
    req.user = user;
    next();
  });
};

// ==================== AUTHENTICATION ROUTES ====================

// Send Verification OTP API
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ success: false, message: "A valid email address is required." });
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // Code expires in 5 minutes
    otpStore.set(email, { otp, expiresAt });

    console.log(`\n==================================================`);
    console.log(`🔑 [OTP SYSTEM] Generated Verification Code for ${email}: ${otp}`);
    console.log(`==================================================\n`);

    let emailSent = false;
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_PORT === "465",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || '"MedAI Vision" <noreply@medaivision.com>',
          to: email,
          subject: "MedAI Vision - Account Verification OTP",
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; max-width: 600px; background-color: #0b111e; color: #f8fafc; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;">
              <h2 style="color: #00e5ff; font-family: sans-serif; margin-bottom: 8px;">🩺 MedAI Vision</h2>
              <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">Your secure clinical intelligence portal registration code.</p>
              <div style="padding: 16px; background-color: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 28px; font-weight: 700; color: #00e5ff; letter-spacing: 6px; font-family: monospace;">${otp}</span>
              </div>
              <p style="color: #94a3b8; font-size: 12px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px;">This OTP is valid for 5 minutes. If you did not make this registration request, you can safely ignore this mail.</p>
            </div>
          `
        });
        emailSent = true;
      } catch (mailErr) {
        console.error("Nodemailer OTP sending failed:", mailErr.message);
      }
    }

    const devMode = process.env.DEV_MODE === "true";
    res.json({
      success: true,
      message: emailSent ? "Verification OTP emailed successfully." : "OTP dispatched to server console.",
      // In developer mode, we return the OTP back in the response body for ease of testing
      otp: devMode ? otp : undefined
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// User Registration with OTP verification
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;
    if (!name || !email || !password || !otp) {
      return res.status(400).json({ success: false, message: "Please complete all fields, including the OTP." });
    }

    // Retrieve OTP from temporary registry
    const record = otpStore.get(email);
    if (!record) {
      return res.status(400).json({ success: false, message: "No verification OTP requested for this email." });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ success: false, message: "Your verification OTP has expired. Please send a new code." });
    }

    if (record.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: "Incorrect OTP. Verification failed." });
    }

    // Clean up OTP store upon success
    otpStore.delete(email);

    const hash = await bcrypt.hash(password, 10);
    
    db.query(
      "INSERT INTO users(name,email,password) VALUES(?,?,?)",
      [name, email, hash],
      (err, result) => {
        if (err) {
          return res.status(400).json({ success: false, message: err.message || "Registration failed." });
        }
        
        const userId = result.insertId;
        const token = jwt.sign({ id: userId, email, name }, JWT_SECRET);
        
        res.json({
          success: true,
          message: "User Registered Successfully",
          token,
          user: { id: userId, name, email }
        });
      }
    );
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Please fill in all details." });
  }

  db.query(
    "SELECT * FROM users WHERE email=?",
    [email],
    async (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (!result || result.length === 0) {
        return res.status(404).json({ success: false, message: "User not found." });
      }

      const user = result[0];
      const valid = await bcrypt.compare(password, user.password);
      
      if (!valid) {
        return res.status(401).json({ success: false, message: "Incorrect password." });
      }

      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET);
      res.json({
        success: true,
        token,
        user: { id: user.id, name: user.name, email: user.email }
      });
    }
  );
});

// ==================== REPORT UPLOAD & ANALYSIS ====================

app.post("/api/report/upload", authenticateToken, upload.single("report"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    console.log(`Processing file: ${req.file.originalname} (${req.file.mimetype})`);
    
    // 1. Extract Text
    const text = await extractTextFromFile(req.file);
    
    // 2. Calculate Health Score
    const { score, risk } = calculateHealthScore(text);
    
    // 3. Generate AI Detailed Analysis (Gemini API with fallback)
    let analysis = "";
    
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `You are a professional Medical AI assistant. Analyze the text extracted from a patient's medical report. 
Provide a clear, patient-friendly summary.
1. Highlight critical findings.
2. Explain any complex medical terminology.
3. List areas of concern.
4. Recommend general next steps (advise them to consult their physician).
Keep the format clean and easy to read using markdown bullet points.

Report Text:
${text}`;
        
        const result = await model.generateContent(prompt);
        analysis = result.response.text();
      } catch (geminiErr) {
        console.error("Gemini API Error:", geminiErr.message);
        analysis = generateMockAnalysis(text, score, risk);
      }
      // If Gemini returned empty result, fall back to mock analysis
      if (!analysis || typeof analysis !== "string" || analysis.trim() === "") {
        analysis = generateMockAnalysis(text, score, risk);
      }
    } else {
      analysis = generateMockAnalysis(text, score, risk);
    }

    // Clean up uploaded file if disk storage was used
    try {
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
    } catch (fsErr) {
      console.warn("Could not delete temporary file:", fsErr.message);
    }

    // 4. Save to Database
    db.query(
      "INSERT INTO reports (user_id, report_name, extracted_text) VALUES (?, ?, ?)",
      [req.user.id, req.file.originalname, text],
      (reportsDbErr, reportsResult) => {
        if (reportsDbErr) {
          console.error("Database Reports Save Error:", reportsDbErr.message);
          // Return analysis results anyway
          return res.json({
            success: true,
            id: Date.now(),
            reportName: req.file.originalname,
            healthScore: score,
            riskLevel: risk,
            analysis,
            pdfUrl: `/api/pdf/download?score=${score}&risk=${risk}&analysis=${encodeURIComponent(analysis)}&reportName=${encodeURIComponent(req.file.originalname)}`
          });
        }

        const reportId = reportsResult.insertId;

        db.query(
          "INSERT INTO report_history (user_id, report_id, report_name, health_score, risk_level, analysis) VALUES (?, ?, ?, ?, ?, ?)",
          [req.user.id, reportId, req.file.originalname, score, risk, analysis],
          (dbErr, result) => {
            if (dbErr) {
              console.error("Database Save Error:", dbErr.message);
              // Return analysis results anyway
              return res.json({
                success: true,
                id: Date.now(),
                reportName: req.file.originalname,
                healthScore: score,
                riskLevel: risk,
                analysis,
                pdfUrl: `/api/pdf/download?score=${score}&risk=${risk}&analysis=${encodeURIComponent(analysis)}&reportName=${encodeURIComponent(req.file.originalname)}`
              });
            }

            res.json({
              success: true,
              id: result.insertId,
              reportName: req.file.originalname,
              healthScore: score,
              riskLevel: risk,
              analysis,
              pdfUrl: `/api/pdf/download?score=${score}&risk=${risk}&analysis=${encodeURIComponent(analysis)}&reportName=${encodeURIComponent(req.file.originalname)}`
            });
          }
        );
      }
    );

  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Helper to generate a structured fallback analysis when Gemini is unavailable
function generateMockAnalysis(text, score, risk) {
  const lower = text.toLowerCase();
  let findings = [];
  
  if (lower.includes("diabetes") || lower.includes("diabetic") || lower.includes("hba1c")) {
    findings.push("Elevated Blood Glucose / HbA1c indicators suggest active diabetic markers.");
  }
  if (lower.includes("cholesterol") || lower.includes("ldl") || lower.includes("triglycerides")) {
    findings.push("Lipid panel indicators suggest high cholesterol levels (LDL or Triglycerides).");
  }
  if (lower.includes("high blood pressure") || lower.includes("hypertension") || lower.includes("bp")) {
    findings.push("Elevated systolic or diastolic readings indicating high blood pressure.");
  }
  if (lower.includes("anemia") || lower.includes("anaemia") || lower.includes("hemoglobin")) {
    findings.push("Low hemoglobin markers indicating potential anemia.");
  }
  
  if (findings.length === 0) {
    findings.push("No major clinical marker patterns detected in this initial text sweep.");
  }
  
  return `### Medical Report Summary (Local Analysis)

*Note: Please add a valid **GEMINI_API_KEY** in your backend config to activate advanced clinical explanations.*

#### 🔍 Detected Findings:
${findings.map(f => `- **${f.split(' ')[0]}**: ${f}`).join("\n")}

#### ⚠️ Risk Level & Score:
- **Health Score**: ${score}/100
- **Risk Category**: ${risk}

#### 📋 Recommendations:
- Schedule a comprehensive review with a primary care practitioner.
- Refrain from adjusting any medications without consulting a licensed physician.
- Focus on low-sodium and balanced diet adjustments.`;
}

// ==================== CONSULTATION CHAT ====================

app.post("/api/chat", authenticateToken, async (req, res) => {
  try {
    const { message, reportContext } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: "Empty message." });
    }

    let answer = "";
    
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        let systemPrompt = "You are a professional, helpful, and empathetic Medical AI assistant. You can clarify questions regarding health reports, medical vocabulary, and standard clinical procedures. Advise users that your answers are educational and they should always consult a physician for diagnoses.";
        if (reportContext) {
          systemPrompt += `\nHere is the patient's current report context to help you tailor your response: ${reportContext}`;
        }
        
        const prompt = `${systemPrompt}\n\nPatient Question: ${message}`;
        const result = await model.generateContent(prompt);
        answer = result.response.text();
      } catch (geminiErr) {
        console.error("Gemini Chat API Error:", geminiErr.message);
        answer = generateMockChatResponse(message);
      }
    } else {
      answer = generateMockChatResponse(message);
    }

    // Save to Database
    db.query(
      "INSERT INTO chat_history (user_id, question, answer) VALUES (?, ?, ?)",
      [req.user.id, message, answer],
      (dbErr) => {
        if (dbErr) console.error("Database Chat Save Error:", dbErr.message);
        res.json({ success: true, response: answer });
      }
    );

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

function generateMockChatResponse(message) {
  const lower = message.toLowerCase();
  
  if (lower.includes("diabetes") || lower.includes("hba1c") || lower.includes("sugar")) {
    return "Diabetes is a metabolic condition characterized by high blood glucose. The HbA1c test measures average blood sugar over the past 3 months. Normal range is typically below 5.7%. Values above 6.5% indicate diabetes. You should consult an endocrinologist for a precise care plan.";
  }
  if (lower.includes("cholesterol") || lower.includes("ldl") || lower.includes("lipid")) {
    return "Cholesterol is a waxy substance found in blood. High LDL ('bad' cholesterol) can build up in arterial walls and increase heart risks, while HDL ('good' cholesterol) helps clear it. Typical lifestyle recommendations involve reducing saturated fats and exercising. Please discuss target levels with your physician.";
  }
  if (lower.includes("bp") || lower.includes("blood pressure") || lower.includes("hypertension")) {
    return "Blood pressure represents the force of blood against artery walls. Normal is under 120/80 mmHg. Hypertension (high blood pressure) is diagnosed when readings consistently exceed 130/80. High readings should be monitored regularly under medical advice.";
  }

  return "Thank you for asking! I'm currently running in Demo Mode since no GEMINI_API_KEY is configured. Standard medical reports list markers like blood cell counts (CBC), glucose levels, lipid panels, and kidney/liver indicators. Please consult a licensed professional for any specific symptoms or report values.";
}

// ==================== REPORT HISTORY ====================

app.get("/api/history", authenticateToken, (req, res) => {
  db.query(
    "SELECT * FROM report_history WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json(result || []);
    }
  );
});

// ==================== PDF REPORT GENERATOR ====================

// Existing POST endpoint remains unchanged
app.post("/api/pdf/download", (req, res) => {
  try {
    const { score, risk, analysis, reportName } = req.body;

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Medical_AI_Report_${Date.now()}.pdf"`);
    
    doc.pipe(res);

    // Header Design
    doc.rect(0, 0, doc.page.width, 120).fill("#0f172a");
    doc.fillColor("#00e5ff").fontSize(24).font("Helvetica-Bold").text("MedAI Vision", 50, 40);
    doc.fillColor("#ffffff").fontSize(10).font("Helvetica").text("Automated Health Assessment Report", 50, 70);
    doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, 50, 85);

    doc.moveDown(5);

    // Section: Meta
    doc.fillColor("#1e293b").fontSize(12).font("Helvetica-Bold").text("Document Name:", 50, 150);
    doc.font("Helvetica").text(reportName || "N/A", 160, 150);

    // Health Score Counter Block
    doc.rect(50, 180, 240, 70).fill("#f1f5f9");
    doc.fillColor("#0284c7").fontSize(14).font("Helvetica-Bold").text("Health Score", 70, 195);
    doc.fontSize(22).font("Helvetica-Bold").text(`${score}/100`, 70, 215);

    // Risk Level Block
    let riskColor = "#22c55e"; // Low
    if (risk === "Medium") riskColor = "#ea580c";
    if (risk === "High") riskColor = "#dc2626";

    doc.rect(310, 180, 240, 70).fill("#f1f5f9");
    doc.fillColor(riskColor).fontSize(14).font("Helvetica-Bold").text("Risk Category", 330, 195);
    doc.fontSize(22).text(risk || "Low", 330, 215);

    doc.moveDown(6);

    // Section: Detailed Analysis
    doc.fillColor("#0f172a").fontSize(16).font("Helvetica-Bold").text("AI Medical Report Interpretation", 50, 280);
    doc.moveTo(50, 300).lineTo(550, 300).stroke("#cbd5e1");
    
    doc.moveDown(2);

    // Strip out markdown bold tags if any for pdfkit output
    const cleanAnalysis = (analysis || "")
      .replace(/\*\*/g, "")
      .replace(/###/g, "")
      .replace(/####/g, "")
      .replace(/\*/g, "•");

    doc.fillColor("#334155").fontSize(10).font("Helvetica").text(cleanAnalysis, 50, 320, {
      width: 500,
      lineGap: 4
    });

    // Footer
    const pageCount = doc.bufferedPageRange().count;
    doc.fontSize(8).fillColor("#94a3b8").text(
      "Disclaimer: This report is generated by an artificial intelligence assistant for educational purposes only. It does not replace professional clinical advice or a medical diagnosis.",
      50,
      doc.page.height - 70,
      { width: 500, align: "center" }
    );

    doc.end();

  } catch (err) {
    console.error("PDF Generation Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// NEW: GET endpoint for simple PDF download testing
app.get("/api/pdf/download", (req, res) => {
  const { score = 0, risk = "Low", analysis = "", reportName = "report.pdf" } = req.query;
  try {
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${reportName}"`);
    doc.pipe(res);
    // Header
    doc.rect(0, 0, doc.page.width, 120).fill("#0f172a");
    doc.fillColor("#00e5ff").fontSize(24).font("Helvetica-Bold").text("MedAI Vision", 50, 40);
    doc.fillColor("#ffffff").fontSize(10).font("Helvetica").text("Automated Health Assessment Report", 50, 70);
    doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, 50, 85);
    doc.moveDown(5);
    // Score
    doc.rect(50, 180, 240, 70).fill("#f1f5f9");
    doc.fillColor("#0284c7").fontSize(14).font("Helvetica-Bold").text("Health Score", 70, 195);
    doc.fontSize(22).font("Helvetica-Bold").text(`${score}/100`, 70, 215);
    // Risk
    let riskColor = "#22c55e";
    if (risk === "Medium") riskColor = "#ea580c";
    if (risk === "High") riskColor = "#dc2626";
    doc.rect(310, 180, 240, 70).fill("#f1f5f9");
    doc.fillColor(riskColor).fontSize(14).font("Helvetica-Bold").text("Risk Category", 330, 195);
    doc.fontSize(22).text(risk, 330, 215);
    doc.moveDown(6);
    // Analysis
    const cleanAnalysis = (analysis || "")
      .replace(/\*\*/g, "")
      .replace(/###/g, "")
      .replace(/####/g, "")
      .replace(/\*/g, "•");
    doc.fillColor("#334155").fontSize(10).font("Helvetica").text(cleanAnalysis, 50, 320, { width: 500, lineGap: 4 });
    doc.end();
  } catch (err) {
    console.error("PDF Generation Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});
// Simple health check endpoint
app.get('/api/ping', (req, res) => {
  res.json({ success: true, message: 'pong' });
});

// Single Page App Serve
// Serve SPA for non‑API routes
// Fallback handler for SPA (serve index.html for any non-API route)
app.use((req, res) => {
  // If the request starts with /api, let Express handle 404 normally
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  res.sendFile(path.join(__dirname, "../front/index.html"));
});



// Start Server locally or on Render (not on Vercel Serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 MedAI Vision Server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless function
module.exports = app;

// Disable Vercel's default body parser so Multer can read the raw binary stream
module.exports.config = {
  api: {
    bodyParser: false,
  },
};