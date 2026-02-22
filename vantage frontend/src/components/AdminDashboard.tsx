import { useState, useEffect, FormEvent } from "react";
import { Shield, Users, UserCheck, UserX, CheckCircle, XCircle, Edit2, Save, X, Search, Filter, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [pendingTeachers, setPendingTeachers] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, activeStudents: 0, verifiedTeachers: 0 });
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    
    const [pendingRes, usersRes, statsRes] = await Promise.all([
      fetch("/api/admin/pending-teachers", { headers }),
      fetch("/api/admin/users", { headers }),
      fetch("/api/admin/stats", { headers })
    ]);

    if (pendingRes.ok) setPendingTeachers(await pendingRes.json());
    if (usersRes.ok) setUsers(await usersRes.json());
    if (statsRes.ok) setStats(await statsRes.json());
  };

  const approveTeacher = async (userId: number) => {
    const res = await fetch("/api/admin/approve-teacher", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ userId })
    });
    if (res.ok) {
      fetchData();
    }
  };

  const rejectTeacher = async (userId: number) => {
    const res = await fetch("/api/admin/reject-teacher", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ userId })
    });
    if (res.ok) {
      fetchData();
    }
  };

  const startEditing = (user: any) => {
    setEditingUser(user);
    setEditForm({ ...user });
  };

  const handleUpdateUser = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/update-user", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify(editForm)
    });
    if (res.ok) {
      setEditingUser(null);
      fetchData();
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header>
        <h1 className="text-4xl font-black text-dark-navy tracking-tighter">Admin Control Center</h1>
        <p className="text-sm font-bold text-dark-navy/40 uppercase tracking-widest mt-2">System-wide management and authority</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: "Total Users", value: stats.totalUsers, icon: Users, color: "bg-primary-blue" },
          { label: "Active Students", value: stats.activeStudents, icon: UserCheck, color: "bg-emerald-500" },
          { label: "Verified Teachers", value: stats.verifiedTeachers, icon: Shield, color: "bg-primary-red" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[32px] border border-dark-navy/5 shadow-sm flex items-center gap-6">
            <div className={`p-4 ${stat.color} text-white rounded-2xl shadow-lg`}>
              <stat.icon className="w-8 h-8" />
            </div>
            <div>
              <div className="text-3xl font-black text-dark-navy">{stat.value}</div>
              <div className="text-[10px] text-dark-navy/40 font-black uppercase tracking-widest">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {pendingTeachers.length > 0 && (
        <section className="bg-primary-red/5 rounded-[40px] border border-primary-red/10 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-primary-red/10 flex justify-between items-center bg-primary-red/5">
            <h2 className="font-black text-xl text-primary-red flex items-center gap-3">
              <Shield className="w-6 h-6" />
              Pending Teacher Approvals
            </h2>
            <span className="bg-primary-red text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
              {pendingTeachers.length} Action Required
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-primary-red/5">
                {pendingTeachers.map(t => (
                  <tr key={t.id} className="hover:bg-primary-red/5 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary-red text-white flex items-center justify-center font-black text-lg">
                          {t.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-black text-dark-navy">{t.name}</div>
                          <div className="text-[10px] font-bold text-primary-red/60 uppercase tracking-widest">{t.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-3">
                        <button 
                          onClick={() => approveTeacher(t.id)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button 
                          onClick={() => rejectTeacher(t.id)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-white text-primary-red border border-primary-red/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-red hover:text-white transition-all shadow-sm"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="bg-white rounded-[40px] border border-dark-navy/5 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-dark-navy/5 flex justify-between items-center">
          <h2 className="font-black text-xl text-dark-navy tracking-tight">User Management</h2>
          <div className="flex gap-3">
            <button className="p-2.5 bg-bg-light rounded-xl text-dark-navy/40 hover:text-primary-blue transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2.5 bg-bg-light rounded-xl text-dark-navy/40 hover:text-primary-blue transition-colors">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-light/50 text-[10px] font-black uppercase tracking-widest text-dark-navy/40">
                <th className="px-8 py-5">User Profile</th>
                <th className="px-8 py-5">Role</th>
                <th className="px-8 py-5">Identifiers</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-navy/5">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-bg-light/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-bg-light flex items-center justify-center font-black text-dark-navy/40">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-black text-dark-navy text-sm">{u.name}</div>
                        <div className="text-[10px] font-bold text-dark-navy/30 uppercase tracking-widest">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'teacher' ? 'bg-primary-blue/10 text-primary-blue' :
                      'bg-accent-blue/20 text-dark-navy/60'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-[10px] font-bold text-dark-navy/40 space-y-1 uppercase tracking-widest">
                      {u.role === 'student' ? (
                        <>
                          <div>Roll: <span className="text-dark-navy">{u.roll_no || 'N/A'}</span></div>
                          <div>ID: <span className="text-dark-navy">{u.student_id || 'N/A'}</span></div>
                        </>
                      ) : (
                        <div>Staff ID: <span className="text-dark-navy">{u.teacher_id || 'N/A'}</span></div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${u.is_approved ? 'text-emerald-600' : 'text-primary-red'}`}>
                      <div className={`w-2 h-2 rounded-full ${u.is_approved ? 'bg-emerald-500' : 'bg-primary-red'}`} />
                      {u.is_approved ? 'Active' : 'Pending'}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => startEditing(u)}
                        className="p-2.5 bg-bg-light rounded-xl text-dark-navy/30 hover:bg-primary-blue/10 hover:text-primary-blue transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2.5 bg-bg-light rounded-xl text-dark-navy/30 hover:bg-primary-red/10 hover:text-primary-red transition-all">
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 bg-dark-navy/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border border-white/20"
            >
              <div className="p-8 border-b border-dark-navy/5 flex justify-between items-center bg-bg-light/50">
                <div>
                  <h2 className="text-2xl font-black text-dark-navy tracking-tight">Edit User</h2>
                  <p className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest mt-1">Update system credentials</p>
                </div>
                <button onClick={() => setEditingUser(null)} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-primary-red hover:text-white transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleUpdateUser} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-bg-light border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue/20 font-bold text-sm"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-3 bg-bg-light border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue/20 font-bold text-sm"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>

                {editForm.role === 'student' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">Roll Number</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-bg-light border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue/20 font-bold text-sm"
                        value={editForm.roll_no || ''}
                        onChange={e => setEditForm({ ...editForm, roll_no: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">Student ID</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-bg-light border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue/20 font-bold text-sm"
                        value={editForm.student_id || ''}
                        onChange={e => setEditForm({ ...editForm, student_id: e.target.value })}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-dark-navy/40 uppercase tracking-widest ml-1">Staff ID</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-bg-light border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue/20 font-bold text-sm"
                      value={editForm.teacher_id || ''}
                      onChange={e => setEditForm({ ...editForm, teacher_id: e.target.value })}
                    />
                  </div>
                )}

                <div className="flex items-center gap-3 p-4 bg-bg-light rounded-2xl border border-dark-navy/5">
                  <input 
                    type="checkbox" 
                    id="is_approved"
                    checked={editForm.is_approved === 1}
                    onChange={e => setEditForm({ ...editForm, is_approved: e.target.checked ? 1 : 0 })}
                    className="w-5 h-5 text-primary-blue rounded-lg border-none bg-white focus:ring-primary-blue/20"
                  />
                  <label htmlFor="is_approved" className="text-xs font-black uppercase tracking-widest text-dark-navy/60">Account Approved</label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="flex-1 py-4 bg-bg-light text-dark-navy/40 rounded-2xl font-black uppercase tracking-widest hover:bg-dark-navy/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-primary-blue text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary-blue/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
