import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import crypto from "crypto";
import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

console.log("Starting EduAI Server...");
const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "hackathon-secret-key";

// MongoDB Connection (Optional/Parallel to SQLite for now)
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  console.log("Connecting to MongoDB...");
  mongoose.connect(MONGODB_URI)
    .then(() => console.log("MongoDB Connected Successfully"))
    .catch(err => console.error("MongoDB Connection Error:", err));
} else {
  console.log("MONGODB_URI not found in environment. Skipping MongoDB connection.");
}

console.log("Connecting to database...");
const db = new Database("eduai.db");

app.use(express.json());

// Request Logging Middleware
app.use((req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode === 403) {
      console.log(`[403 Forbidden] ${req.method} ${req.url} - Content-Type: ${res.get('Content-Type')}`);
    }
  });

  const oldJson = res.json;
  res.json = function(data) {
    if (res.statusCode === 403) {
      try {
        console.log(`[403 Forbidden] ${req.method} ${req.url} - Response:`, JSON.stringify(data));
      } catch (e) {
        console.log(`[403 Forbidden] ${req.method} ${req.url} - Response: [Circular or Unstringifiable]`);
      }
    }
    return oldJson.apply(res, arguments as any);
  };

  if (req.url.startsWith("/api")) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (req.method === "POST") {
      try {
        console.log("Body:", JSON.stringify(req.body));
      } catch (e) {
        console.log("Body: [Circular or Unstringifiable]");
      }
    }
  }
  next();
});

