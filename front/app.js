// ==================== STATE MANAGEMENT ====================
let jwtToken = localStorage.getItem("medai_token") || "";
let currentUser = null;
let reportsHistory = [];
let activeChatContext = null; // Store current report content for AI Chat context

try {
  const userStr = localStorage.getItem("medai_user");
  if (userStr) currentUser = JSON.parse(userStr);
} catch (e) {
  console.error("Failed to parse user session", e);
}

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setupNavigation();
  setupAuth();
  setupUpload();
  setupChat();
  setupHistory();
  initParticles();
  initTiltEffects();
  
  // Initial load data
  if (jwtToken) {
    updateAuthUI(true);
    fetchHistoryData();
  } else {
    updateAuthUI(false);
    updateMetrics(); // empty state
  }
});

// ==================== THEME SYSTEM ====================
function initTheme() {
  const themeToggle = document.getElementById("themeToggle");
  const storedTheme = localStorage.getItem("medai_theme");
  
  // Default is dark-theme
  if (storedTheme === "light") {
    document.body.classList.add("light-theme");
    document.body.classList.remove("dark-theme");
    themeToggle.checked = false;
  } else {
    document.body.classList.add("dark-theme");
    document.body.classList.remove("light-theme");
    themeToggle.checked = true;
  }
  
  themeToggle.addEventListener("change", () => {
    if (themeToggle.checked) {
      document.body.classList.add("dark-theme");
      document.body.classList.remove("light-theme");
      localStorage.setItem("medai_theme", "dark");
    } else {
      document.body.classList.add("light-theme");
      document.body.classList.remove("dark-theme");
      localStorage.setItem("medai_theme", "light");
    }
    // Redraw chart if any reports exist (adjusts grid colors for contrast)
    if (reportsHistory.length > 0) {
      renderHealthChart(reportsHistory);
    }
  });
}

