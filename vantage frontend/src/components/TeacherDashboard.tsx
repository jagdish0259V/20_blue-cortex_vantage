import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from 'xlsx';
import { 
  Plus, Book, FileText, Users, Send, CheckCircle, AlertCircle, 
  Loader2, Eye, X, ChevronRight, User, BarChart3, TrendingUp, 
  Award, Clock, Search, Filter, MoreVertical, ArrowUpRight, ArrowDownRight,
  Download
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";

export default function TeacherDashboard() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [selectedSubject, setSelectedSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState([{ text: "", type: "subjective" }]);
  const [answerKey, setAnswerKey] = useState<any>({});
  const [dueDate, setDueDate] = useState("");
  const [duration, setDuration] = useState(60);
  const [studentListRaw, setStudentListRaw] = useState("");

  // Submissions State
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);

  // Reports State
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState<any>({
    totalAssignments: 0,
    totalStudents: 0,
    activeSubmissions: 0,
    aiConfidenceRate: 0
  });

  // Filter & Sort State
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // View State
  const [activeTab, setActiveTab] = useState("Overview");

  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/subjects") setActiveTab("Subjects");
    else if (path === "/assignments") setActiveTab("Assignments");
    else if (path === "/reports") setActiveTab("Reports");
    else if (path === "/analytics") setActiveTab("Analytics");
    else setActiveTab("Overview");
    
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [window.location.pathname]);

  const [reportLoading, setReportLoading] = useState(false);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    const [subRes, assignRes, statsRes] = await Promise.all([
      fetch("/api/teacher/subjects", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/teacher/assignments", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/teacher/stats", { headers: { Authorization: `Bearer ${token}` } })
    ]);
    if (subRes.ok) setSubjects(await subRes.json());
    if (assignRes.ok) setAssignments(await assignRes.json());
    if (statsRes.ok) setDashboardStats(await statsRes.json());
  };

  const handleAddSubject = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/teacher/subjects", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ name: newSubject })
    });
    if (res.ok) {
      setNewSubject("");
      fetchData();
    }
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, { text: "", type: "subjective" }]);
  };

  const handleCreateAssignment = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const student_list = studentListRaw.split("\n").filter(line => line.trim()).map(line => {
      const [email, roll_no, school_id] = line.split(",").map(s => s.trim());
      return { email, roll_no, school_id };
    });

    const res = await fetch("/api/teacher/assignments", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({
        subject_id: selectedSubject,
        title,
        description,
        questions,
        answer_key: answerKey,
        due_date: dueDate,
        duration,
        student_list
      })
    });

    if (res.ok) {
      setShowAssignmentForm(false);
      setTitle("");
      setDescription("");
      setQuestions([{ text: "", type: "subjective" }]);
      setAnswerKey({});
      setDueDate("");
      setStudentListRaw("");
      fetchData();
    }
    setLoading(false);
  };

  const viewSubmissions = async (assignment: any) => {
    setSelectedAssignment(assignment);
    const res = await fetch(`/api/teacher/submissions/${assignment.id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    if (res.ok) {
      setSubmissions(await res.json());
    }
  };

  const viewSubmissionDetail = async (submissionId: number) => {
    const res = await fetch(`/api/teacher/submission/${submissionId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    if (res.ok) {
      setSelectedSubmission(await res.json());
    }
  };

  const viewReport = async (assignment: any) => {
    const token = localStorage.getItem("token");
    setReportLoading(true);
    try {
      const [reportRes, analyticsRes] = await Promise.all([
        fetch(`/api/teacher/reports/${assignment.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/teacher/analytics/${assignment.id}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const reportData = reportRes.ok ? await reportRes.json() : null;
      const analyticsData = analyticsRes.ok ? await analyticsRes.json() : {};
      
      if (reportData) {
        setSelectedReport({ ...reportData, ...analyticsData, assignment });
      } else {
        alert("Failed to load report data. Make sure submissions exist.");
      }
    } catch (err) {
      console.error("Error loading report:", err);
      alert("An error occurred while loading the report.");
    } finally {
      setReportLoading(false);
    }
  };

  const handleApproveEvaluation = async (submissionId: number, score: number, feedback: string) => {
    const res = await fetch(`/api/teacher/approve-evaluation/${submissionId}`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ score, feedback })
    });
    if (res.ok) {
      setSelectedSubmission(null);
      if (selectedAssignment) viewSubmissions(selectedAssignment);
    }
  };

  const handleTriggerEvaluation = async (assignmentId: number) => {
    const res = await fetch(`/api/teacher/evaluate/${assignmentId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    if (res.ok) {
      alert("Advanced AI evaluation triggered. Please wait a moment for results.");
      fetchData();
    }
  };

  const exportToExcel = (report: any) => {
    console.log("[EXPORT] Starting export for report:", report?.assignment?.title);
    if (!report || !report.studentPerformance || report.studentPerformance.length === 0) {
      console.warn("[EXPORT] No data to export", report);
      alert("No submission data available to export.");
      return;
    }

    try {
      const data = report.studentPerformance.map((s: any) => ({
        'Student Name': s.name,
        'Roll No': s.roll_no,
        'Score': s.ai_score || 0,
        'Status': s.status,
        'Auto-Submit Reason': s.auto_submit_reason || 'N/A',
        'Submitted At': s.submitted_at ? new Date(s.submitted_at).toLocaleString() : 'N/A',
        'AI Feedback': s.ai_feedback || 'N/A',
        'Teacher Feedback': s.teacher_feedback || 'N/A'
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Submissions");
      
      const fileName = `${(report.assignment?.title || 'Report').replace(/[^a-z0-9]/gi, '_')}_Report.xlsx`;
      
      // Use a more robust download method for iframe environments
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      // Delay cleanup to ensure download starts
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      console.log("[EXPORT] Export triggered successfully");
    } catch (err) {
      console.error("[EXPORT] Export failed:", err);
      alert("Failed to export Excel file. Please try again.");
    }
  };

  const filteredAssignments = assignments
    .filter(a => {
      const isExpired = new Date(a.due_date) < new Date();
      if (statusFilter === "pending") return !isExpired && !a.is_evaluated;
      if (statusFilter === "completed") return a.is_evaluated === 1;
      if (statusFilter === "overdue") return isExpired && !a.is_evaluated;
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at || a.id).getTime();
      const dateB = new Date(b.created_at || b.id).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

  // Mock data for charts
  const trendData = [
    { name: "Mon", submissions: 12 },
    { name: "Tue", submissions: 19 },
    { name: "Wed", submissions: 15 },
    { name: "Thu", submissions: 22 },
    { name: "Fri", submissions: 30 },
    { name: "Sat", submissions: 10 },
    { name: "Sun", submissions: 8 },
  ];

  const distributionData = [
    { name: "A (90-100)", value: 15 },
    { name: "B (80-89)", value: 25 },
    { name: "C (70-79)", value: 35 },
    { name: "D (60-69)", value: 15 },
    { name: "F (<60)", value: 10 },
  ];

  const COLORS = ["#1D3557", "#457B9D", "#A8DADC", "#E63946", "#F1FAEE"];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {activeTab === "Overview" && (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Total Assignments", value: dashboardStats.totalAssignments, icon: FileText, trend: "+12%", up: true },
              { label: "Total Students", value: dashboardStats.totalStudents, icon: Users, trend: "+4%", up: true },
              { label: "Active Submissions", value: dashboardStats.activeSubmissions, icon: Send, trend: "-2%", up: false },
              { label: "AI Confidence Rate", value: `${dashboardStats.aiConfidenceRate}%`, icon: TrendingUp, trend: "+1.2%", up: true },
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-3xl bg-gradient-to-br from-primary-blue to-dark-navy text-white shadow-xl shadow-primary-blue/10 relative overflow-hidden group"
              >
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                    <stat.icon className="w-6 h-6 text-accent-blue" />
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${stat.up ? 'bg-emerald-400/20 text-emerald-400' : 'bg-primary-red/20 text-primary-red'}`}>
                    {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {stat.trend}
                  </div>
                </div>
                <div className="text-3xl font-black mb-1">{stat.value}</div>
                <div className="text-xs font-bold text-white/60 uppercase tracking-widest">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Analytics Section */}
            <div className="lg:col-span-2 space-y-8">
              <section className="bg-white p-8 rounded-[32px] border border-dark-navy/5 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-xl font-black text-dark-navy tracking-tight">Submission Trends</h2>
                    <p className="text-xs font-bold text-dark-navy/40 uppercase tracking-widest mt-1">Weekly activity overview</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-bg-light rounded-xl transition-colors"><MoreVertical className="w-5 h-5 text-dark-navy/40" /></button>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#457B9D" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#457B9D" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1FAEE" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 700, fill: "#1D3557", opacity: 0.4 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 700, fill: "#1D3557", opacity: 0.4 }}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="submissions" stroke="#457B9D" strokeWidth={4} fillOpacity={1} fill="url(#colorSub)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="bg-white p-8 rounded-[32px] border border-dark-navy/5 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black text-dark-navy tracking-tight">Recent Assignments</h2>
                  <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-bg-light rounded-xl text-xs font-bold text-dark-navy/60 hover:bg-accent-blue/20 transition-all">
                      <Filter className="w-4 h-4" /> Filter
                    </button>
                    <button 
                      onClick={() => setShowAssignmentForm(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-red text-white rounded-xl text-xs font-bold shadow-lg shadow-primary-red/20 hover:scale-105 transition-all"
                    >
                      <Plus className="w-4 h-4" /> Create New
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {filteredAssignments.map((a, i) => {
                    const isExpired = new Date(a.due_date) < new Date();
                    return (
                      <motion.div 
                        key={a.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group p-5 bg-white border border-dark-navy/5 rounded-2xl hover:border-primary-blue/30 hover:shadow-xl hover:shadow-primary-blue/5 transition-all cursor-pointer"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-accent-blue/20 flex items-center justify-center group-hover:bg-primary-blue group-hover:text-white transition-all" onClick={() => viewSubmissions(a)}>
                              <FileText className="w-6 h-6" />
                            </div>
                            <div onClick={() => viewSubmissions(a)}>
                              <h3 className="font-bold text-dark-navy">{a.title}</h3>
                              <p className="text-[10px] font-black text-dark-navy/30 uppercase tracking-widest">{a.subject_name} • {a.submission_count} Submissions</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <button 
                              disabled={reportLoading}
                              onClick={() => viewReport(a)}
                              className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors flex items-center gap-2"
                            >
                              {reportLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                              Report
                            </button>
                            {!a.is_evaluated && (
                              <button 
                                onClick={() => handleTriggerEvaluation(a.id)}
                                className="px-4 py-2 bg-primary-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-dark-navy transition-colors"
                              >
                                Evaluate
                              </button>
                            )}
                            <button onClick={() => viewSubmissions(a)} className="p-2 hover:bg-bg-light rounded-xl transition-colors">
                              <ChevronRight className="w-5 h-5 text-dark-navy/20" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Sidebar Analytics */}
            <div className="space-y-8">
              <section className="bg-white p-8 rounded-[32px] border border-dark-navy/5 shadow-sm">
                <h2 className="text-xl font-black text-dark-navy tracking-tight mb-6">Performance</h2>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 space-y-3">
                  {distributionData.map((d, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        <span className="text-[10px] font-bold text-dark-navy/60 uppercase">{d.name}</span>
                      </div>
                      <span className="text-xs font-black text-dark-navy">{d.value}%</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-dark-navy text-white p-8 rounded-[32px] shadow-2xl shadow-dark-navy/20">
                <h2 className="text-xl font-black tracking-tight mb-6">Class Summary</h2>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Avg. Confidence</span>
                      <span className="text-xs font-black text-accent-blue">92%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-blue rounded-full" style={{ width: '92%' }} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Common Mistakes</h3>
                    {[
                      "Variable Scope Issues",
                      "Async/Await Logic",
                      "Array Methods Usage"
                    ].map((m, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                        <div className="w-2 h-2 rounded-full bg-primary-red" />
                        <span className="text-xs font-bold text-white/80">{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      {activeTab === "Subjects" && (
        <div className="space-y-8">
          <header className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black text-dark-navy tracking-tighter">Subject Management</h2>
              <p className="text-xs font-bold text-dark-navy/40 uppercase tracking-widest mt-1">Organize your curriculum</p>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <section className="md:col-span-1 bg-white p-8 rounded-[32px] border border-dark-navy/5 shadow-sm h-fit">
              <h3 className="text-lg font-black text-dark-navy mb-6">Add New Subject</h3>
              <form onSubmit={handleAddSubject} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">Subject Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Computer Science"
                    className="w-full px-4 py-3 bg-bg-light border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue/20 font-bold text-sm"
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value)}
                  />
                </div>
                <button className="w-full py-4 bg-primary-blue text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary-blue/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Subject
                </button>
              </form>
            </section>

            <section className="md:col-span-2 bg-white p-8 rounded-[32px] border border-dark-navy/5 shadow-sm">
              <h3 className="text-lg font-black text-dark-navy mb-6">Your Subjects</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {subjects.length === 0 ? (
                  <div className="col-span-full py-20 text-center text-dark-navy/20 font-black uppercase tracking-widest">No subjects created yet</div>
                ) : (
                  subjects.map((s, i) => (
                    <motion.div 
                      key={s.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-6 bg-bg-light rounded-3xl border border-dark-navy/5 flex items-center justify-between group hover:bg-white hover:shadow-xl hover:shadow-dark-navy/5 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary-blue text-white rounded-xl flex items-center justify-center font-black">
                          {s.name.charAt(0)}
                        </div>
                        <span className="font-bold text-dark-navy">{s.name}</span>
                      </div>
                      <div className="text-[10px] font-black text-dark-navy/20 uppercase tracking-widest">
                        {assignments.filter(a => a.subject_id === s.id).length} Assignments
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === "Reports" && (
        <div className="space-y-8">
          <header>
            <h2 className="text-3xl font-black text-dark-navy tracking-tighter">Performance Reports</h2>
            <p className="text-xs font-bold text-dark-navy/40 uppercase tracking-widest mt-1">Detailed evaluation analytics per assignment</p>
          </header>

          <div className="grid grid-cols-1 gap-4">
            {assignments.length === 0 ? (
              <div className="py-20 text-center text-dark-navy/20 font-black uppercase tracking-widest bg-white rounded-[32px] border border-dark-navy/5">No assignments found</div>
            ) : (
              assignments.map((a, i) => (
                <motion.div 
                  key={a.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-6 bg-white rounded-3xl border border-dark-navy/5 flex items-center justify-between hover:shadow-xl hover:shadow-dark-navy/5 transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-bg-light rounded-2xl flex items-center justify-center">
                      <BarChart3 className="w-7 h-7 text-primary-blue" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-dark-navy">{a.title}</h3>
                      <p className="text-[10px] font-black text-dark-navy/30 uppercase tracking-widest">{a.subject_name} • {a.submission_count} Submissions</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      disabled={reportLoading}
                      onClick={() => viewReport(a)}
                      className="px-6 py-3 bg-primary-blue text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-dark-navy transition-all shadow-lg shadow-primary-blue/10 flex items-center gap-2"
                    >
                      {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                      View Report
                    </button>
                    <button 
                      onClick={async () => {
                        const token = localStorage.getItem("token");
                        const res = await fetch(`/api/teacher/reports/${a.id}`, { headers: { Authorization: `Bearer ${token}` } });
                        if (res.ok) {
                          const data = await res.json();
                          exportToExcel({ ...data, assignment: a });
                        }
                      }}
                      className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Export
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "Analytics" && (
        <div className="space-y-8">
          <header>
            <h2 className="text-3xl font-black text-dark-navy tracking-tighter">Class Analytics</h2>
            <p className="text-xs font-bold text-dark-navy/40 uppercase tracking-widest mt-1">Holistic view of student progress</p>
          </header>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="bg-white p-8 rounded-[32px] border border-dark-navy/5 shadow-sm">
              <h3 className="text-xl font-black text-dark-navy mb-6">Submission Trends</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1FAEE" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#1D3557", opacity: 0.4 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#1D3557", opacity: 0.4 }} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', fontSize: '12px', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="submissions" stroke="#457B9D" strokeWidth={4} fill="#457B9D" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="bg-white p-8 rounded-[32px] border border-dark-navy/5 shadow-sm">
              <h3 className="text-xl font-black text-dark-navy mb-6">Grade Distribution</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                      {distributionData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Modals - Redesigned */}
      <AnimatePresence>
        {showAssignmentForm && (
          <div className="fixed inset-0 bg-dark-navy/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-white/20"
            >
              <div className="p-8 border-b border-dark-navy/5 flex justify-between items-center bg-bg-light/50">
                <div>
                  <h2 className="text-2xl font-black text-dark-navy tracking-tight">New Assignment</h2>
                  <p className="text-xs font-bold text-dark-navy/40 uppercase tracking-widest mt-1">Configure evaluation parameters</p>
                </div>
                <button onClick={() => setShowAssignmentForm(false)} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-primary-red hover:text-white transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleCreateAssignment} className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">Subject</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-bg-light border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue/20 font-bold text-sm"
                      value={selectedSubject}
                      onChange={e => setSelectedSubject(e.target.value)}
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">Assignment Title</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-3 bg-bg-light border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue/20 font-bold text-sm"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">Description & Rubric</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-bg-light border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue/20 font-medium text-sm h-24"
                    placeholder="Provide detailed instructions..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">Deadline</label>
                    <input 
                      type="datetime-local" 
                      required
                      className="w-full px-4 py-3 bg-bg-light border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue/20 font-bold text-sm"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">Duration (Mins)</label>
                    <input 
                      type="number" 
                      required
                      className="w-full px-4 py-3 bg-bg-light border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue/20 font-bold text-sm"
                      value={duration || ""}
                      onChange={e => setDuration(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">Questions</label>
                    <button 
                      type="button" 
                      onClick={handleAddQuestion}
                      className="text-[10px] font-black text-primary-blue uppercase tracking-widest flex items-center gap-1 hover:text-dark-navy transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add Question
                    </button>
                  </div>
                  <div className="space-y-4">
                    {questions.map((q, idx) => (
                      <div key={idx} className="p-6 bg-bg-light rounded-[32px] space-y-4 border border-dark-navy/5">
                        <div className="flex gap-4">
                          <input 
                            type="text" 
                            placeholder={`Question ${idx + 1}`}
                            className="flex-1 px-4 py-3 bg-white border-none rounded-xl text-sm font-bold outline-none"
                            value={q.text}
                            onChange={e => {
                              const newQs = [...questions];
                              newQs[idx].text = e.target.value;
                              setQuestions(newQs);
                            }}
                          />
                          <select 
                            className="px-4 py-3 bg-white border-none rounded-xl text-[10px] font-black uppercase outline-none"
                            value={q.type}
                            onChange={e => {
                              const newQs = [...questions];
                              newQs[idx].type = e.target.value;
                              setQuestions(newQs);
                            }}
                          >
                            <option value="subjective">Subjective</option>
                            <option value="coding">Coding</option>
                          </select>
                        </div>
                        <input 
                          type="text" 
                          placeholder="AI Answer Key / Rubric Points"
                          className="w-full px-4 py-3 bg-white border-none rounded-xl text-xs font-medium outline-none"
                          onChange={e => {
                            setAnswerKey({ ...answerKey, [idx]: e.target.value });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">Enrollment List (CSV)</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-bg-light border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue/20 font-mono text-xs h-24"
                    placeholder="email, roll, school_id"
                    value={studentListRaw}
                    onChange={e => setStudentListRaw(e.target.value)}
                  />
                </div>

                <button 
                  disabled={loading}
                  className="w-full bg-primary-red text-white py-5 rounded-[24px] font-black uppercase tracking-widest shadow-2xl shadow-primary-red/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                  Publish & Notify Class
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 bg-dark-navy/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-dark-navy/5 flex justify-between items-center bg-bg-light/50">
                <div>
                  <h2 className="text-2xl font-black text-dark-navy tracking-tight">Assignment Report</h2>
                  <p className="text-xs font-bold text-dark-navy/40 uppercase tracking-widest mt-1">{selectedReport.assignment.title}</p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => exportToExcel(selectedReport)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 hover:scale-105 transition-all"
                  >
                    <Download className="w-4 h-4" /> Export Excel
                  </button>
                  <button onClick={() => setSelectedReport(null)} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-primary-red hover:text-white transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-8 overflow-y-auto space-y-10 custom-scrollbar">
                {/* Bar Chart Section */}
                <section className="bg-bg-light/30 p-8 rounded-[32px] border border-dark-navy/5">
                  <h3 className="text-lg font-black text-dark-navy mb-6">Performance Distribution</h3>
                  <div className="h-[300px] w-full min-h-[300px] relative">
                    {selectedReport.chartData && selectedReport.chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={selectedReport.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E6E6" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fontWeight: 700, fill: "#1D3557" }}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fontWeight: 700, fill: "#1D3557" }}
                          />
                          <Tooltip 
                            cursor={{ fill: 'rgba(69, 123, 157, 0.1)' }}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                          />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                            {selectedReport.chartData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={
                                entry.name === 'Topper' ? '#457B9D' : 
                                entry.name === 'Failed' ? '#E63946' : 
                                entry.name === 'Auto-Submitted' ? '#F27D26' : '#A8DADC'
                              } />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-dark-navy/20 font-bold">No chart data available</div>
                    )}
                  </div>
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(selectedReport.chartData || []).map((d: any, i: number) => (
                      <div key={i} className="p-4 bg-white rounded-2xl border border-dark-navy/5">
                        <div className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest mb-1">{d.name}</div>
                        <div className="text-xl font-black text-dark-navy">{d.value}</div>
                        {d.student && <div className="text-[10px] font-bold text-primary-blue mt-1 truncate">{d.student}</div>}
                      </div>
                    ))}
                  </div>
                </section>

                {/* AI Summary Section */}
                {selectedReport.ai_summary && (
                  <section className="space-y-4">
                    <h3 className="text-lg font-black text-dark-navy">AI Class Summary</h3>
                    <div className="p-6 bg-primary-blue/5 rounded-3xl border border-primary-blue/10">
                      <p className="text-sm font-medium text-dark-navy/70 leading-relaxed">{selectedReport.ai_summary}</p>
                    </div>
                  </section>
                )}

                {/* Student List Section */}
                <section className="space-y-4">
                  <h3 className="text-lg font-black text-dark-navy">Student Performance</h3>
                  <div className="space-y-3">
                    {selectedReport.studentPerformance.map((s: any, i: number) => (
                      <div key={i} className="p-4 bg-white border border-dark-navy/5 rounded-2xl flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-bg-light flex items-center justify-center font-black text-dark-navy/40">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-dark-navy">{s.name}</div>
                            <div className="text-[10px] font-black text-dark-navy/30 uppercase tracking-widest">
                              Roll: {s.roll_no} {s.auto_submit_reason && <span className="text-primary-red ml-2">• Auto-Submitted: {s.auto_submit_reason}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className={`text-sm font-black ${s.ai_score >= 40 ? 'text-emerald-600' : 'text-primary-red'}`}>
                              {s.ai_score}/100
                            </div>
                            <div className="text-[10px] font-black text-dark-navy/20 uppercase tracking-widest">
                              {s.status}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Submissions List Modal */}
      <AnimatePresence>
        {selectedAssignment && (
          <div className="fixed inset-0 bg-dark-navy/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="p-8 border-b border-dark-navy/5 flex justify-between items-center bg-bg-light/50">
                <div>
                  <h2 className="text-2xl font-black text-dark-navy tracking-tight">Submissions</h2>
                  <p className="text-xs font-bold text-dark-navy/40 uppercase tracking-widest mt-1">{selectedAssignment.title}</p>
                </div>
                <button onClick={() => setSelectedAssignment(null)} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-primary-red hover:text-white transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto space-y-4 custom-scrollbar">
                {submissions.length === 0 ? (
                  <div className="text-center py-20 text-dark-navy/20 font-black uppercase tracking-widest">No submissions yet</div>
                ) : (
                  submissions.map(s => (
                    <div 
                      key={s.id} 
                      className="p-6 bg-white border border-dark-navy/5 rounded-3xl flex justify-between items-center hover:border-primary-blue/30 hover:shadow-xl hover:shadow-primary-blue/5 transition-all cursor-pointer"
                      onClick={() => viewSubmissionDetail(s.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary-blue text-white flex items-center justify-center font-black text-lg">
                          {s.student_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-black text-dark-navy">{s.student_name}</div>
                          <div className="text-[10px] text-dark-navy/30 uppercase font-black tracking-widest">Roll: {s.roll_no}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className={`text-sm font-black ${s.status === 'approved' ? 'text-primary-blue' : s.status === 'evaluated' ? 'text-emerald-600' : 'text-primary-red'}`}>
                            {s.status === 'approved' ? `Final: ${s.ai_score}` : 
                             s.status === 'evaluated' ? `AI: ${s.ai_score}` : 'Pending'}
                          </div>
                          {s.ai_confidence && (
                            <div className={`text-[10px] font-black uppercase tracking-widest ${s.ai_confidence >= 0.8 ? 'text-emerald-500' : 'text-primary-red'}`}>
                              {Math.round(s.ai_confidence * 100)}% Conf.
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-6 h-6 text-dark-navy/10" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Submission Detail Modal */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 bg-dark-navy/80 backdrop-blur-2xl z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-white w-full max-w-5xl rounded-[48px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-10 border-b border-dark-navy/5 flex justify-between items-center bg-bg-light/30">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-primary-blue rounded-3xl shadow-xl shadow-primary-blue/20 flex items-center justify-center text-white font-black text-2xl">
                    {selectedSubmission.student_name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-dark-navy tracking-tight">{selectedSubmission.student_name}</h2>
                    <p className="text-xs font-bold text-dark-navy/40 uppercase tracking-widest mt-1">{selectedSubmission.assignment_title} • Roll: {selectedSubmission.roll_no}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedSubmission(null)} className="p-4 bg-white rounded-3xl shadow-sm hover:bg-primary-red hover:text-white transition-all">
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="p-10 overflow-y-auto space-y-10 custom-scrollbar">
                {/* AI Feedback Section */}
                {selectedSubmission.status !== 'pending' && (
                  <div className={`p-8 rounded-[40px] border-2 ${selectedSubmission.ai_confidence >= 0.8 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-primary-red/5 border-primary-red/10'}`}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="space-y-1">
                        <h3 className={`text-lg font-black flex items-center gap-2 ${selectedSubmission.ai_confidence >= 0.8 ? 'text-emerald-900' : 'text-primary-red'}`}>
                          {selectedSubmission.ai_confidence >= 0.8 ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                          AI Evaluation Result
                        </h3>
                        {selectedSubmission.ai_confidence < 0.8 && (
                          <span className="text-[10px] bg-primary-red text-white px-3 py-1 rounded-full font-black uppercase tracking-widest">Manual Review Required</span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`text-4xl font-black ${selectedSubmission.ai_confidence >= 0.8 ? 'text-emerald-600' : 'text-primary-red'}`}>
                          {selectedSubmission.ai_score}<span className="text-lg font-bold opacity-30">/100</span>
                        </div>
                        <div className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest mt-1">Confidence: {Math.round(selectedSubmission.ai_confidence * 100)}%</div>
                      </div>
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-dark-navy/70 mb-8">{selectedSubmission.ai_feedback}</p>
                    
                    {selectedSubmission.ai_metadata && (
                      <div className="flex flex-wrap gap-2 mb-10">
                        {JSON.parse(selectedSubmission.ai_metadata).concept_tags?.map((tag: string, i: number) => (
                          <span key={i} className="text-[10px] font-black px-4 py-2 bg-white rounded-xl border border-dark-navy/5 text-dark-navy/60 uppercase tracking-widest">{tag}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-4">
                      <button 
                        onClick={() => handleApproveEvaluation(selectedSubmission.id, selectedSubmission.ai_score, selectedSubmission.ai_feedback)}
                        className="flex-1 bg-primary-blue text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary-blue/20 hover:scale-[1.02] transition-all"
                      >
                        Approve & Publish
                      </button>
                      <button 
                        className="flex-1 bg-white text-dark-navy border-2 border-dark-navy/5 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-bg-light transition-all"
                        onClick={() => {
                          const newScore = prompt("Enter manual score:", selectedSubmission.ai_score);
                          const newFeedback = prompt("Enter manual feedback:", selectedSubmission.ai_feedback);
                          if (newScore !== null && newFeedback !== null) {
                            handleApproveEvaluation(selectedSubmission.id, parseInt(newScore), newFeedback);
                          }
                        }}
                      >
                        Override Score
                      </button>
                    </div>
                  </div>
                )}

                {/* Answers Section */}
                <div className="space-y-8">
                  <h3 className="text-xl font-black text-dark-navy tracking-tight">Student Responses</h3>
                  {JSON.parse(selectedSubmission.questions).map((q: any, idx: number) => {
                    const studentAnswer = JSON.parse(selectedSubmission.answers)[idx];
                    return (
                      <div key={idx} className="space-y-4">
                        <div className="flex gap-4 items-start">
                          <span className="w-10 h-10 bg-bg-light text-dark-navy/40 rounded-2xl flex items-center justify-center text-sm font-black shrink-0">{idx + 1}</span>
                          <p className="font-bold text-dark-navy text-lg pt-1">{q.text}</p>
                        </div>
                        <div className="ml-14 p-8 bg-bg-light rounded-[32px] border border-dark-navy/5">
                          {q.type === 'coding' ? (
                            <pre className="text-xs font-mono text-dark-navy/80 whitespace-pre-wrap leading-relaxed">{studentAnswer || "No answer provided"}</pre>
                          ) : (
                            <p className="text-sm font-medium text-dark-navy/70 leading-relaxed">{studentAnswer || "No answer provided"}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
