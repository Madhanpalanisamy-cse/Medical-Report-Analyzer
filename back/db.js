const mysql = require("mysql2");

let db;
let isFallback = false;

// Mock database storage
const mockDb = {
  users: [],
  reports: [],
  report_history: [],
  chat_history: []
};

// Mock Query Processor
const mockQuery = (sql, params, callback) => {
  if (typeof params === "function") {
    callback = params;
    params = [];
  }
  
  const normalizedSql = sql.trim().replace(/\s+/g, " ").toLowerCase();
  
  try {
    // 1. SELECT FROM users BY EMAIL
    if (normalizedSql.includes("select * from users where email")) {
      const email = params[0];
      const user = mockDb.users.find(u => u.email === email);
      return callback(null, user ? [user] : []);
    }
    
    // 2. INSERT INTO users
    if (normalizedSql.includes("insert into users")) {
      // Columns: name, email, password
      const name = params[0];
      const email = params[1];
      const password = params[2];
      
      // Check if user already exists
      if (mockDb.users.some(u => u.email === email)) {
        return callback({ code: "ER_DUP_ENTRY", message: "Email already exists" }, null);
      }
      
      const newUser = {
        id: mockDb.users.length + 1,
        name,
        email,
        password,
        created_at: new Date()
      };
      mockDb.users.push(newUser);
      return callback(null, { insertId: newUser.id });
    }

    // 3. INSERT INTO reports
    if (normalizedSql.includes("insert into reports")) {
      // Columns: user_id, report_name, extracted_text
      const user_id = params[0];
      const report_name = params[1];
      const extracted_text = params[2];

      const newReport = {
        id: mockDb.reports.length + 1,
        user_id,
        report_name,
        extracted_text,
        created_at: new Date()
      };
      mockDb.reports.push(newReport);
      return callback(null, { insertId: newReport.id });
    }
    
    // 4. SELECT FROM report_history
    if (normalizedSql.includes("select * from report_history")) {
      const user_id = params[0];
      // Filter by user_id if parameter provided
      let list = mockDb.report_history;
      if (user_id !== undefined) {
        list = list.filter(r => r.user_id === user_id);
      }
      const sortedHistory = [...list].sort(
        (a, b) => b.created_at - a.created_at
      );
      return callback(null, sortedHistory);
    }
    
    // 5. INSERT INTO report_history
    if (normalizedSql.includes("insert into report_history")) {
      // Columns: user_id, report_id, report_name, health_score, risk_level, analysis
      const user_id = params[0];
      const report_id = params[1];
      const report_name = params[2];
      const health_score = params[3];
      const risk_level = params[4];
      const analysis = params[5];
      
      const newReportHist = {
        id: mockDb.report_history.length + 1,
        user_id,
        report_id,
        report_name,
        health_score,
        risk_level,
        analysis,
        created_at: new Date()
      };
      mockDb.report_history.push(newReportHist);
      return callback(null, { insertId: newReportHist.id });
    }
    
    // 6. SELECT FROM chat_history
    if (normalizedSql.includes("select * from chat_history")) {
      const user_id = params[0];
      let list = mockDb.chat_history;
      if (user_id !== undefined) {
        list = list.filter(c => c.user_id === user_id);
      }
      const sortedChat = [...list].sort(
        (a, b) => a.created_at - b.created_at
      );
      return callback(null, sortedChat);
    }
    
    // 7. INSERT INTO chat_history
    if (normalizedSql.includes("insert into chat_history")) {
      // Columns: user_id, question, answer
      const user_id = params[0];
      const question = params[1];
      const answer = params[2];
      
      const newChat = {
        id: mockDb.chat_history.length + 1,
        user_id,
        question,
        answer,
        created_at: new Date()
      };
      mockDb.chat_history.push(newChat);
      return callback(null, { insertId: newChat.id });
    }
    
    // Default fallback: return empty array
    return callback(null, []);
  } catch (err) {
    return callback(err, null);
  }
};

const hasEnv = process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME;

if (!hasEnv) {
  console.warn("⚠️ Database environment variables missing. Falling back to local in-memory storage.");
  isFallback = true;
  db = {
    query: mockQuery,
    connect: (cb) => {
      console.log("Mock Database Connected");
      if (cb) cb(null);
    }
  };
} else {
  try {
    db = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    db.connect(err => {
      if (err) {
        console.error("❌ MySQL Connection failed. Falling back to local in-memory storage.", err.message);
        isFallback = true;
        // Re-assign db methods to use mock query instead of failing
        db.query = mockQuery;
      } else {
        console.log("✅ MySQL Connected successfully");
      }
    });
  } catch (err) {
    console.error("❌ MySQL Setup crashed. Falling back to local in-memory storage.", err.message);
    isFallback = true;
    db = {
      query: mockQuery,
      connect: (cb) => { if (cb) cb(null); }
    };
  }
}

module.exports = db;