// Health Check
app.get("/api/health", (req, res) => {
  try {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    res.json({ status: "ok", database: "connected", users: userCount.count });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Initialize Database
console.log("Initializing database schema...");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT,
    name TEXT,
    roll_no TEXT,
    student_id TEXT,
    teacher_id TEXT,
    is_approved INTEGER DEFAULT 1,
    verified INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    teacher_id INTEGER,
    FOREIGN KEY(teacher_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER,
    teacher_id INTEGER,
    title TEXT,
    questions TEXT, -- JSON
    answer_key TEXT, -- JSON
    due_date TEXT,
    duration INTEGER, -- in minutes
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(subject_id) REFERENCES subjects(id),
    FOREIGN KEY(teacher_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS student_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER,
    student_email TEXT,
    roll_no TEXT,
    school_id TEXT,
    FOREIGN KEY(assignment_id) REFERENCES assignments(id)
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER,
    student_id INTEGER,
    answers TEXT, -- JSON
    submitted_at TEXT,
    ai_score REAL,
    ai_confidence REAL,
    ai_feedback TEXT,
    ai_metadata TEXT, -- JSON (tags, rubric breakdown)
    mistake_cluster TEXT,
    teacher_feedback TEXT,
    status TEXT DEFAULT 'pending', -- pending, evaluating, evaluated, approved
    FOREIGN KEY(assignment_id) REFERENCES assignments(id),
    FOREIGN KEY(student_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    message TEXT,
    read INTEGER DEFAULT 0,
    created_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    token TEXT,
    expires_at TEXT
  );
`);

// Migration: Ensure columns exist if table was created earlier
console.log("Running migrations...");
const columns = db.prepare("PRAGMA table_info(users)").all() as any[];
const columnNames = columns.map(c => c.name);

if (!columnNames.includes("roll_no")) db.exec("ALTER TABLE users ADD COLUMN roll_no TEXT");
if (!columnNames.includes("student_id")) db.exec("ALTER TABLE users ADD COLUMN student_id TEXT");
if (!columnNames.includes("teacher_id")) db.exec("ALTER TABLE users ADD COLUMN teacher_id TEXT");
if (!columnNames.includes("is_approved")) db.exec("ALTER TABLE users ADD COLUMN is_approved INTEGER DEFAULT 1");

// Submissions migrations
const submissionCols = db.prepare("PRAGMA table_info(submissions)").all() as any[];
const submissionColNames = submissionCols.map(c => c.name);
if (!submissionColNames.includes("ai_confidence")) db.exec("ALTER TABLE submissions ADD COLUMN ai_confidence REAL");
if (!submissionColNames.includes("ai_metadata")) db.exec("ALTER TABLE submissions ADD COLUMN ai_metadata TEXT");
if (!submissionColNames.includes("mistake_cluster")) db.exec("ALTER TABLE submissions ADD COLUMN mistake_cluster TEXT");

// Migration for assignments description and evaluation status
const assignmentCols = db.prepare("PRAGMA table_info(assignments)").all() as any[];
const assignmentColNames = assignmentCols.map(c => c.name);
if (!assignmentColNames.includes("description")) {
  db.exec("ALTER TABLE assignments ADD COLUMN description TEXT");
}
if (!assignmentColNames.includes("is_evaluated")) {
  db.exec("ALTER TABLE assignments ADD COLUMN is_evaluated INTEGER DEFAULT 0");
}
if (!assignmentColNames.includes("created_at")) {
  db.exec("ALTER TABLE assignments ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP");
}
if (!assignmentColNames.includes("ai_summary")) {
  db.exec("ALTER TABLE assignments ADD COLUMN ai_summary TEXT");
}
if (!assignmentColNames.includes("common_mistakes")) {
  db.exec("ALTER TABLE assignments ADD COLUMN common_mistakes TEXT");
}

// Seed Predefined Admin
const seedAdmin = () => {
  console.log("Seeding admin user...");
  const adminEmail = "admin@eduai.com";
  const adminPassword = "admin123";
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);
  
  const existingAdmin = db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail);
  
  if (!existingAdmin) {
    db.prepare("INSERT INTO users (email, password, role, name, is_approved) VALUES (?, ?, ?, ?, ?)")
      .run(adminEmail, hashedPassword, "admin", "System Administrator", 1);
    console.log("Predefined Admin created: admin@eduai.com / admin123");
  } else {
    // Force update existing admin to ensure credentials and approval status are correct
    db.prepare("UPDATE users SET password = ?, role = 'admin', is_approved = 1 WHERE email = ?")
      .run(hashedPassword, adminEmail);
    console.log("Predefined Admin verified/updated: admin@eduai.com / admin123");
  }
};
seedAdmin();

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// --- AUTH ROUTES ---
app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  
  if (!user) {
    // Return success even if user doesn't exist for security
    return res.json({ message: "If an account exists with that email, a reset link has been sent." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

  db.prepare("DELETE FROM password_resets WHERE email = ?").run(email);
  db.prepare("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)")
    .run(email, token, expiresAt);

  // In a real app, send an email. Here we log it.
  console.log(`[PASSWORD RESET] Email: ${email}, Token: ${token}`);
  console.log(`[PASSWORD RESET] Link: http://localhost:3000/reset-password?token=${token}`);

  res.json({ message: "If an account exists with that email, a reset link has been sent." });
});

app.post("/api/auth/reset-password", (req, res) => {
  const { token, password } = req.body;
  const reset = db.prepare("SELECT email, expires_at FROM password_resets WHERE token = ?").get(token) as any;

  if (!reset || new Date(reset.expires_at) < new Date()) {
    return res.status(400).json({ error: "Invalid or expired token" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  db.prepare("UPDATE users SET password = ? WHERE email = ?").run(hashedPassword, reset.email);
  db.prepare("DELETE FROM password_resets WHERE email = ?").run(reset.email);

  res.json({ message: "Password has been reset successfully." });
});

app.post("/api/auth/register", (req, res) => {
  try {
    const { email, password, role, name, roll_no, student_id, teacher_id } = req.body;
    
    if (!email || !password || !role || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Admin cannot register via sign-up
    if (role === 'admin') {
      return res.status(400).json({ error: "Admin registration not allowed" });
    }

    const isApproved = role === 'teacher' ? 0 : 1;
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const result = db.prepare("INSERT INTO users (email, password, role, name, roll_no, student_id, teacher_id, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(email, hashedPassword, role, name, roll_no || null, student_id || null, teacher_id || null, isApproved);
    
    res.json({ 
      id: result.lastInsertRowid, 
      message: role === 'teacher' ? "Registration successful. Waiting for admin approval." : "Registration successful." 
    });
  } catch (err: any) {
    console.error("Registration error:", err);
    if (err.message && err.message.includes("UNIQUE constraint failed")) {
      res.status(400).json({ error: "User with this email already exists" });
    } else {
      res.status(500).json({ error: "Internal server error during registration" });
    }
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    console.log(`Login attempt for: ${email}`);
    const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    
    if (!user) {
      console.log(`User not found: ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      console.log(`Invalid password for: ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.is_approved === 0) {
      console.log(`User not approved: ${email}`);
      return res.status(403).json({ error: "Your account is pending admin approval." });
    }

    console.log(`Login successful: ${email} (${user.role})`);
    const token = jwt.sign({ id: user.id, role: user.role, email: user.email, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, role: user.role, email: user.email, name: user.name } });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error during login" });
  }
});

// --- ADMIN ROUTES ---
app.get("/api/admin/pending-teachers", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const teachers = db.prepare("SELECT id, name, email, role FROM users WHERE role = 'teacher' AND is_approved = 0").all();
  res.json(teachers);
});

app.post("/api/admin/approve-teacher", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const { userId } = req.body;
  db.prepare("UPDATE users SET is_approved = 1 WHERE id = ? AND role = 'teacher'").run(userId);
  res.json({ message: "Teacher approved successfully" });
});

app.post("/api/admin/reject-teacher", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const { userId } = req.body;
  db.prepare("DELETE FROM users WHERE id = ? AND role = 'teacher' AND is_approved = 0").run(userId);
  res.json({ message: "Teacher rejected successfully" });
});

app.get("/api/admin/users", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const users = db.prepare("SELECT id, name, email, role, roll_no, student_id, teacher_id, is_approved FROM users WHERE role != 'admin'").all();
  res.json(users);
});

app.post("/api/admin/update-user", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const { id, name, email, roll_no, student_id, teacher_id, is_approved } = req.body;
  db.prepare(`
    UPDATE users 
    SET name = ?, email = ?, roll_no = ?, student_id = ?, teacher_id = ?, is_approved = ?
    WHERE id = ?
  `).run(name, email, roll_no, student_id, teacher_id, is_approved, id);
  res.json({ message: "User updated successfully" });
});

app.get("/api/admin/stats", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
  const activeStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get() as any;
  const verifiedTeachers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'teacher' AND is_approved = 1").get() as any;
  res.json({
    totalUsers: totalUsers.count,
    activeStudents: activeStudents.count,
    verifiedTeachers: verifiedTeachers.count
  });
});

// --- TEACHER ROUTES ---
app.post("/api/teacher/subjects", authenticate, (req: any, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: "Forbidden" });
  const { name } = req.body;
  const result = db.prepare("INSERT INTO subjects (name, teacher_id) VALUES (?, ?)")
    .run(name, req.user.id);
  res.json({ id: result.lastInsertRowid });
});