// ==================== NAV / ROUTING ====================
function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const tabId = item.getAttribute("data-tab");
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  // Update nav item highlights
  document.querySelectorAll(".nav-item").forEach(item => {
    if (item.getAttribute("data-tab") === tabId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
  
  // Hide all sections, show target
  document.querySelectorAll(".tab-view").forEach(view => {
    view.classList.remove("active");
  });
  
  const targetView = document.getElementById(`view-${tabId}`);
  if (targetView) targetView.classList.add("active");
  
  // Dynamic header titles
  const viewTitle = document.getElementById("viewTitle");
  const viewSubtitle = document.getElementById("viewSubtitle");
  
  switch(tabId) {
    case "dashboard":
      viewTitle.innerText = "Dashboard Overview";
      viewSubtitle.innerText = "Welcome back to your personalized healthcare analytics control center.";
      if (jwtToken) fetchHistoryData();
      break;
    case "upload":
      viewTitle.innerText = "Analyze Report";
      viewSubtitle.innerText = "Upload clinical documents or image scans to run automated parsing & diagnostic interpretation.";
      break;
    case "chat":
      viewTitle.innerText = "AI Consultation";
      viewSubtitle.innerText = "Query findings, symptoms, or lab measurements directly with Google Gemini AI.";
      break;
    case "history":
      viewTitle.innerText = "Medical Folders";
      viewSubtitle.innerText = "Access all historical scans, parsed outcomes, and formatted PDF summaries.";
      if (jwtToken) fetchHistoryData();
      break;
    case "auth":
      viewTitle.innerText = "Identity Dashboard";
      viewSubtitle.innerText = "Sync your diagnostic metrics safely across secure encrypted accounts.";
      break;
  }
}

// ==================== AUTHENTICATION LOGIC ====================
let generatedRegisterOtp = "";

function setupAuth() {
  const tabLoginBtn = document.getElementById("tabLoginBtn");
  const tabRegisterBtn = document.getElementById("tabRegisterBtn");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const sendOtpBtn = document.getElementById("sendOtpBtn");
  const otpVal = document.getElementById("otpVal");
  const registerSubmitBtn = document.getElementById("registerSubmitBtn");
  const strengthMeterFill = document.getElementById("strengthMeterFill");
  const strengthMeterLabel = document.getElementById("strengthMeterLabel");
  const regPassword = document.getElementById("regPassword");
  
  // Form View Toggles
  tabLoginBtn.addEventListener("click", () => {
    tabLoginBtn.classList.add("active");
    tabRegisterBtn.classList.remove("active");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    clearAuthMsg();
  });
  
  tabRegisterBtn.addEventListener("click", () => {
    tabRegisterBtn.classList.add("active");
    tabLoginBtn.classList.remove("active");
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    clearAuthMsg();
  });
  
  // Password Strength Checker
  regPassword.addEventListener("input", () => {
    const val = regPassword.value;
    let score = 0;
    
    if (val.length >= 6) score += 25;
    if (/[A-Z]/.test(val)) score += 25;
    if (/[0-9]/.test(val)) score += 25;
    if (/[^A-Za-z0-9]/.test(val)) score += 25;
    
    strengthMeterFill.style.width = score + "%";
    
    if (score <= 25) {
      strengthMeterFill.style.backgroundColor = "var(--color-danger)";
      strengthMeterLabel.innerText = "Password Strength: Weak (add capital/number)";
    } else if (score <= 75) {
      strengthMeterFill.style.backgroundColor = "var(--color-warning)";
      strengthMeterLabel.innerText = "Password Strength: Moderate";
    } else {
      strengthMeterFill.style.backgroundColor = "var(--color-success)";
      strengthMeterLabel.innerText = "Password Strength: Strong";
    }
  });
  
  // Request OTP from Backend API
  sendOtpBtn.addEventListener("click", async () => {
    const regEmail = document.getElementById("regEmail").value;
    if (!regEmail || !regEmail.includes("@")) {
      showAuthMsg("Please provide a valid email before requesting OTP.", false);
      return;
    }
    
    sendOtpBtn.setAttribute("disabled", "true");
    showAuthMsg("Requesting verification OTP code...", true);
    
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail })
      });
      const data = await res.json();
      sendOtpBtn.removeAttribute("disabled");
      
      if (!data.success) {
        showAuthMsg(data.message || "Failed to dispatch verification OTP.", false);
        return;
      }
      
      otpVal.removeAttribute("disabled");
      registerSubmitBtn.removeAttribute("disabled");
      
      if (data.otp) {
        // Returned in DEV_MODE for easier testing
        alert(`🔐 [DEV MODE] Verification OTP: ${data.otp}\n\n(This code is also logged in the server console)`);
        showAuthMsg(`OTP dispatched. [DEV MODE] Code: ${data.otp}`, true);
      } else {
        showAuthMsg(data.message || "OTP code sent successfully.", true);
      }
    } catch (err) {
      sendOtpBtn.removeAttribute("disabled");
      showAuthMsg("Network error contacting verification authority.", false);
    }
  });
  
  // Handle Register submit
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const enteredOtp = otpVal.value.trim();
    
    if (!enteredOtp) {
      showAuthMsg("Please enter the verification OTP.", false);
      return;
    }
    
    const name = document.getElementById("regName").value;
    const email = document.getElementById("regEmail").value;
    const password = regPassword.value;
    
    try {
      showAuthMsg("Registering clinical details...", true);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, otp: enteredOtp })
      });
      
      const data = await res.json();
      if (!data.success) {
        showAuthMsg(data.message || "Registration failed.", false);
        return;
      }
      
      saveSession(data.token, data.user);
      showAuthMsg("✅ Account registered successfully!", true);
      setTimeout(() => switchTab("dashboard"), 1000);
      
    } catch (err) {
      showAuthMsg("Network error trying to contact authentication nodes.", false);
    }
  });
  
  // Handle Login Submit
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    
    try {
      showAuthMsg("Verifying identity profile...", true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      if (!data.success) {
        showAuthMsg(data.message || "Login failed.", false);
        return;
      }
      
      saveSession(data.token, data.user);
      showAuthMsg("✅ Signed in successfully!", true);
      setTimeout(() => switchTab("dashboard"), 1000);
      
    } catch (err) {
      showAuthMsg("Database auth service unresponsive.", false);
    }
  });
  
  // Logout Btn
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("medai_token");
    localStorage.removeItem("medai_user");
    jwtToken = "";
    currentUser = null;
    reportsHistory = [];
    activeChatContext = null;
    updateAuthUI(false);
    updateMetrics();
    switchTab("auth");
  });
}

function showAuthMsg(text, isSuccess) {
  const box = document.getElementById("authMessage");
  box.innerText = text;
  box.style.color = isSuccess ? "var(--color-success)" : "var(--color-danger)";
}

function clearAuthMsg() {
  document.getElementById("authMessage").innerText = "";
}

