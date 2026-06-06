<<<<<<< HEAD
# MedAI Vision - Advanced Full-Stack AI Medical Report Analyzer

MedAI Vision is a state-of-the-art medical report intelligence dashboard built with Node.js, Express.js, MySQL, Google Gemini AI API, Tesseract OCR, and pdf-parse. It features a premium, responsive Glassmorphism design complete with interactive background particles, floating clinical icons, animated gradient borders, 3D card tilt rotation effects, and dynamic light/dark theme toggles.

---

## 🚀 Key Features

* **User Authentication with OTP**: Secure JWT-based identity sign-up and log-in. OTP codes are generated on the server and sent via SMTP (falls back to terminal console logs in `DEV_MODE`).
* **Medical Report Parsing**: Upload scanned images (PNG, JPG) or PDF files. The backend automatically extracts text using Tesseract.js OCR or pdf-parse.
* **Clinical Health Calculations**: Scans clinical markers to compute a **Health Score (0-100)** and assign a **Risk Level (Low, Medium, High)**.
* **AI-Generated Recommendations**: Leverages Google Gemini AI to translate complex lab results and medical jargon into patient-friendly, structured guidance.
* **Interactive AI Consultation Chatbot**: Contextually consult with a medical chatbot regarding findings from your uploaded reports.
* **Health Score Trend graph**: Visualizes health scores over time across multiple medical files.
* **Downloadable PDF Reports**: Instantly compile and export clean summaries containing health grades, risk parameters, and AI guidance using PDFKit.
* **High-Performance Database Fallback**: Auto-detects local MySQL database connectivity. If missing, the app triggers a seamless in-memory mock database fallback, making local exploration and testing immediate.

---

## 🛠️ Technology Stack

* **Frontend**: Vanilla HTML5, CSS3, ES6 JavaScript, HTML5 Canvas, marked.js
* **Backend**: Node.js, Express.js, Multer
* **Database**: MySQL, mysql2
* **Artificial Intelligence**: Google Generative AI SDK (Gemini 1.5 Flash)
* **OCR & PDF Extraction**: Tesseract.js, pdf-parse
* **Verification & Utility**: nodemailer, jsonwebtoken, bcrypt, PDFKit

---

## 📂 Project Directory Structure

```
medical-ai-project/
├── back/
│   ├── services/
│   │   └── analysis.js       # File text parsing (OCR/PDF) & health calculations
│   ├── uploads/              # Temporary directory for file uploads
│   ├── db.js                 # Database configuration with local mock fallback
│   ├── server.js             # Primary server bootstrap and API route handlers
│   └── middlewar.js          # Standalone verification token middleware (optional)
├── front/
│   ├── index.html            # Main UI HTML structures
│   ├── style.css             # Premium glassmorphic styles, transitions & animation keyframes
│   └── app.js                # Core JS router, canvas animations, 3D card tilt & client endpoints
├── .env                      # Application environment configurations
├── schema.sql                # Consolidated MySQL database creation scripts
├── package.json              # Project dependencies configuration
└── README.md                 # Setup guidelines and documentation
```

---

## ⚙️ Installation & Configuration

### Prerequisites
* [Node.js](https://nodejs.org/) installed (v16+ recommended).
* (Optional) [MySQL Server](https://www.mysql.com/) running locally or in a cloud instance.

### 1. Install Dependencies
Navigate to the root directory of the application and run:
```bash
npm install
```

### 2. Configure Environment Variables
Open the `.env` file at the root of the project and customize your parameters:
```env
# Server Port Configuration
PORT=5000
JWT_SECRET=supersecretmedicalkey

# Google Gemini API Key
# Register and fetch yours from https://aistudio.google.com/
GEMINI_API_KEY=your_gemini_api_key_here

# MySQL Database Connection (Optional - Leave blank for In-Memory fallbacks)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=medical_ai

# SMTP Email Configuration (Optional - For real mail OTP delivery)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM="MedAI Vision" <noreply@medaivision.com>

# Developer Mode
# Set to 'true' to log OTP codes directly to terminal and HTTP response for fast testing
DEV_MODE=true
```

### 3. Initialize the MySQL Database
If you are using a local MySQL server, open your MySQL terminal/client and execute the initialization script:
```sql
SOURCE schema.sql;
```
This script will create the `medical_ai` database and initialize:
* `users`
* `reports`
* `report_history`
* `chat_history`

---

## 🏁 Running the Application

To boot up the application, execute the following command at the root directory:
```bash
node back/server.js
```
The console will output the startup status:
```
Mock Database Connected (or MySQL Connected successfully)
🚀 MedAI Vision Server running on http://localhost:5000
```
Open your web browser and navigate to **`http://localhost:5000`** to interact with the interface.

---

## 📖 Step-by-Step Feature Guide

### Step 1: User Account Registration & Login
1. Click the **Log In** tab in the sidebar navigation.
2. Toggle to **Register** and fill in your Full Name, Email, and Password (notice the password strength indicator checking requirements).
3. Click **Send Verification OTP**.
4. In `DEV_MODE=true`, copy the verification code from the alert pop-up or check your server terminal output. (If SMTP credentials are set, check your inbox).
5. Enter the code in the OTP field and press **Complete Registration**. The dashboard will securely initialize, and user pill structures will display your profile avatar.

### Step 2: Upload & Analysis of Reports
1. Go to the **Analyze Report** tab.
2. Drag and drop or browse to select a medical report file. Supported formats:
   * **PDF Documents** (parsed via `pdf-parse`)
   * **Images** (OCR processed via `Tesseract.js`)
   * **Text Files** (raw string reading)
3. Click **Extract & Analyze Report**. Watch the premium circular loaders step through OCR transcription, marker searches, and Gemini AI interpretation.
4. Review the calculated health rating (gauge indicator), severity parameters (risk badge), and detailed markdown explanations.

### Step 3: Interactive Consultation Chatbot
1. Go to the **AI Consultation** tab.
2. The chatbot is context-aware: once a report is analyzed, it references details from that report dynamically (indicated by the teal banner at the top of the chat page).
3. Type questions such as *"Explain my cholesterol results"* or *"What is my glucose risk?"*.
4. Gemini AI analyzes the report context alongside your questions and responds with clinical educational details.

### Step 4: Medical Archives & Historical Trends
1. Under the **Dashboard** tab, you will see aggregate metrics (number of reports, average health grade, highest risk tier) and an interactive **Health Score Trend** graph drawn using HTML5 Canvas.
2. Flip the dark/light theme switch at the bottom of the sidebar. You will see the grid lines and coordinates in the graph shift seamlessly to match theme readability parameters.
3. Search or review logs under **Medical Folders**, or download standard formatted PDF summaries.

---

## 🛠️ Troubleshooting & Support

* **OCR Failed to Read Scanned Reports**: Ensure the document is clear and readable. High-contrast images with horizontal orientation provide the highest parsing accuracy.
* **Gemini API Key Exceeded/Refused**: If the Gemini API key is missing or encounters billing limits, the server falls back to local clinical marker scanner mock summaries, so no features break.
* **MySQL Connection Refused**: The application will automatically print a warning in the terminal and fall back to the in-memory mock database. You can continue testing and uploading reports without restarting.
