import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { LogIn, Mail, Lock, BookOpen } from "lucide-react";

export default function Login({ setUser }: { setUser: (user: any) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          setUser(data.user);
          navigate("/");
        } else {
          setError(data.error || `Login failed (${res.status})`);
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
    <div className="min-h-screen bg-bg-light flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md p-10 rounded-[40px] shadow-2xl shadow-dark-navy/5 border border-dark-navy/5"
      >
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-primary-red text-white rounded-2xl mb-6 shadow-xl shadow-primary-red/20">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-dark-navy tracking-tighter">Vantage</h1>
          <p className="text-xs font-bold text-dark-navy/40 uppercase tracking-widest mt-2">Intelligent Assignment Feedback</p>
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

        <form onSubmit={handleSubmit} className="space-y-6">
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
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest">Password</label>
              <Link to="/forgot-password" title="Forgot Password" className="text-[10px] font-black text-primary-red uppercase tracking-widest hover:underline">Forgot?</Link>
            </div>
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

          <button className="w-full bg-dark-navy text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-dark-navy/20 hover:bg-primary-blue hover:scale-[1.02] active:scale-95 transition-all">
            Sign In to Dashboard
          </button>
        </form>

        <p className="text-center mt-10 text-xs font-bold text-dark-navy/40 uppercase tracking-widest">
          Don't have an account? <Link to="/register" className="text-primary-red font-black hover:underline">Sign Up</Link>
        </p>
      </motion.div>
    </div>
  );
}