function saveSession(token, user) {
  jwtToken = token;
  currentUser = user;
  localStorage.setItem("medai_token", token);
  localStorage.setItem("medai_user", JSON.stringify(user));
  updateAuthUI(true);
  fetchHistoryData();
}

function updateAuthUI(isLoggedIn) {
  const profileCard = document.getElementById("profileCard");
  const authCard = document.getElementById("authCard");
  const authTabBtn = document.getElementById("authTabBtn");
  const userPill = document.getElementById("userPill");
  
  if (isLoggedIn && currentUser) {
    profileCard.classList.remove("hidden");
    authCard.classList.add("hidden");
    
    // Set Profile texts
    document.getElementById("profileName").innerText = currentUser.name;
    document.getElementById("profileEmail").innerText = currentUser.email;
    const initials = currentUser.name.split(" ").map(n => n[0]).join("").toUpperCase();
    document.getElementById("profileInitials").innerText = initials;
    
    // Set Sidebar User Pill
    document.getElementById("userPillName").innerText = currentUser.name;
    userPill.querySelector(".user-avatar").innerText = initials[0] || "U";
    authTabBtn.innerHTML = `<span class="nav-icon">👤</span> Profile`;
  } else {
    profileCard.classList.add("hidden");
    authCard.classList.remove("hidden");
    document.getElementById("userPillName").innerText = "Guest Mode";
    userPill.querySelector(".user-avatar").innerText = "G";
    authTabBtn.innerHTML = `<span class="nav-icon">👤</span> Log In`;
  }
}

// ==================== FILE UPLOADS ====================
let selectedFile = null;

function setupUpload() {
  const dropzone = document.getElementById("dropzone");
  const reportFileInput = document.getElementById("reportFile");
  const fileInfo = document.getElementById("fileInfo");
  const analyzeBtn = document.getElementById("analyzeBtn");
  
  // Drag over animations
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
  
  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });
  
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  });
  
  reportFileInput.addEventListener("change", (e) => {
    if (reportFileInput.files.length > 0) {
      handleFileSelection(reportFileInput.files[0]);
    }
  });
  
  function handleFileSelection(file) {
    selectedFile = file;
    fileInfo.innerText = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    fileInfo.style.display = "inline-block";
    analyzeBtn.removeAttribute("disabled");
  }
  
  // Trigger Analysis
  analyzeBtn.addEventListener("click", async () => {
    if (!selectedFile) return;
    
    const formData = new FormData();
    formData.append("report", selectedFile);
    
    const loader = document.getElementById("analysisLoader");
    const results = document.getElementById("analysisResults");
    const loaderFill = document.getElementById("loaderFill");
    const loaderStatus = document.getElementById("loaderStatus");
    const loaderSub = document.getElementById("loaderSubText");
    
    // Reset views
    results.classList.add("hidden");
    loader.classList.remove("hidden");
    analyzeBtn.setAttribute("disabled", "true");
    
    // Simulate structured stages
    let progress = 10;
    loaderFill.style.width = progress + "%";
    
    const stageInterval = setInterval(() => {
      progress += 10;
      if (progress <= 90) {
        loaderFill.style.width = progress + "%";
        if (progress === 30) {
          loaderStatus.innerText = "Extracting raw strings...";
          loaderSub.innerText = "Executing parser script / OCR OCR engine";
        } else if (progress === 60) {
          loaderStatus.innerText = "Running diagnostic diagnostics...";
          loaderSub.innerText = "Searching keywords for scoring thresholds";
        } else if (progress === 80) {
          loaderStatus.innerText = "Generating Gemini interpretation...";
          loaderSub.innerText = "Structuring diagnostic guidance recommendations";
        }
      }
    }, 1000);
    
    try {
      const headers = {};
      if (jwtToken) {
        headers["Authorization"] = `Bearer ${jwtToken}`;
      }
      
      const res = await fetch("/api/report/upload", {
        method: "POST",
        headers,
        body: formData
      });
      
      clearInterval(stageInterval);
      
      if (!res.ok) {
        throw new Error(await res.text());
      }
      
      const data = await res.json();
      
      // Finalize progress loader
      loaderFill.style.width = "100%";
      setTimeout(() => {
        loader.classList.add("hidden");
        renderAnalysisResult(data);
      }, 500);
      
    } catch (err) {
      clearInterval(stageInterval);
      loader.classList.add("hidden");
      analyzeBtn.removeAttribute("disabled");
      alert("Analysis engine failure: " + err.message);
    }
  });
}

