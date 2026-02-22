import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { UserPlus, Mail, Lock, User as UserIcon, ShieldCheck, BookOpen } from "lucide-react";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [studentId, setStudentId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          password, 
          name, 
          role,
          roll_no: role === 'student' ? rollNo : undefined,
          student_id: role === 'student' ? studentId : undefined,
          teacher_id: role === 'teacher' ? teacherId : undefined
        })
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (res.ok) {
          if (role === 'teacher') {
            setMessage(data.message);
          } else {
            navigate("/login");
          }
        } else {
          setError(data.error || `Registration failed (${res.status})`);
        }
      } else {
        const text = await res.text();
        setError(`Server error (${res.status}). Response was not JSON.`);
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
    }
  };

  return (
    <div className="min-h-screen bg-bg-light flex items-center justify-center p-4 py-20">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md p-10 rounded-[40px] shadow-2xl shadow-dark-navy/5 border border-dark-navy/5"
      >
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-primary-red text-white rounded-2xl mb-6 shadow-xl shadow-primary-red/20">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-dark-navy tracking-tighter">Join Vantage</h1>
          <p className="text-xs font-bold text-dark-navy/40 uppercase tracking-widest mt-2">Create your analytics account</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-primary-red/5 text-primary-red p-4 rounded-2xl text-xs font-bold mb-8 border border-primary-red/10"
          >
            {error}
          </motion.div>
        )}
        {message && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-xs font-bold mb-8 border border-emerald-100"
          >
            {message}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">Full Name</label>
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-navy/30 group-focus-within:text-primary-blue transition-colors" />
              <input 
                type="text" 
                required
                className="w-full pl-12 pr-4 py-3.5 bg-bg-light border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue/20 font-bold text-sm transition-all"
                placeholder="John Doe"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-navy/30 group-focus-within:text-primary-blue transition-colors" />
              <input 
                type="email" 
                required
                className="w-full pl-12 pr-4 py-3.5 bg-bg-light border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue/20 font-bold text-sm transition-all"
                placeholder="you@school.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-navy/30 group-focus-within:text-primary-blue transition-colors" />
              <input 
                type="password" 
                required
                className="w-full pl-12 pr-4 py-3.5 bg-bg-light border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue/20 font-bold text-sm transition-all"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">I am a...</label>
            <div className="grid grid-cols-2 gap-3">
              {['student', 'teacher'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl border-2 transition-all ${
                    role === r 
                    ? 'bg-dark-navy text-white border-dark-navy shadow-lg shadow-dark-navy/20' 
                    : 'bg-white text-dark-navy/40 border-dark-navy/5 hover:border-dark-navy/10'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {role === 'student' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">Roll Number</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-3.5 bg-bg-light border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue/20 font-bold text-sm transition-all"
                  placeholder="e.g. 2024CS01"
                  value={rollNo}
                  onChange={e => setRollNo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">Student ID</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-3.5 bg-bg-light border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue/20 font-bold text-sm transition-all"
                  placeholder="e.g. ID123456"
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                />
              </div>
            </motion.div>
          )}

          {role === 'teacher' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">Teacher ID</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-3.5 bg-bg-light border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue/20 font-bold text-sm transition-all"
                  placeholder="e.g. TCH123456"
                  value={teacherId}
                  onChange={e => setTeacherId(e.target.value)}
                />
              </div>
            </motion.div>
          )}

          <button className="w-full bg-dark-navy text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-dark-navy/20 hover:bg-primary-blue hover:scale-[1.02] active:scale-95 transition-all">
            Create Account
          </button>
        </form>

        <p className="text-center mt-10 text-xs font-bold text-dark-navy/40 uppercase tracking-widest">
          Already have an account? <Link to="/login" className="text-primary-red font-black hover:underline">Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
}
