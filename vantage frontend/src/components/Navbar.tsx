import { Link, useLocation } from "react-router-dom";
import { 
  LogOut, Bell, User, BookOpen, LayoutDashboard, 
  Book, FileText, Users, BarChart3, TrendingUp, Settings, Search 
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function Navbar({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const fetchNotifications = async () => {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) setNotifications(await res.json());
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const menuItems = [
    { name: "Overview", icon: LayoutDashboard, path: "/" },
    { name: "Subjects", icon: Book, path: "/subjects" },
    { name: "Assignments", icon: FileText, path: "/assignments" },
    { name: "Students", icon: Users, path: "/students" },
    { name: "Reports", icon: BarChart3, path: "/reports" },
    { name: "Analytics", icon: TrendingUp, path: "/analytics" },
    { name: "Settings", icon: Settings, path: "/settings" },
  ].filter(item => {
    if (user.role === 'student') {
      return ["Overview", "Assignments", "Settings"].includes(item.name);
    }
    return true;
  });

  return (
    <>
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-primary-red text-white flex flex-col z-50">
        <div className="p-8 flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tighter">Vantage</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive 
                    ? "bg-white/20 text-white shadow-lg shadow-black/10" 
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "opacity-100" : "opacity-70"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <LogOut className="w-5 h-5 opacity-70" />
            Logout
          </button>
        </div>
      </aside>

      {/* Top Header */}
      <header className="fixed top-0 left-64 right-0 h-20 bg-bg-light border-b border-dark-navy/5 flex items-center justify-between px-8 z-40">
        <div className="flex-1 max-w-md">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-navy/40 group-focus-within:text-primary-blue transition-colors" />
            <input 
              type="text" 
              placeholder={user.role === 'student' ? "Search assignments..." : "Search analytics, students, or reports..."}
              className="w-full pl-12 pr-4 py-2.5 bg-white border border-dark-navy/5 rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue/30 transition-all text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          {user.role === 'student' && (
            <div className="flex items-center gap-4 px-6 py-2 bg-white rounded-2xl border border-dark-navy/5 shadow-sm">
              <div className="text-right">
                <div className="text-[10px] font-black text-dark-navy/30 uppercase tracking-widest">Roll Number</div>
                <div className="text-sm font-black text-dark-navy">{user.roll_no || 'N/A'}</div>
              </div>
              <div className="w-px h-8 bg-dark-navy/5" />
              <div className="text-right">
                <div className="text-[10px] font-black text-dark-navy/30 uppercase tracking-widest">Student ID</div>
                <div className="text-sm font-black text-primary-blue">{user.school_id || 'N/A'}</div>
              </div>
            </div>
          )}

          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 bg-white border border-dark-navy/5 rounded-xl relative hover:bg-zinc-50 transition-colors"
            >
              <Bell className="w-5 h-5 text-dark-navy/60" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 bg-primary-red text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-80 bg-white border border-dark-navy/5 rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-dark-navy/5 font-bold text-sm text-dark-navy">Notifications</div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-dark-navy/40 text-sm">No new notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-4 text-sm border-b border-dark-navy/5 last:border-0 ${n.read ? 'opacity-50' : 'bg-accent-blue/10'}`}>
                          <p className="text-dark-navy font-medium leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-dark-navy/40 mt-1 uppercase font-bold tracking-wider">{new Date(n.created_at).toLocaleDateString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-3 pl-6 border-l border-dark-navy/10">
            <div className="text-right">
              <div className="text-sm font-bold text-dark-navy">{user.name}</div>
              <div className="text-[10px] text-primary-blue uppercase font-black tracking-widest">{user.role}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary-blue text-white flex items-center justify-center font-bold shadow-lg shadow-primary-blue/20">
              {user.name.charAt(0)}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