function renderAnalysisResult(data) {
  const results = document.getElementById("analysisResults");
  results.classList.remove("hidden");
  
  // Set meta details
  document.getElementById("resultReportName").innerText = data.reportName;
  document.getElementById("resultDate").innerText = `Analyzed on ${new Date().toLocaleDateString()}`;
  
  // Health Score Circular path trigger
  document.getElementById("resultScoreVal").innerText = data.healthScore;
  const scoreCircle = document.getElementById("resultScoreCircle");
  
  // The svg path circle has total stroke perimeter length of 100 equivalent
  scoreCircle.setAttribute("stroke-dasharray", `${data.healthScore}, 100`);
  
  // Change score indicator colors
  if (data.healthScore >= 80) {
    scoreCircle.setAttribute("stroke", "var(--color-success)");
  } else if (data.healthScore >= 60) {
    scoreCircle.setAttribute("stroke", "var(--color-warning)");
  } else {
    scoreCircle.setAttribute("stroke", "var(--color-danger)");
  }
  
  // Risk category badge
  const riskBadge = document.getElementById("resultRiskVal");
  riskBadge.innerText = data.riskLevel;
  riskBadge.className = `risk-badge risk-${data.riskLevel.toLowerCase()}`;
  
  // Markdown detailed render
  const formattedText = marked.parse(data.analysis);
  document.getElementById("resultAnalysisText").innerHTML = formattedText;
  
  // Store dynamic context globally for AI Consultations
  activeChatContext = data.analysis;
  
  // Notify user that AI context is active
  const chatContextBanner = document.getElementById("chatContextBanner");
  const chatContextText = document.getElementById("chatContextText");
  const clearContextBtn = document.getElementById("clearContextBtn");
  
  chatContextText.innerText = `Active AI Consult in reference to: ${data.reportName}`;
  chatContextBanner.style.backgroundColor = "rgba(0, 229, 255, 0.08)";
  clearContextBtn.style.display = "block";
  
  // PDF download actions
  const downloadPdfBtn = document.getElementById("downloadPdfBtn");
  // Remove existing listener if any
  const newDownloadBtn = downloadPdfBtn.cloneNode(true);
  downloadPdfBtn.parentNode.replaceChild(newDownloadBtn, downloadPdfBtn);
  
  newDownloadBtn.addEventListener("click", () => {
    downloadReportPdf(data.healthScore, data.riskLevel, data.analysis, data.reportName);
  });
  
  // Update internal states
  if (jwtToken) {
    fetchHistoryData();
  }
}

// Download PDF helper
async function downloadReportPdf(score, risk, analysis, reportName) {
  try {
    const res = await fetch("/api/pdf/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, risk, analysis, reportName })
    });
    
    if (!res.ok) throw new Error("Could not construct PDF structure");
    
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MedAI_Interpretation_${reportName.split(".")[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert("PDF download failed: " + err.message);
  }
}

// ==================== CONSULTATIONS CHAT ====================
function setupChat() {
  const chatInput = document.getElementById("chatInput");
  const chatSendBtn = document.getElementById("chatSendBtn");
  const chatMessages = document.getElementById("chatMessages");
  const clearContextBtn = document.getElementById("clearContextBtn");
  
  // Suggestion chips triggers
  document.querySelectorAll(".suggestion-tag").forEach(chip => {
    chip.addEventListener("click", () => {
      const question = chip.getAttribute("data-q");
      submitChatMessage(question);
    });
  });
  
  // Trigger on Send Click
  chatSendBtn.addEventListener("click", () => {
    const val = chatInput.value.trim();
    if (val) submitChatMessage(val);
  });
  
  // Trigger on Enter
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const val = chatInput.value.trim();
      if (val) submitChatMessage(val);
    }
  });
  
  // Clear report context
  clearContextBtn.addEventListener("click", () => {
    activeChatContext = null;
    document.getElementById("chatContextText").innerText = "Active AI consult (General Mode)";
    document.getElementById("chatContextBanner").style.backgroundColor = "rgba(255, 255, 255, 0.02)";
    clearContextBtn.style.display = "none";
  });
  
  async function submitChatMessage(message) {
    // Clear input
    chatInput.value = "";
    
    // 1. Render user message bubble
    renderMessageBubble(message, true);
    
    // 2. Render Bot thinking animation
    const thinkingId = renderThinkingBubble();
    
    try {
      const headers = { "Content-Type": "application/json" };
      if (jwtToken) {
        headers["Authorization"] = `Bearer ${jwtToken}`;
      }
      
      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          message,
          reportContext: activeChatContext
        })
      });
      
      // Remove thinking
      removeBubble(thinkingId);
      
      if (!res.ok) {
        throw new Error(await res.text());
      }
      
      const data = await res.json();
      renderMessageBubble(data.response, false);
      
    } catch (err) {
      removeBubble(thinkingId);
      renderMessageBubble("Error contacting AI Consultation engine: " + err.message, false);
    }
  }
}