app.get("/api/teacher/subjects", authenticate, (req: any, res) => {
  const subjects = db.prepare("SELECT * FROM subjects WHERE teacher_id = ?").all(req.user.id);
  res.json(subjects);
});

app.post("/api/teacher/assignments", authenticate, (req: any, res) => {
  const { subject_id, title, description, questions, answer_key, due_date, duration, student_list } = req.body;
  const result = db.prepare("INSERT INTO assignments (subject_id, teacher_id, title, description, questions, answer_key, due_date, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(subject_id, req.user.id, title, description, JSON.stringify(questions), JSON.stringify(answer_key), due_date, duration);
  
  const assignmentId = result.lastInsertRowid;

  // Add student list and create notifications
  if (student_list && Array.isArray(student_list)) {
    const stmt = db.prepare("INSERT INTO student_lists (assignment_id, student_email, roll_no, school_id) VALUES (?, ?, ?, ?)");
    const notifyStmt = db.prepare("INSERT INTO notifications (user_id, message, created_at) VALUES (?, ?, ?)");
    
    for (const student of student_list) {
      stmt.run(assignmentId, student.email, student.roll_no, student.school_id);
      
      // Find student user to notify
      const studentUser: any = db.prepare("SELECT id FROM users WHERE email = ?").get(student.email);
      if (studentUser) {
        notifyStmt.run(studentUser.id, `New assignment: ${title} for subject ${subject_id}. Due: ${due_date}`, new Date().toISOString());
      }
    }
  }

  res.json({ id: assignmentId });
});

app.get("/api/teacher/assignments", authenticate, (req: any, res) => {
  const assignments = db.prepare(`
    SELECT a.*, s.name as subject_name,
    (SELECT COUNT(*) FROM submissions WHERE assignment_id = a.id) as submission_count
    FROM assignments a 
    JOIN subjects s ON a.subject_id = s.id 
    WHERE a.teacher_id = ?
  `).all(req.user.id);
  res.json(assignments);
});

app.get("/api/teacher/submissions/:assignmentId", authenticate, (req: any, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: "Forbidden" });
  const submissions = db.prepare(`
    SELECT s.*, u.name as student_name, u.email as student_email, u.roll_no
    FROM submissions s
    JOIN users u ON s.student_id = u.id
    WHERE s.assignment_id = ?
  `).all(req.params.assignmentId);
  res.json(submissions);
});

app.get("/api/teacher/submission/:submissionId", authenticate, (req: any, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: "Forbidden" });
  const submission = db.prepare(`
    SELECT s.*, u.name as student_name, u.email as student_email, u.roll_no, a.title as assignment_title, a.questions
    FROM submissions s
    JOIN users u ON s.student_id = u.id
    JOIN assignments a ON s.assignment_id = a.id
    WHERE s.id = ?
  `).get(req.params.submissionId);
  res.json(submission);
});

