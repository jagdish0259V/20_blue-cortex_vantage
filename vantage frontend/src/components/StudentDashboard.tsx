import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Clock, FileText, CheckCircle, AlertCircle, ArrowRight, Award, TrendingUp, BookOpen } from "lucide-react";

export default function StudentDashboard() {
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    const fetchAssignments = async () => {
      const res = await fetch("/api/student/assignments", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) setAssignments(await res.json());
    };
    fetchAssignments();
  }, []);

  const stats = [
    { label: "Completed", value: assignments.filter(a => a.submission_status === 'approved').length, icon: CheckCircle, color: "text-emerald-500" },
    { label: "Pending AI", value: assignments.filter(a => a.submission_status === 'pending' || a.submission_status === 'evaluated').length, icon: Clock, color: "text-amber-500" },
    { label: "Available", value: assignments.filter(a => !a.submission_status).length, icon: BookOpen, color: "text-primary-blue" },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-dark-navy tracking-tighter">Student Dashboard</h1>
          <p className="text-sm font-bold text-dark-navy/40 uppercase tracking-widest mt-2">Track your progress and feedback</p>
        </div>
        <div className="flex gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="px-6 py-3 bg-white rounded-2xl border border-dark-navy/5 shadow-sm flex items-center gap-3">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <div>
                <div className="text-lg font-black text-dark-navy leading-none">{stat.value}</div>
                <div className="text-[10px] font-bold text-dark-navy/40 uppercase tracking-widest">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {assignments.length === 0 ? (
          <div className="col-span-full text-center py-32 bg-white rounded-[40px] border border-dark-navy/5 shadow-sm">
            <div className="inline-flex p-6 bg-bg-light text-dark-navy/20 rounded-full mb-6">
              <FileText className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black text-dark-navy">No Assignments Yet</h3>
            <p className="text-dark-navy/40 font-bold uppercase tracking-widest text-xs mt-2">Your teacher hasn't assigned anything to you</p>
          </div>
        ) : (
          assignments.map((a, idx) => (
            <motion.div 
              key={a.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-8 rounded-[32px] border border-dark-navy/5 shadow-sm hover:shadow-2xl hover:shadow-primary-blue/5 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-bg-light rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="p-4 bg-accent-blue/20 text-primary-blue rounded-2xl group-hover:bg-primary-blue group-hover:text-white transition-all">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-black text-dark-navy/40 bg-bg-light px-3 py-1.5 rounded-full uppercase tracking-widest">
                  <Clock className="w-3.5 h-3.5" />
                  {a.duration} Mins
                </div>
              </div>

              <div className="relative z-10">
                <h3 className="font-black text-xl text-dark-navy mb-1 group-hover:text-primary-blue transition-colors">{a.title}</h3>
                <p className="text-[10px] font-black text-dark-navy/30 uppercase tracking-widest mb-6">{a.subject_name}</p>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-xs font-bold text-dark-navy/60">
                    <div className="p-1.5 bg-amber-50 text-amber-500 rounded-lg"><AlertCircle className="w-4 h-4" /></div>
                    <span>Due: {new Date(a.due_date).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-dark-navy/60">
                    <div className={`p-1.5 rounded-lg ${a.submission_status ? 'bg-emerald-50 text-emerald-500' : 'bg-zinc-50 text-zinc-300'}`}>
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <span>
                      {
                        !a.submission_status ? 'Available for Submission' :
                        a.submission_status === 'pending' ? 'Submitted (Awaiting AI)' :
                        a.submission_status === 'evaluating' ? 'AI Evaluating...' :
                        a.submission_status === 'evaluated' ? 'Awaiting Teacher Review' :
                        'Feedback Published'
                      }
                    </span>
                  </div>
                </div>

                {a.submission_status === 'approved' ? (
                  <div className="space-y-4 pt-4 border-t border-dark-navy/5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-dark-navy/30 uppercase tracking-widest">Your Score</span>
                      <div className="text-2xl font-black text-primary-blue">{a.ai_score}<span className="text-xs opacity-30">/100</span></div>
                    </div>
                    <div className="p-4 bg-bg-light rounded-2xl border border-dark-navy/5 text-xs font-medium text-dark-navy/70 leading-relaxed line-clamp-2">
                      {a.teacher_feedback || a.ai_feedback}
                    </div>
                    <button className="w-full py-3 bg-dark-navy text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-blue transition-all">
                      View Detailed Feedback
                    </button>
                  </div>
                ) : a.submission_status ? (
                  <div className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Submission Received
                  </div>
                ) : (
                  <Link 
                    to={`/assignment/${a.id}`}
                    className="w-full py-4 bg-primary-red text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-primary-red/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Start Assignment
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
