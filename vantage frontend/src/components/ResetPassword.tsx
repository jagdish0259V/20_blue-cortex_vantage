import { useState, FormEvent, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { Lock, BookOpen, CheckCircle, AlertCircle } from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new one.");
    }
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setTimeout(() => navigate("/login"), 3000);
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
          <h1 className="text-3xl font-black text-dark-navy tracking-tighter">Reset Password</h1>
          <p className="text-xs font-bold text-dark-navy/40 uppercase tracking-widest mt-2">Create a new secure password</p>
        </div>

        {message ? (
          <div className="text-center space-y-6">
            <div className="inline-flex p-4 bg-emerald-50 text-emerald-600 rounded-full">
              <CheckCircle className="w-12 h-12" />
            </div>
            <p className="text-sm font-medium text-dark-navy/70 leading-relaxed">
              {message} Redirecting to login...
            </p>
          </div>
        ) : (
          <>
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-primary-red/5 text-primary-red p-4 rounded-2xl text-xs font-bold mb-8 border border-primary-red/10 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            {!token ? (
              <Link 
                to="/forgot-password" 
                className="block w-full py-4 bg-dark-navy text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-dark-navy/20 hover:bg-primary-blue transition-all text-center"
              >
                Request New Link
              </Link>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">New Password</label>
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
                  <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">Confirm New Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-navy/30 group-focus-within:text-primary-blue transition-colors" />
                    <input 
                      type="password" 
                      required
                      className="w-full pl-12 pr-4 py-3.5 bg-bg-light border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue/20 font-bold text-sm transition-all"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  disabled={loading}
                  className="w-full bg-dark-navy text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-dark-navy/20 hover:bg-primary-blue hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
