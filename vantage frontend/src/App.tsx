import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import TeacherDashboard from "./components/TeacherDashboard";
import StudentDashboard from "./components/StudentDashboard";
import AdminDashboard from "./components/AdminDashboard";
import AssignmentInterface from "./components/AssignmentInterface";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import Navbar from "./components/Navbar";

export default function App() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-bg-light font-sans text-dark-navy">
        {user ? (
          <div className="flex">
            <Navbar user={user} onLogout={handleLogout} />
            <main className="flex-1 ml-64 mt-20 p-8 min-h-[calc(100vh-80px)]">
              <Routes>
                <Route path="/" element={
                  user.role === 'teacher' ? <TeacherDashboard /> :
                  user.role === 'student' ? <StudentDashboard /> :
                  <AdminDashboard />
                } />
                <Route path="/subjects" element={user.role === 'teacher' ? <TeacherDashboard /> : <Navigate to="/" />} />
                <Route path="/assignments" element={user.role === 'teacher' ? <TeacherDashboard /> : <Navigate to="/" />} />
                <Route path="/students" element={user.role === 'teacher' ? <TeacherDashboard /> : <Navigate to="/" />} />
                <Route path="/reports" element={user.role === 'teacher' ? <TeacherDashboard /> : <Navigate to="/" />} />
                <Route path="/analytics" element={user.role === 'teacher' ? <TeacherDashboard /> : <Navigate to="/" />} />
                <Route path="/settings" element={user.role === 'teacher' ? <TeacherDashboard /> : <Navigate to="/" />} />
                
                <Route path="/assignment/:id" element={user?.role === 'student' ? <AssignmentInterface /> : <Navigate to="/" />} />
                {/* Fallback for other routes */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        ) : (
          <main className="min-h-screen">
            <Routes>
              <Route path="/login" element={<Login setUser={setUser} />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          </main>
        )}
      </div>
    </Router>
  );
}