function renderMessageBubble(text, isUser) {
  const container = document.getElementById("chatMessages");
  const bubble = document.createElement("div");
  bubble.className = `message-bubble ${isUser ? "user-message" : "bot-message"}`;
  
  const parsedHtml = isUser ? `<p>${text}</p>` : marked.parse(text);
  
  bubble.innerHTML = `
    <div class="message-avatar">${isUser ? "👤" : "🤖"}</div>
    <div class="message-content">
      ${parsedHtml}
    </div>
  `;
  
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function renderThinkingBubble() {
  const container = document.getElementById("chatMessages");
  const bubble = document.createElement("div");
  const id = "think-" + Date.now();
  bubble.id = id;
  bubble.className = "message-bubble bot-message";
  bubble.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-content thinking-bubble">
      <div class="thinking-dot"></div>
      <div class="thinking-dot"></div>
      <div class="thinking-dot"></div>
    </div>
  `;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeBubble(id) {
  const target = document.getElementById(id);
  if (target) target.remove();
}

// ==================== MEDICAL HISTORY ARCHIVES ====================
function setupHistory() {
  const searchInput = document.getElementById("historySearch");
  
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase();
    const rows = document.querySelectorAll("#historyTableBody tr");
    
    rows.forEach(row => {
      const name = row.querySelector(".row-name")?.innerText.toLowerCase();
      if (!name) return;
      
      if (name.includes(term)) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    });
  });
  
  // Close modals
  document.getElementById("modalCloseBtn").addEventListener("click", () => {
    document.getElementById("reportModal").classList.add("hidden");
  });
  
  document.getElementById("reportModal").addEventListener("click", (e) => {
    if (e.target.id === "reportModal") {
      document.getElementById("reportModal").classList.add("hidden");
    }
  });
}

async function fetchHistoryData() {
  try {
    const res = await fetch("/api/history", {
      headers: { "Authorization": `Bearer ${jwtToken}` }
    });
    
    if (!res.ok) throw new Error("Could not retrieve logs");
    
    const data = await res.json();
    reportsHistory = data;
    
    updateMetrics();
    renderHistoryTable();
    renderRecentTable();
    renderHealthChart(data);
    
  } catch (err) {
    console.error("Failed to load medical history folders", err);
  }
}

function updateMetrics() {
  const count = reportsHistory.length;
  document.getElementById("metricCount").innerText = count;
  
  const metricScore = document.getElementById("metricScore");
  const metricScoreFill = document.getElementById("metricScoreFill");
  const metricScoreLabel = document.getElementById("metricScoreLabel");
  const metricRisk = document.getElementById("metricRisk");
  const metricRiskLabel = document.getElementById("metricRiskLabel");
  
  if (count === 0) {
    metricScore.innerText = "--";
    metricScoreFill.style.width = "0%";
    metricScoreLabel.innerText = "No clinical values";
    metricRisk.innerText = "--";
    metricRiskLabel.innerText = "No reports processed yet";
    return;
  }
  
  // Average Score
  const avg = Math.round(reportsHistory.reduce((sum, r) => sum + r.health_score, 0) / count);
  metricScore.innerText = avg;
  metricScoreFill.style.width = avg + "%";
  metricScoreLabel.innerText = `Calculated across ${count} report(s)`;
  
  // Highest Risk category
  const risks = reportsHistory.map(r => r.risk_level);
  let aggregateRisk = "Low";
  if (risks.includes("High")) {
    aggregateRisk = "High";
  } else if (risks.includes("Medium")) {
    aggregateRisk = "Medium";
  }
  
  metricRisk.innerText = aggregateRisk;
  metricRisk.className = `metric-value font-risk`;
  
  // Apply risk color
  if (aggregateRisk === "High") {
    metricRisk.style.color = "var(--color-danger)";
    metricRiskLabel.innerText = "⚠️ High clinical markers found. Action recommended.";
  } else if (aggregateRisk === "Medium") {
    metricRisk.style.color = "var(--color-warning)";
    metricRiskLabel.innerText = "🔔 Moderate warning indicators detected.";
  } else {
    metricRisk.style.color = "var(--color-success)";
    metricRiskLabel.innerText = "🟢 Stable health metrics recorded.";
  }
}

function renderRecentTable() {
  const tbody = document.getElementById("recentTableBody");
  tbody.innerHTML = "";
  
  if (reportsHistory.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-secondary">No report data. Please upload a report to begin analysis.</td></tr>`;
    return;
  }
  
  // Limit to recent 3 items
  const recent = reportsHistory.slice(0, 3);
  
  recent.forEach(report => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="font-semibold">${report.report_name}</td>
      <td class="text-secondary">${new Date(report.created_at).toLocaleDateString()}</td>
      <td><span class="font-bold">${report.health_score}</span>/100</td>
      <td><span class="badge badge-${getBadgeClass(report.risk_level)}">${report.risk_level}</span></td>
      <td><button class="btn-text" onclick="viewReportDetails(${report.id})">Review Analysis</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderHistoryTable() {
  const tbody = document.getElementById("historyTableBody");
  tbody.innerHTML = "";
  
  if (reportsHistory.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-secondary">No archived medical documents. Log in or upload a report.</td></tr>`;
    return;
  }
  
  reportsHistory.forEach(report => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="font-semibold row-name">${report.report_name}</td>
      <td class="text-secondary">${new Date(report.created_at).toLocaleDateString()}</td>
      <td><span class="font-bold">${report.health_score}</span>/100</td>
      <td><span class="badge badge-${getBadgeClass(report.risk_level)}">${report.risk_level}</span></td>
      <td class="text-right">
        <button class="btn btn-secondary btn-sm" onclick="viewReportDetails(${report.id})" style="padding:6px 12px; font-size:12px;">View Info</button>
        <button class="btn btn-outline btn-sm" onclick="downloadReportPdf(${report.health_score}, '${report.risk_level}', \`${report.analysis.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`, '${report.report_name}')" style="padding:6px 12px; font-size:12px;">PDF</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function getBadgeClass(risk) {
  if (risk === "High") return "danger";
  if (risk === "Medium") return "warning";
  return "success";
}

// Modal view details trigger
window.viewReportDetails = function(reportId) {
  const report = reportsHistory.find(r => r.id === reportId);
  if (!report) return;
  
  const modal = document.getElementById("reportModal");
  document.getElementById("modalReportName").innerText = report.report_name;
  document.getElementById("modalScoreVal").innerText = `${report.health_score}/100`;
  
  const riskVal = document.getElementById("modalRiskVal");
  riskVal.innerText = report.risk_level;
  riskVal.className = `risk-badge risk-${report.risk_level.toLowerCase()}`;
  
  document.getElementById("modalAnalysisText").innerHTML = marked.parse(report.analysis);
  
  // Set context chatbot triggers
  activeChatContext = report.analysis;
  
  // PDF download binder in modal
  const downloadBtn = document.getElementById("modalDownloadPdfBtn");
  const newBtn = downloadBtn.cloneNode(true);
  downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
  
  newBtn.addEventListener("click", () => {
    downloadReportPdf(report.health_score, report.risk_level, report.analysis, report.report_name);
  });
  
  modal.classList.remove("hidden");
};

// ==================== CUSTOM HIGH-PERFORMANCE CHART DRAWING ====================
function renderHealthChart(reports) {
  const canvas = document.getElementById("healthChart");
  const emptyState = document.getElementById("chartEmpty");
  
  if (!reports || reports.length < 2) {
    canvas.style.display = "none";
    emptyState.style.display = "flex";
    return;
  }
  
  canvas.style.display = "block";
  emptyState.style.display = "none";
  
  // Prepare dates & scores (sort chronological for graphing)
  const chartData = [...reports]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
  const ctx = canvas.getContext("2d");
  
  // DPI Setup for HD screens
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  const width = rect.width;
  const height = rect.height;
  
  // Canvas Constants
  const paddingX = 45;
  const paddingY = 30;
  const graphWidth = width - paddingX * 2;
  const graphHeight = height - paddingY * 2;
  
  ctx.clearRect(0, 0, width, height);
  
  // Theme aware color profiles
  const isLight = document.body.classList.contains("light-theme");
  const textColor = isLight ? "#64748b" : "#94a3b8";
  const gridColor = isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)";
  const axisColor = isLight ? "#cbd5e1" : "#334155";
  const lineColor = isLight ? "#0284c7" : "#00e5ff";
  const glowColor = isLight ? "rgba(2, 132, 199, 0.4)" : "rgba(0, 229, 255, 0.4)";
  
  // 1. Draw horizontal grid divisions & values
  const divisions = 4;
  for (let i = 0; i <= divisions; i++) {
    const yVal = Math.round(100 - (100 / divisions) * i);
    const y = paddingY + (graphHeight / divisions) * i;
    
    // Grid line
    ctx.beginPath();
    ctx.moveTo(paddingX, y);
    ctx.lineTo(width - paddingX, y);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Label Y
    ctx.fillStyle = textColor;
    ctx.font = "11px Outfit, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(yVal, paddingX - 10, y);
  }
  
  // 2. Process data coordinates
  const points = chartData.map((d, index) => {
    const x = paddingX + (graphWidth / (chartData.length - 1)) * index;
    const y = paddingY + graphHeight - (graphHeight * (d.health_score / 100));
    return { x, y, score: d.health_score, date: new Date(d.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric'}) };
  });
  
  // 3. Draw gradient background under line
  const fillGradient = ctx.createLinearGradient(0, paddingY, 0, paddingY + graphHeight);
  fillGradient.addColorStop(0, isLight ? "rgba(2, 132, 199, 0.15)" : "rgba(0, 229, 255, 0.15)");
  fillGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  
  ctx.beginPath();
  ctx.moveTo(points[0].x, paddingY + graphHeight);
  for (let i = 0; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.lineTo(points[points.length - 1].x, paddingY + graphHeight);
  ctx.closePath();
  ctx.fillStyle = fillGradient;
  ctx.fill();
  
  // 4. Draw smooth curves connecting nodes
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  
  for (let i = 0; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i+1].x) / 2;
    const yc = (points[i].y + points[i+1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 3;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 10;
  ctx.stroke();
  
  // Reset shadow for further draws
  ctx.shadowBlur = 0;
  
  // 5. Draw node dots and date labels along X axis
  points.forEach((pt, index) => {
    // Dot node
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = isLight ? "#ffffff" : "#080c14";
    ctx.fill();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Labels along X
    ctx.fillStyle = textColor;
    ctx.font = "10px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(pt.date, pt.x, paddingY + graphHeight + 10);
  });
}

// ==================== INTERACTIVE AI PARTICLE BACKGROUND ====================
function initParticles() {
  const canvas = document.getElementById("particles-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  
  let particlesArray = [];
  const numberOfParticles = 55;
  
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  
  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 0.8;
      this.vy = (Math.random() - 0.5) * 0.8;
      this.radius = Math.random() * 2.5 + 1.5;
    }
    draw() {
      const isLight = document.body.classList.contains("light-theme");
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = isLight ? "rgba(2, 132, 199, 0.25)" : "rgba(0, 229, 255, 0.25)";
      ctx.fill();
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      
      // Boundary collision
      if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
      if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;
    }
  }
  
  function init() {
    particlesArray = [];
    for (let i = 0; i < numberOfParticles; i++) {
      particlesArray.push(new Particle());
    }
  }
  
  function connect() {
    const isLight = document.body.classList.contains("light-theme");
    const linkColor = isLight ? "rgba(2, 132, 199, 0.08)" : "rgba(0, 229, 255, 0.08)";
    for (let a = 0; a < particlesArray.length; a++) {
      for (let b = a; b < particlesArray.length; b++) {
        const distSq = (particlesArray[a].x - particlesArray[b].x) ** 2 + 
                       (particlesArray[a].y - particlesArray[b].y) ** 2;
        if (distSq < 13000) {
          ctx.strokeStyle = linkColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
          ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
          ctx.stroke();
        }
      }
    }
  }
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particlesArray.length; i++) {
      particlesArray[i].update();
      particlesArray[i].draw();
    }
    connect();
    requestAnimationFrame(animate);
  }
  
  init();
  animate();
}

// ==================== 3D ROTATION TILT EFFECT ====================
function initTiltEffects() {
  // Tilt effect disabled to prevent UI shaking/tilting
}