app.get("/api/teacher/reports/:assignmentId", authenticate, (req: any, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: "Forbidden" });
  const assignmentId = req.params.assignmentId;
  
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_submissions,
      AVG(ai_score) as average_score,
      MAX(ai_score) as max_score,
      MIN(ai_score) as min_score
    FROM submissions 
    WHERE assignment_id = ? AND status = 'evaluated'
  `).get(assignmentId) as any;

  const studentPerformance = db.prepare(`
    SELECT u.name, u.roll_no, s.ai_score, s.submitted_at
    FROM submissions s
    JOIN users u ON s.student_id = u.id
    WHERE s.assignment_id = ? AND s.status = 'evaluated'
    ORDER BY s.ai_score DESC
  `).all(assignmentId);

  res.json({ stats, studentPerformance });
});

// --- STUDENT ROUTES ---
app.get("/api/student/assignments", authenticate, (req: any, res) => {
  const assignments = db.prepare(`
    SELECT a.*, s.name as subject_name,
    sub.status as submission_status,
    sub.ai_score,
    sub.ai_feedback,
    sub.teacher_feedback
    FROM assignments a 
    JOIN subjects s ON a.subject_id = s.id
    JOIN student_lists sl ON a.id = sl.assignment_id
    LEFT JOIN submissions sub ON a.id = sub.assignment_id AND sub.student_id = (SELECT id FROM users WHERE email = ?)
    WHERE sl.student_email = ?
  `).all(req.user.email, req.user.email);
  res.json(assignments);
});

app.post("/api/student/submit", authenticate, (req: any, res) => {
  const { assignment_id, answers } = req.body;
  
  // Check for existing submission
  const existing = db.prepare("SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?").get(assignment_id, req.user.id);
  if (existing) {
    return res.status(400).json({ error: "You have already submitted this assignment." });
  }

  const result = db.prepare("INSERT INTO submissions (assignment_id, student_id, answers, submitted_at) VALUES (?, ?, ?, ?)")
    .run(assignment_id, req.user.id, JSON.stringify(answers), new Date().toISOString());
  res.json({ id: result.lastInsertRowid });
});

app.get("/api/notifications", authenticate, (req: any, res) => {
  const notifications = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json(notifications);
});

// --- AI EVALUATION ---
async function evaluateAssignment(assignmentId: number) {
  const assignment: any = db.prepare("SELECT * FROM assignments WHERE id = ?").get(assignmentId);
  const submissions = db.prepare("SELECT * FROM submissions WHERE assignment_id = ? AND status = 'pending'").all(assignmentId);
  
  if (!assignment) return;
  
  if ((submissions as any[]).length === 0) {
    db.prepare("UPDATE assignments SET is_evaluated = 1 WHERE id = ?").run(assignmentId);
    return;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const model = "gemini-3-flash-preview";

  console.log(`Starting advanced evaluation for assignment ${assignmentId}...`);

  for (const sub of submissions as any[]) {
    const studentAnswers = JSON.parse(sub.answers);
    const teacherKey = JSON.parse(assignment.answer_key);
    const questions = JSON.parse(assignment.questions);

    const individualPrompt = `
      You are an Intelligent Assignment Evaluator. Evaluate this student submission strictly based on the provided rubric and answer key.
      
      Assignment Details:
      Questions: ${JSON.stringify(questions)}
      Teacher Answer Key: ${JSON.stringify(teacherKey)}
      Student Answers: ${JSON.stringify(studentAnswers)}

      Evaluation Requirements:
      1. Subjective Answers: Use semantic similarity and concept detection.
      2. Coding Questions: Evaluate logic, efficiency, and correctness. Allow multiple valid approaches.
      3. Concept Tagging: Identify concepts for each answer (e.g., "definition", "application", "logic").
      4. Confidence Calculation: 
         Confidence = (SimilarityScore * 0.4) + (RubricCoverage * 0.4) + (ModelCertainty * 0.2)
         SimilarityScore: How close the answer is to the key (0-1).
         RubricCoverage: Percentage of required points addressed (0-1).
         ModelCertainty: Your own certainty in this evaluation (0-1).

      Return the result in JSON format:
      {
        "total_score": number (0-100),
        "confidence_score": number (0-1),
        "feedback": "string",
        "metadata": {
          "concept_tags": ["string"],
          "rubric_breakdown": [{"question_id": number, "score": number, "feedback": "string"}],
          "mistake_category": "string (short label for clustering)"
        }
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: individualPrompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || "{}");
      
      db.prepare(`
        UPDATE submissions 
        SET ai_score = ?, ai_confidence = ?, ai_feedback = ?, ai_metadata = ?, mistake_cluster = ?, status = 'evaluated' 
        WHERE id = ?
      `).run(
        result.total_score || 0, 
        result.confidence_score || 0, 
        result.feedback || "No feedback generated", 
        JSON.stringify(result.metadata || {}),
        result.metadata?.mistake_category || "General",
        sub.id
      );
    } catch (err) {
      console.error(`Error evaluating submission ${sub.id}:`, err);
    }
  }

  // Second Pass: Class-level Summary and Mistake Clustering
  const allSubmissions = db.prepare("SELECT ai_score, ai_feedback, mistake_cluster FROM submissions WHERE assignment_id = ?").all(assignmentId);
  
  const summaryPrompt = `
    You are a Senior ML Architect. Analyze these student evaluations for a class-level summary.
    
    Submissions Data:
    ${JSON.stringify(allSubmissions)}

    Requirements:
    1. Identify common error patterns (Mistake Clustering).
    2. Generate a class-level performance summary.
    3. Identify concepts that the class struggled with most.
    4. Provide recommendations for the teacher.

    Return the result in JSON format:
    {
      "class_summary": "string",
      "common_mistakes": [
        {"pattern": "string", "frequency": number, "recommendation": "string"}
      ],
      "struggled_concepts": ["string"]
    }
  `;

  try {
    const summaryResponse = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: summaryPrompt }] }],
      config: { responseMimeType: "application/json" }
    });

    const summaryResult = JSON.parse(summaryResponse.text || "{}");
    
    db.prepare("UPDATE assignments SET ai_summary = ?, common_mistakes = ?, is_evaluated = 1 WHERE id = ?")
      .run(summaryResult.class_summary, JSON.stringify(summaryResult.common_mistakes), assignmentId);
    
    console.log(`Advanced evaluation completed for assignment ${assignmentId}.`);
  } catch (err) {
    console.error(`Error generating class summary for assignment ${assignmentId}:`, err);
    db.prepare("UPDATE assignments SET is_evaluated = 1 WHERE id = ?").run(assignmentId);
  }
}

