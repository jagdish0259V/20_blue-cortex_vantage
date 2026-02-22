# Vantage - Quick Start Guide

## 🚀 Start Everything with One Command

### **Option 1: Batch File (Windows CMD)**
```bash
start-all.bat
```

This will open 2 new terminal windows:
- **Window 1**: AI Service on `http://localhost:8000`
- **Window 2**: Frontend on `http://localhost:3000`

### **Option 2: PowerShell**
```powershell
.\start-all.ps1
```

### **Option 3: Manual (Separate Terminals)**

**Terminal 1 - AI Service:**
```powershell
cd C:\Users\jagdi\OneDrive\Desktop\VANTAGE\ai-service
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Frontend:**
```powershell
cd C:\Users\jagdi\OneDrive\Desktop\VANTAGE\Vantiage frontend
npm run dev
```

---

## 📋 Prerequisites

Before running, ensure you have:

1. **Python 3.8+** installed
2. **Node.js 16+** installed
3. **MongoDB** running (optional, falls back to SQLite)
   ```powershell
   mongod
   ```

---

## 🌐 Access the Application

Once started:
- **Frontend**: http://localhost:3000
- **AI Service Health**: http://localhost:8000/api/health
- **AI Evaluation Endpoint**: http://localhost:8000/api/evaluate (POST)

---

## 🔧 Project Structure

```
VANTAGE/
├── ai-service/              # Python FastAPI service
│   ├── app/
│   │   ├── main.py         # FastAPI app with CORS
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   └── models/         # ML models
│   └── requirements.txt     # Python dependencies
│
├── Vantiage frontend/        # React + TypeScript frontend
│   ├── src/
│   │   ├── lib/
│   │   │   └── aiService.ts # AI Service client
│   │   ├── components/
│   │   └── App.tsx
│   ├── server.ts            # Express + Vite server
│   ├── .env                 # Configuration
│   └── package.json
│
├── start-all.bat            # Windows batch file
├── start-all.ps1            # PowerShell script
└── README.md
```

---

## 📡 API Integration

The frontend communicates with the AI service via the client in `src/lib/aiService.ts`:

```typescript
import { evaluateAnswer } from '@/lib/aiService';

const result = await evaluateAnswer({
  student_answer: "Paris",
  question: "What is the capital of France?",
  answer_key: "Paris"
});

console.log(result.score, result.feedback);
```

---

## 🛑 Stopping Services

Simply close the terminal windows where the services are running, or press `Ctrl+C`.

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000 in use | `netstat -ano \| findstr :3000` then kill process |
| Port 8000 in use | `netstat -ano \| findstr :8000` then kill process |
| MongoDB not found | Comment out `MONGODB_URI` in `.env` to use SQLite |
| CORS errors | Ensure AI service is running before frontend |

---

## 📚 Environment Variables

### Frontend `.env`
```env
GEMINI_API_KEY=your_key_here
JWT_SECRET=your_secret
MONGODB_URI=mongodb://localhost:27017/vantage
VITE_AI_SERVICE_URL=http://localhost:8000
```

### AI Service (uses Python environment variables)
Same variables as frontend, configured in `.env`

