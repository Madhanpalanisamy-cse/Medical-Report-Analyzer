CREATE TABLE report_history(
 id INT PRIMARY KEY AUTO_INCREMENT,
 user_id INT,
 report_name VARCHAR(255),
 health_score INT,
 risk_level VARCHAR(50),
 analysis LONGTEXT,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_history(
 id INT PRIMARY KEY AUTO_INCREMENT,
 user_id INT,
 question TEXT,
 answer LONGTEXT,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);