// Background task to check for expired assignments
setInterval(async () => {
  try {
    const now = new Date().toISOString();
    const expiredAssignments = db.prepare("SELECT id FROM assignments WHERE due_date < ? AND is_evaluated = 0").all();
    
    for (const a of expiredAssignments as any[]) {
      console.log(`Auto-evaluating assignment ${a.id}...`);
      await evaluateAssignment(a.id);
    }
  } catch (err) {
    console.error("Background task error:", err);
  }
}, 60000); // Check every minute

app.post("/api/teacher/evaluate/:assignmentId", authenticate, async (req: any, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: "Forbidden" });
  const { assignmentId } = req.params;
  
  // Reset status to pending for re-evaluation if requested
  db.prepare("UPDATE submissions SET status = 'pending' WHERE assignment_id = ? AND status != 'approved'").run(assignmentId);
  
  evaluateAssignment(parseInt(assignmentId)); // Run in background
  res.json({ message: "Advanced AI evaluation triggered. This may take a minute." });
});

app.post("/api/teacher/approve-evaluation/:submissionId", authenticate, (req: any, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: "Forbidden" });
  const { submissionId } = req.params;
  const { score, feedback } = req.body;
  
  db.prepare("UPDATE submissions SET ai_score = ?, teacher_feedback = ?, status = 'approved' WHERE id = ?")
    .run(score, feedback, submissionId);
  
  res.json({ message: "Evaluation approved and published." });
});

app.get("/api/teacher/analytics/:assignmentId", authenticate, (req: any, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: "Forbidden" });
  const assignment = db.prepare("SELECT ai_summary, common_mistakes FROM assignments WHERE id = ?").get(req.params.assignmentId);
  res.json(assignment);
});

// API 404 Handler
app.use("/api", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Global error handler:", err);
  res.status(500).json({ error: "Internal server error: " + (err.message || "Unknown error") });
});

// --- VITE MIDDLEWARE ---
async function startServer() {
  console.log("Setting up server...");
  
  // Start listening immediately so API routes are available while Vite boots
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite middleware...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware ready.");
    } catch (err) {
      console.error("Vite initialization failed:", err);
    }
  } else {
    app.use(express.static("dist"));
  }
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
