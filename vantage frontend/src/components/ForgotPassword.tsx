import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Mail, ArrowLeft, BookOpen, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-black text-dark-navy tracking-tighter">Forgot Password</h1>
          <p className="text-xs font-bold text-dark-navy/40 uppercase tracking-widest mt-2">We'll help you get back in</p>
        </div>

        {message ? (
          <div className="text-center space-y-6">
            <div className="inline-flex p-4 bg-emerald-50 text-emerald-600 rounded-full">
              <CheckCircle className="w-12 h-12" />
            </div>
            <p className="text-sm font-medium text-dark-navy/70 leading-relaxed">
              {message}
            </p>
            <Link 
              to="/login" 
              className="block w-full py-4 bg-dark-navy text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-dark-navy/20 hover:bg-primary-blue transition-all"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <>
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

              <button 
                disabled={loading}
                className="w-full bg-dark-navy text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-dark-navy/20 hover:bg-primary-blue hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>

            <p className="text-center mt-10 text-xs font-bold text-dark-navy/40 uppercase tracking-widest">
              Remember your password? <Link to="/login" className="text-primary-red font-black hover:underline flex items-center justify-center gap-1 mt-2">
                <ArrowLeft className="w-3 h-3" /> Back to Login
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
