import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Clock, AlertTriangle, Shield, Send, CheckCircle, X, Lock, BookOpen, Camera, Mic, UserX, VolumeX } from "lucide-react";

export default function AssignmentInterface() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<any>(null);
  const [answers, setAnswers] = useState<any>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [autoSubmitReason, setAutoSubmitReason] = useState<string | null>(null);
  const [warnings, setWarnings] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [violationFlash, setViolationFlash] = useState(false);
  
  // Proctoring State
  const [motionCount, setMotionCount] = useState(0);
  const [noiseCount, setNoiseCount] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [notifications, setNotifications] = useState<{ id: number, message: string, type: 'warning' | 'error' }[]>([]);

  const addNotification = (message: string, type: 'warning' | 'error' = 'warning') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const triggerViolation = (message: string, type: 'warning' | 'error' = 'warning') => {
    addNotification(message, type);
    setViolationFlash(true);
    setTimeout(() => setViolationFlash(false), 500);
  };

  const timerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastFrameRef = useRef<ImageData | null>(null);
  const proctoringIntervalRef = useRef<any>(null);

  useEffect(() => {
    const fetchAssignment = async () => {
      const res = await fetch("/api/student/assignments", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const list = await res.json();
        const found = list.find((a: any) => a.id === parseInt(id!));
        if (found) {
          if (found.submission_status) {
            alert("You have already submitted this assignment.");
            navigate("/");
            return;
          }
          setAssignment(found);
          setTimeLeft(found.duration * 60);
        }
      }
    };
    fetchAssignment();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarnings(prev => {
          const newCount = prev + 1;
          if (newCount >= 5) {
            triggerViolation("Maximum tab-switch violations reached. Auto-submitting...", 'error');
            setTimeout(() => handleSubmit("Tab Switching Violation"), 2000);
          } else {
            triggerViolation(`Warning (${newCount}/5): Tab switching is not allowed!`, 'warning');
          }
          return newCount;
        });
      }
    };

    const handleCopyPaste = (e: any) => {
      e.preventDefault();
      triggerViolation("Copy-pasting is disabled for this assignment.", 'warning');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isSubmitted) {
        setWarnings(prev => {
          const newCount = prev + 1;
          if (newCount >= 5) {
            triggerViolation("Maximum fullscreen violations reached. Auto-submitting...", 'error');
            setTimeout(() => handleSubmit("Fullscreen Violation"), 2000);
          } else {
            triggerViolation(`Warning (${newCount}/5): You must stay in fullscreen mode!`, 'warning');
          }
          return newCount;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("contextmenu", (e) => e.preventDefault());

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      if (timerRef.current) clearInterval(timerRef.current);
      stopProctoring();
    };
  }, [id]);

  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timeLeft, isSubmitted]);

  // Auto-submit on violations
  useEffect(() => {
    if (motionCount > 0 && motionCount < 5) {
      triggerViolation(`Warning (${motionCount}/5): Excessive movement detected!`, 'warning');
    }
    if (motionCount >= 5) {
      triggerViolation("Maximum movement violations reached. Auto-submitting...", 'error');
      setTimeout(() => handleSubmit("Motion Violation"), 2000);
    }
  }, [motionCount]);

  useEffect(() => {
    if (noiseCount > 0 && noiseCount < 5) {
      triggerViolation(`Warning (${noiseCount}/5): Excessive noise/voice detected!`, 'warning');
    }
    if (noiseCount >= 5) {
      triggerViolation("Maximum noise/voice violations reached. Auto-submitting...", 'error');
      setTimeout(() => handleSubmit("Noise Violation"), 2000);
    }
  }, [noiseCount]);

  const startProctoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setIsMicActive(true);
      }

      // Audio Monitoring
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let noiseThresholdCounter = 0;

      // Proctoring Loop
      proctoringIntervalRef.current = setInterval(() => {
        // 1. Noise Detection
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        if (average > 40) { // Threshold for noise
          noiseThresholdCounter++;
          if (noiseThresholdCounter > 10) { // Persistent noise
            setNoiseCount(prev => prev + 1);
            noiseThresholdCounter = 0;
          }
        } else {
          noiseThresholdCounter = 0;
        }

        // 2. Motion Detection
        if (videoRef.current && canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            if (lastFrameRef.current) {
              let diff = 0;
              for (let i = 0; i < currentFrame.data.length; i += 4) {
                const rDiff = Math.abs(currentFrame.data[i] - lastFrameRef.current.data[i]);
                const gDiff = Math.abs(currentFrame.data[i+1] - lastFrameRef.current.data[i+1]);
                const bDiff = Math.abs(currentFrame.data[i+2] - lastFrameRef.current.data[i+2]);
                if (rDiff + gDiff + bDiff > 100) diff++;
              }
              
              if (diff > (canvas.width * canvas.height * 0.15)) { // 15% pixels changed
                setMotionCount(prev => prev + 1);
              }
            }
            lastFrameRef.current = currentFrame;
          }
        }
      }, 1000);

    } catch (err) {
      console.error("Proctoring setup failed:", err);
      alert("Camera and Microphone access are required for this assignment.");
    }
  };

  const stopProctoring = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (proctoringIntervalRef.current) {
      clearInterval(proctoringIntervalRef.current);
    }
  };

  const enterFullScreen = () => {
    document.documentElement.requestFullscreen().then(() => {
      setIsFullScreen(true);
      startProctoring();
    }).catch(err => {
      console.error("Fullscreen failed:", err);
      alert("Please enable fullscreen to start the assignment.");
    });
  };

  const handleSubmit = async (reason?: any) => {
    if (isSubmitted) return;
    
    if (typeof reason === 'string') setAutoSubmitReason(reason);
    stopProctoring();
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }

    try {
      const res = await fetch("/api/student/submit", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ assignment_id: id, answers })
      });
      
      if (res.ok) {
        setIsSubmitted(true);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to submit assignment. Please try again.");
      }
    } catch (err) {
      alert("Network error. Please check your connection and try again.");
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!assignment) return <div className="p-20 text-center font-black text-dark-navy/20 uppercase tracking-widest">Initializing Secure Environment...</div>;

  if (!isFullScreen) {
    return (
      <div className="min-h-screen bg-dark-navy flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full p-10 bg-white rounded-[40px] shadow-2xl text-center space-y-8"
        >
          <div className="inline-flex p-6 bg-primary-red text-white rounded-[32px] shadow-xl shadow-primary-red/20">
            <Shield className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-dark-navy tracking-tight">Secure Exam Mode</h2>
            <p className="text-xs font-bold text-dark-navy/40 uppercase tracking-widest">Academic Integrity Protocol Active</p>
          </div>
          <div className="space-y-4 text-sm text-dark-navy/60 leading-relaxed text-left bg-bg-light p-6 rounded-3xl">
            <p className="flex items-center gap-3"><Camera className="w-4 h-4 text-primary-red" /> Camera monitoring enabled</p>
            <p className="flex items-center gap-3"><Mic className="w-4 h-4 text-primary-red" /> Audio monitoring enabled</p>
            <p className="flex items-center gap-3"><Lock className="w-4 h-4 text-primary-red" /> Fullscreen mode required</p>
            <p className="flex items-center gap-3 font-bold text-primary-red mt-4"><AlertTriangle className="w-4 h-4" /> 5 violations = Auto-submission</p>
          </div>
          <button 
            onClick={enterFullScreen}
            className="w-full py-4 bg-dark-navy text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-blue hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-dark-navy/20 flex items-center justify-center gap-3"
          >
            <Lock className="w-5 h-5" />
            Start Secure Session
          </button>
        </motion.div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center space-y-8">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`inline-flex p-8 rounded-[40px] shadow-xl ${autoSubmitReason ? 'bg-primary-red/10 text-primary-red shadow-primary-red/10' : 'bg-emerald-100 text-emerald-600 shadow-emerald-600/10'}`}
          >
            {autoSubmitReason ? <AlertTriangle className="w-20 h-20" /> : <CheckCircle className="w-20 h-20" />}
          </motion.div>
          <div className="space-y-2">
            <h1 className={`text-4xl font-black tracking-tighter ${autoSubmitReason ? 'text-primary-red' : 'text-dark-navy'}`}>
              {autoSubmitReason ? 'Assignment Terminated' : 'Assignment Submitted!'}
            </h1>
            <p className="text-xs font-bold text-dark-navy/40 uppercase tracking-widest">
              {autoSubmitReason ? `Auto-submitted due to: ${autoSubmitReason}` : 'Your responses have been securely stored'}
            </p>
          </div>
          <p className="text-sm text-dark-navy/60 max-w-md mx-auto leading-relaxed">
            {autoSubmitReason 
              ? "Your assignment was automatically submitted because multiple proctoring violations were detected. This event has been logged for teacher review."
              : "Our AI evaluation engine is now analyzing your submission. You will be notified once the feedback is published by your teacher."
            }
          </p>
          <button 
            onClick={() => navigate("/")}
            className="px-12 py-4 bg-dark-navy text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-blue transition-all shadow-xl shadow-dark-navy/20"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div className="min-h-screen bg-bg-light pb-32">
      {/* Violation Flash Overlay */}
      <AnimatePresence>
        {violationFlash && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-primary-red z-[200] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Notifications Overlay */}
      <div className="fixed top-24 right-8 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`p-5 rounded-2xl shadow-2xl border flex items-center gap-4 min-w-[320px] pointer-events-auto ${
                n.type === 'error' 
                  ? 'bg-primary-red text-white border-primary-red/20' 
                  : 'bg-white text-dark-navy border-dark-navy/5'
              }`}
            >
              <div className={`p-2 rounded-xl ${n.type === 'error' ? 'bg-white/20' : 'bg-primary-red/10 text-primary-red'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-50 mb-0.5">Security Alert</p>
                <p className="text-sm font-bold leading-tight">{n.message}</p>
              </div>
              <button 
                onClick={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))}
                className="ml-auto p-1 hover:bg-black/5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-dark-navy/5 z-50 px-8 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl font-black text-lg shadow-lg transition-all ${timeLeft < 300 ? 'bg-primary-red text-white shadow-primary-red/20 animate-pulse' : 'bg-dark-navy text-white shadow-dark-navy/20'}`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-primary-red/5 text-primary-red rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary-red/10">
                <AlertTriangle className="w-4 h-4" />
                Tab: {warnings}/5
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-primary-red/5 text-primary-red rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary-red/10">
                <UserX className="w-4 h-4" />
                Motion: {motionCount}/5
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-primary-red/5 text-primary-red rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary-red/10">
                <VolumeX className="w-4 h-4" />
                Noise: {noiseCount}/5
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-32 h-20 bg-dark-navy rounded-2xl overflow-hidden relative shadow-lg border-2 border-emerald-500/30">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
              <canvas ref={canvasRef} width="64" height="48" className="hidden" />
              <div className="absolute top-2 right-2 flex gap-1">
                <div className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-primary-red'}`} />
                <div className={`w-2 h-2 rounded-full ${isMicActive ? 'bg-emerald-500 animate-pulse' : 'bg-primary-red'}`} />
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 text-dark-navy/40 text-[10px] font-black uppercase tracking-widest">
                <Shield className="w-4 h-4 text-emerald-500" />
                {user.roll_no ? `Roll: ${user.roll_no}` : 'Secure Mode'}
              </div>
              <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">
                {user.school_id ? `ID: ${user.school_id}` : 'Live Monitoring'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto mt-32 px-4 space-y-10">
        <div className="bg-white p-10 rounded-[40px] border border-dark-navy/5 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-black text-dark-navy tracking-tight">{assignment.title}</h1>
              <p className="text-[10px] font-black text-dark-navy/30 uppercase tracking-widest mt-1">{assignment.subject_name} • {JSON.parse(assignment.questions).length} Questions</p>
            </div>
            <div className="p-4 bg-bg-light rounded-2xl">
              <BookOpen className="w-6 h-6 text-dark-navy/20" />
            </div>
          </div>
          {assignment.description && (
            <div className="p-6 bg-bg-light rounded-3xl border border-dark-navy/5">
              <p className="text-sm font-medium text-dark-navy/60 leading-relaxed italic">"{assignment.description}"</p>
            </div>
          )}
        </div>

        <div className="space-y-8">
          {JSON.parse(assignment.questions).map((q: any, idx: number) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-10 rounded-[40px] border border-dark-navy/5 shadow-sm group hover:border-primary-blue/30 transition-all"
            >
              <div className="flex items-start gap-6 mb-8">
                <span className="w-12 h-12 flex items-center justify-center bg-bg-light text-dark-navy/40 rounded-2xl font-black text-lg shrink-0 group-hover:bg-primary-blue group-hover:text-white transition-all">
                  {idx + 1}
                </span>
                <h3 className="text-xl font-black text-dark-navy pt-2 leading-tight">{q.text}</h3>
              </div>

              {q.type === 'coding' ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-dark-navy/30 px-2">
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Code Editor</span>
                    <span>JavaScript</span>
                  </div>
                  <textarea 
                    className="w-full h-80 p-8 bg-dark-navy text-accent-blue font-mono text-sm rounded-[32px] outline-none focus:ring-4 focus:ring-primary-blue/10 transition-all shadow-inner"
                    placeholder="// Write your solution here..."
                    value={answers[idx] || ""}
                    onChange={e => setAnswers({ ...answers, [idx]: e.target.value })}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-dark-navy/30 px-2">
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary-blue" /> Your Response</span>
                  </div>
                  <textarea 
                    className="w-full h-48 p-8 bg-bg-light border-none rounded-[32px] outline-none focus:ring-4 focus:ring-primary-blue/10 text-sm font-medium text-dark-navy/70 leading-relaxed transition-all"
                    placeholder="Type your answer here..."
                    value={answers[idx] || ""}
                    onChange={e => setAnswers({ ...answers, [idx]: e.target.value })}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center pt-10">
          <button 
            onClick={() => handleSubmit()}
            className="px-16 py-5 bg-primary-red text-white rounded-[24px] font-black uppercase tracking-widest shadow-2xl shadow-primary-red/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
          >
            <Send className="w-6 h-6" />
            Final Submission
          </button>
        </div>
      </div>
    </div>
  );
}
