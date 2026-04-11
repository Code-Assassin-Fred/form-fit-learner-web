'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  LogOut, LayoutDashboard, Users, Search,
  Bell, Zap, GraduationCap,
  Printer, FileText, Upload,
  Camera, X, CheckCircle, AlertCircle, Info,
  ChevronDown, ChevronUp, Trash2, Globe, Clock,
  ArrowRight, Download, Filter
} from 'lucide-react';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddLearner, setShowAddLearner] = useState(false);
  const [showNewAssessment, setShowNewAssessment] = useState(false);
  const [newLearnerData, setNewLearnerData] = useState({ name: '', age: '', disabilityInfo: '' });
  const [assessmentFile, setAssessmentFile] = useState(null);
  const [selectedLearnerId, setSelectedLearnerId] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [fakeStep, setFakeStep] = useState('thinking...');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [learnerToDelete, setLearnerToDelete] = useState(null);
  const router = useRouter();
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [learners, setLearners] = useState([]);
  const [classes, setClasses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [expandedReportId, setExpandedReportId] = useState(null);

  const cleanReportContent = (content) => {
    if (!content) return '';
    return content.replace(/\\documentclass\{[\s\S]*?\\begin\{document\}/g, '').replace(/\\end\{document\}/g, '').trim();
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAllData = useCallback(async (currentUser) => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      const headers = { 'Authorization': `Bearer ${token}` };

      const [learnersRes, assessmentsRes, classesRes, tasksRes, activitiesRes] = await Promise.all([
        fetch('/api/learners', { headers }),
        fetch('/api/assessments', { headers }),
        fetch('/api/classes', { headers }),
        fetch('/api/tasks', { headers }),
        fetch('/api/activities', { headers }),
      ]);

      if (learnersRes.ok) setLearners(await learnersRes.json());
      if (assessmentsRes.ok) setAssessments(await assessmentsRes.json());
      if (classesRes.ok) setClasses(await classesRes.json());
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (activitiesRes.ok) setActivities(await activitiesRes.json());
    } catch (err) {
      console.error('Failed to fetch data:', err);
      showToast(`Connection failed.`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchAllData(currentUser);
      } else {
        router.push('/login');
      }
    });
    return () => unsubAuth();
  }, [fetchAllData, router]);

  useEffect(() => {
    if (!analyzing) {
      setFakeStep('thinking...');
      return;
    }
    
    let timeoutId;
    const messages = ['thinking...', 'generating...', 'verifying...', 'analyzing...', 'processing...'];
    
    const updateStep = () => {
      const nextMsg = messages[Math.floor(Math.random() * messages.length)];
      setFakeStep(nextMsg);
      // Random interval between 800ms and 2500ms
      const nextInterval = Math.floor(Math.random() * 1700) + 800;
      timeoutId = setTimeout(updateStep, nextInterval);
    };
    
    updateStep();
    return () => clearTimeout(timeoutId);
  }, [analyzing]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handleAddLearner = async (e) => {
    e.preventDefault();
    const token = await user.getIdToken();
    const response = await fetch('/api/learners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(newLearnerData),
    });
    if (response.ok) {
      showToast("Learner added!");
      setShowAddLearner(false);
      setNewLearnerData({ name: '', age: '', disabilityInfo: '' });
      fetchAllData(user);
    }
  };

  const handleDeleteLearner = async () => {
    if (!learnerToDelete) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/learners/${learnerToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        showToast(`Learner ${learnerToDelete.name} deleted.`);
        setShowDeleteConfirm(false);
        setLearnerToDelete(null);
        fetchAllData(user);
      } else {
        showToast("Failed to delete.", 'error');
      }
    } catch (err) {
      showToast("Error deleting learner.", 'error');
    }
  };

  const runAssessment = async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setAnalyzing(true);
    setAnalysisProgress(10);
    const arrayBuffer = await assessmentFile.arrayBuffer();
    const mediaBase64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

    const token = await user.getIdToken();
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        mediaBase64,
        mimeType: assessmentFile.type,
        mediaType: assessmentFile.type.includes('video') ? 'video' : 'image',
        learnerId: selectedLearnerId
      }),
      signal: abortControllerRef.current.signal
    });

    if (!response.ok) {
      showToast("Analysis failed.", 'error');
      setAnalyzing(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep partial line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
          
          try {
            const data = JSON.parse(trimmedLine.substring(6));
            if (data.type === 'error') {
              showToast(data.message || "AI core failed.", "error");
              setAnalyzing(false);
              return;
            } else if (data.type === 'progress') {
              setAnalysisStep(data.message);
              setAnalysisProgress(data.progress);
            } else if (data.type === 'complete') {
              setAnalysisProgress(100);
              showToast("Analysis complete!");
              setTimeout(() => {
                setAnalyzing(false);
                setShowNewAssessment(false);
                setAssessmentFile(null);
                fetchAllData(user);
              }, 1000);
            }
          } catch(e) {
            console.error("Malformed stream chunk:", e);
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Analysis aborted by user');
      } else {
        showToast("Connection lost.", "error");
        setAnalyzing(false);
      }
    }
  };

  const handleAbort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setAnalyzing(false);
    showToast("Analysis aborted.", "error");
  }, []);

  const handleDownloadSTL = (toolId, toolName) => {
    showToast(`Downloading STL: ${toolId}...`);
    // Mock download mechanism
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent('STL binary placeholder'));
    element.setAttribute('download', `${toolId}.stl`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen w-screen items-center justify-center bg-bg-main gap-6">
        <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-brand-primary rounded-full animate-spin"></div>
        </div>
        <p className="font-outfit font-bold text-slate-400 uppercase tracking-[4px] text-xs">Loading Workstation</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden font-inter selection:bg-brand-primary selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-[200] flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl transition-all animate-float ${
          toast.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          <div className="flex-shrink-0">
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          </div>
          <span className="font-semibold">{toast.message}</span>
          <button className="ml-4 text-slate-400 hover:text-slate-600 transition-all font-bold" onClick={() => setToast(null)}><X size={16} /></button>
        </div>
      )}

      {/* Sidebar */}
      <aside className="hidden lg:flex w-[240px] bg-white border-r border-border-main flex-col h-full z-50">
        <div className="pt-10 pb-6 px-6 flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
          <h2 className="font-outfit font-bold text-lg text-slate-900 tracking-tight lowercase">Form-Fit</h2>
        </div>
        
        <nav className="flex-1 px-4 py-2 flex flex-col gap-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'learners', label: 'Learners', icon: Users },
            { id: 'assessments', label: 'Assessments', icon: Search },
            { id: 'tools', label: '3D Tools', icon: Printer },
            { id: 'reports', label: 'Reports', icon: FileText },
          ].map((item) => (
            <button
              key={item.id}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-brand-primary/10 text-brand-primary' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-text-main'
              }`}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon size={18} /> 
              <span className="text-[0.85rem]">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-50">
          <div className="bg-slate-50 p-4 rounded-2xl mb-4">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cloud Status</p>
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 led-indicator"></div>
                <span className="text-[10px] font-bold text-slate-600">Gemini Pro connected</span>
             </div>
          </div>
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-500 font-semibold transition-all hover:bg-red-50 text-sm" onClick={handleLogout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar scroll-smooth">
        {/* Custom Nav Bar */}
        <header className="h-[110px] md:h-[130px] pt-8 md:pt-10 px-8 md:px-12 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40 transition-all duration-500">
          <div className="flex items-center gap-4 bg-slate-50/50 rounded-2xl px-6 py-3.5 w-full max-w-[440px] border border-slate-100 focus-within:border-brand-primary/30 focus-within:bg-white focus-within:shadow-xl focus-within:shadow-brand-primary/5 transition-all group">
            <Search size={18} className="text-slate-400 group-focus-within:text-brand-primary" />
            <input type="text" placeholder="Search workstation..." className="bg-transparent border-none outline-none text-[0.9rem] font-medium w-full text-slate-900 placeholder:text-slate-400" />
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative cursor-pointer group p-2 hover:bg-slate-50 rounded-xl transition-all">
              <Bell size={22} className="text-slate-400 group-hover:text-brand-primary" />
              <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-brand-secondary rounded-full border-2 border-white ring-2 ring-transparent group-hover:ring-brand-secondary/20 transition-all"></div>
            </div>
            
            <div className="h-10 w-[1px] bg-slate-100 mx-1"></div>
            
            <div className="flex items-center gap-4 pl-2 group cursor-pointer">
              <div className="text-right hidden sm:block">
                <p className="text-[0.9rem] font-bold text-slate-900 leading-tight group-hover:text-brand-primary transition-colors">{user?.email?.split('@')[0]}</p>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Admin</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center font-bold text-white text-base shadow-lg shadow-brand-primary/20 group-hover:scale-105 transition-all">
                {user?.email?.[0].toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Pages */}
        <div className="px-8 py-12 md:px-12 md:py-16 max-w-[1500px] mx-auto w-full">
          
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Premium Welcome Banner */}
              <div className="p-8 rounded-3xl bg-slate-900 text-white overflow-hidden relative shadow-lg">
                <div className="relative z-10 max-w-[80%]">
                  <div className="flex items-center gap-3 mb-4">
                     <span className="px-3 py-1 rounded-full bg-brand-primary/20 text-brand-primary text-[8px] font-bold uppercase tracking-widest">Next-Gen Ergonomics</span>
                  </div>
                  <h1 className="text-4xl font-outfit font-black mb-4 leading-[1.1] lowercase tracking-tight">Empowering Inclusive Learning with AI</h1>
                  <p className="text-slate-300 text-lg mb-8 leading-relaxed font-medium">Advanced kinematic analysis directly synchronized with your school&apos;s 3D printer workstation.</p>
                  <div className="flex gap-3">
                    <button className="px-5 py-2.5 rounded-xl bg-brand-primary text-white font-bold text-sm hover:brightness-105 transition-all flex items-center gap-2" onClick={() => setActiveTab('assessments')}>
                       New Assessment <ArrowRight size={16} />
                    </button>
                    <button className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-all" onClick={() => setActiveTab('reports')}>
                       Review Reports
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Learners', value: learners.length, icon: GraduationCap, color: 'text-brand-primary', bg: 'bg-brand-primary/10' },
                  { label: 'Assessments', value: assessments.length, icon: Zap, color: 'text-brand-secondary', bg: 'bg-brand-secondary/10' },
                  { label: '3D Tools', value: assessments.filter(a => a.recommendedToolId).length, icon: Printer, color: 'text-brand-accent', bg: 'bg-brand-accent/10' },
                  { label: 'Classes', value: classes.length || 0, icon: Globe, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                ].map((stat, i) => (
                  <div key={i} className="premium-card !rounded-2xl p-6 flex flex-col items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color} shadow-sm transition-transform group-hover:scale-110`}>
                       <stat.icon size={20} />
                    </div>
                    <div>
                       <h3 className="text-2xl font-bold text-slate-900 leading-none">{stat.value}</h3>
                       <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Two Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                 {/* Left Column: Recent Assessments */}
                 <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center px-4">
                       <h3 className="text-2xl font-outfit font-black text-slate-900 lowercase tracking-tighter">Recent assessments</h3>
                       <button className="text-brand-primary font-bold hover:underline" onClick={() => setActiveTab('assessments')}>View Log</button>
                    </div>
                    <div className="bg-white border border-border-main rounded-[40px] overflow-hidden shadow-sm">
                       <table className="w-full">
                          <thead>
                             <tr className="bg-slate-50 border-b border-border-main text-left">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Learner</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Analysis</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Status</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                             {assessments.slice(0, 5).map(a => (
                               <tr key={a.id} className="hover:bg-slate-50 transition-colors group cursor-pointer text-sm" onClick={() => {setActiveTab('reports'); setExpandedReportId(a.id);}}>
                                  <td className="px-6 py-4">
                                     <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs">U</div>
                                        <div>
                                           <p className="font-bold text-slate-900 leading-none">{learners.find(l => l.id === a.learnerId)?.name || 'Unknown'}</p>
                                           <p className="text-[10px] text-slate-400 mt-1">ID: {a.learnerId.substring(0, 6)}</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4">
                                     <p className="text-xs font-medium text-slate-500 line-clamp-1 italic">{a.analysisResults?.issue || 'Processing...'}</p>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                     <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                        Completed
                                     </span>
                                  </td>
                               </tr>
                             ))}
                             {assessments.length === 0 && (
                               <tr><td colSpan="3" className="py-20 text-center text-slate-400 font-bold italic">No assessment records found.</td></tr>
                             )}
                          </tbody>
                       </table>
                    </div>
                 </div>
                 
                 {/* Right Column: Mini Cards */}
                 <div className="space-y-4">
                    <h3 className="text-xl font-outfit font-bold text-slate-900 px-2 lowercase tracking-tight">Live feedback</h3>
                    <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden group">
                       <div className="relative z-10">
                          <Clock size={24} className="mb-3 text-brand-primary" />
                          <h4 className="text-lg font-bold mb-1">System Uptime</h4>
                          <p className="text-slate-400 text-xs font-medium leading-relaxed">System is running at 99.9% capacity.</p>
                       </div>
                    </div>
                    <div className="bg-white border border-border-main rounded-3xl p-6 shadow-sm">
                       <h4 className="font-bold text-slate-400 uppercase tracking-widest text-[9px] mb-4">Printer Connection</h4>
                       <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-slate-900 text-sm">Lab-1 PRINTER</span>
                          <span className="text-emerald-500 font-bold text-[10px] uppercase">ONLINE</span>
                       </div>
                       <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 w-[75%]"></div>
                       </div>
                       <p className="text-[9px] font-bold text-slate-400 mt-2 italic text-right">75% filament</p>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'learners' && (
            <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
                   <div>
                     <h1 className="text-3xl font-outfit font-bold text-slate-900 tracking-tight lowercase">Learner Core</h1>
                     <p className="text-slate-400 text-sm font-medium mt-1">Management of student profiles and physical constraints.</p>
                   </div>
                   <button 
                     className="px-6 py-3 rounded-xl bg-brand-primary text-white font-bold text-sm shadow-md hover:brightness-105 transition-all text-center" 
                     onClick={() => setShowAddLearner(true)}
                   >
                     + Registry Learner
                   </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                   {learners.map(l => (
                     <div key={l.id} className="bg-white border border-border-main rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden text-left">
                        <div className="relative z-10">
                           <div className="flex justify-between items-start mb-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl font-bold text-brand-primary uppercase">
                                {l.name[0]}
                              </div>
                              <button className="p-2 text-slate-300 hover:text-red-500 rounded-lg transition-all" onClick={() => {setLearnerToDelete(l); setShowDeleteConfirm(true);}}>
                                <Trash2 size={20} />
                              </button>
                           </div>
                           <h4 className="text-lg font-bold text-slate-900 mb-1 lowercase tracking-tight">{l.name}</h4>
                           <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest italic mb-4">Age {l.age}</p>
                           
                           <div className="space-y-4 pt-4 border-t border-slate-50">
                              <div>
                                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Constraints</p>
                                 <p className="text-xs font-medium text-slate-600 line-clamp-2 leading-relaxed">{l.disabilityInfo || 'Review required.'}</p>
                              </div>
                              <button className="w-full py-2.5 rounded-lg border border-slate-100 text-slate-500 font-bold text-[10px] hover:border-brand-primary hover:text-brand-primary transition-all flex items-center justify-center gap-2 group/btn uppercase tracking-widest text-center" onClick={() => {setSelectedLearnerId(l.id); setShowNewAssessment(true);}}>
                                 Start Analysis <ArrowRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
                              </button>
                           </div>
                        </div>
                     </div>
                   ))}
                  {learners.length === 0 && (
                    <div className="col-span-full py-24 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-6">
                       <GraduationCap size={64} className="text-slate-200" />
                       <div className="text-center">
                          <p className="text-xl font-bold text-slate-400">No learners registered.</p>
                          <button className="mt-4 text-brand-primary font-black hover:underline" onClick={() => setShowAddLearner(true)}>Add your first student profile</button>
                       </div>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'assessments' && (
            <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-5xl font-outfit font-black text-slate-900 tracking-tighter lowercase leading-none">Kinematic log</h1>
                    <p className="text-slate-400 text-xl font-medium mt-4">AI-driven analysis of physical barriers and recommendations.</p>
                  </div>
                  <button className="px-8 py-4 rounded-2xl bg-brand-primary text-white font-black text-lg shadow-xl shadow-brand-primary/20 hover:brightness-105 active:scale-95 transition-all" onClick={() => setShowNewAssessment(true)}>
                    + Run New Analysis
                  </button>
               </div>

               <div className="bg-white border border-border-main rounded-[40px] overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white">
                     <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-200 transition-all">
                           <Filter size={14} /> Filter
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{assessments.length} Total Analysis Records</span>
                     </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <th className="px-10 py-6">Student</th>
                          <th className="px-10 py-6">AI Detection Outcome</th>
                          <th className="px-10 py-6">Proposed Tool</th>
                          <th className="px-10 py-6 text-right">Verification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {assessments.map(a => (
                          <tr key={a.id} className="hover:bg-slate-50 transition-colors group cursor-pointer text-sm" onClick={() => {setExpandedReportId(a.id); setActiveTab('reports');}}>
                            <td className="px-6 py-5">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-bold text-brand-primary">L</div>
                                  <div>
                                     <p className="font-bold text-slate-900 leading-none">{learners.find(l => l.id === a.learnerId)?.name || 'Unknown'}</p>
                                     <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest">ID {a.id.substring(0, 8)}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-6 py-5">
                               <p className="text-xs font-semibold text-slate-500 max-w-[240px] leading-relaxed italic line-clamp-2">{a.analysisResults?.issue || 'Analysis processing...'}</p>
                            </td>
                            <td className="px-6 py-5">
                               <div className="inline-flex items-center gap-2 bg-slate-50 text-brand-primary px-3 py-1 rounded-lg text-[10px] font-bold border border-slate-100 uppercase tracking-widest">
                                  {a.toolDescription || a.recommendedToolId || 'Evaluating...'}
                               </div>
                            </td>
                            <td className="px-6 py-5 text-right">
                               <span className="inline-flex items-center gap-1.5 bg-brand-primary/10 text-brand-primary px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                                  <CheckCircle size={12} /> Completed
                               </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
                  <div>
                    <h1 className="text-3xl font-outfit font-bold text-slate-900 tracking-tight lowercase">3D Library</h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">Download custom generated STL blueprints.</p>
                  </div>
               </div>

               <div className="bg-white border border-border-main rounded-[32px] overflow-hidden shadow-sm">
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                          <th className="px-10 py-6">Inclusion Tool</th>
                          <th className="px-10 py-6">Assigned Learner</th>
                          <th className="px-10 py-6">Category</th>
                          <th className="px-10 py-6 text-right">Resource</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {assessments.filter(a => a.recommendedToolId).map(a => (
                          <tr key={`tool-${a.id}`} className="hover:bg-slate-50/50 transition-colors group text-sm">
                            <td className="px-10 py-6">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-brand-primary/5 text-brand-primary flex items-center justify-center font-bold">T</div>
                                  <div>
                                     <p className="font-bold text-slate-900 leading-tight lowercase truncate max-w-[200px]">{a.toolDescription || a.recommendedToolId.replace('_', ' ')}</p>
                                     <p className="text-[10px] text-slate-400 font-medium mt-1">v2.1 Stable</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-10 py-6">
                               <span className="font-semibold text-slate-600">{learners.find(l => l.id === a.learnerId)?.name || 'General Access'}</span>
                            </td>
                            <td className="px-10 py-6">
                               <span className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-widest">{a.analysisResults?.category || 'Accessibility'}</span>
                            </td>
                            <td className="px-10 py-6 text-right">
                               <button 
                                 className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-black transition-all flex items-center gap-2 ml-auto"
                                 onClick={() => handleDownloadSTL(a.recommendedToolId, a.toolDescription)}
                               >
                                 <Download size={14} /> Export STL
                               </button>
                            </td>
                          </tr>
                        ))}
                        {assessments.filter(a => a.recommendedToolId).length === 0 && (
                          <tr>
                            <td colSpan="4" className="px-10 py-20 text-center">
                               <div className="flex flex-col items-center gap-3 text-slate-300">
                                  <Printer size={48} />
                                  <p className="font-bold text-lg lowercase">No tools generated yet</p>
                               </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
                  <div>
                    <h1 className="text-3xl font-outfit font-bold text-slate-900 tracking-tight lowercase">Inclusion Reports</h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">Full documentation of ergonomic assessments.</p>
                  </div>
                  <button className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm shadow-md hover:bg-black transition-all flex items-center gap-2 justify-center" onClick={() => window.print()}>
                    <Printer size={16} /> Print All
                  </button>
               </div>

               <div className="space-y-8">
                 {assessments.filter(a => a.status === 'completed').map(a => {
                    const isExpanded = expandedReportId === a.id;
                    return (
                      <div key={`report-${a.id}`} className={`bg-white border border-border-main rounded-[40px] shadow-sm transition-all duration-500 overflow-hidden ${isExpanded ? 'ring-4 ring-brand-primary/10 shadow-2xl scale-[1.01]' : 'hover:shadow-lg'}`}>
                        <div 
                          className={`p-10 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50' : 'bg-white hover:bg-slate-50/50'}`}
                          onClick={() => setExpandedReportId(isExpanded ? null : a.id)}
                        >
                          <div className="flex items-center gap-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isExpanded ? 'bg-brand-primary text-white scale-110 shadow-lg shadow-brand-primary/30' : 'bg-brand-primary/10 text-brand-primary'}`}>
                               <FileText size={28} />
                            </div>
                            <div>
                               <h3 className="text-2xl font-black text-slate-900 lowercase tracking-tight">Report for {learners.find(l => l.id === a.learnerId)?.name || 'Student Profile'}</h3>
                               <p className="text-slate-400 font-bold text-sm mt-1">{new Date(a.timestamp).toLocaleDateString()} • {a.analysisResults?.issue || 'Physical Assessment'}</p>
                            </div>
                          </div>
                          <div className={`w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center transition-transform duration-500 ${isExpanded ? 'rotate-180 bg-brand-primary/10 text-brand-primary' : ''}`}>
                             <ChevronDown size={28} />
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="animate-in slide-in-from-top duration-500">
                            <div className="p-10 md:p-16 border-t border-border-main bg-white">
                               <div className="prose prose-slate max-w-none prose-headings:font-outfit prose-headings:font-black prose-headings:tracking-tighter prose-headings:lowercase prose-h2:text-4xl prose-h3:text-2xl prose-p:text-lg prose-p:leading-relaxed prose-p:font-medium prose-p:text-slate-600 prose-strong:text-slate-900 prose-li:text-slate-600 prose-li:font-medium">
                                  <ReactMarkdown 
                                    remarkPlugins={[remarkMath, remarkGfm]} 
                                    rehypePlugins={[rehypeKatex]}
                                  >
                                    {cleanReportContent(a.reportSummary || a.analysisResults?.details || 'Retrieving assessment data from AI core...')}
                                  </ReactMarkdown>
                               </div>
                            </div>
                            <div className="p-10 bg-slate-50 border-t border-border-main flex justify-between items-center no-print">
                               <div className="flex gap-4">
                                  <button className="px-8 py-4 rounded-2xl bg-brand-primary text-white font-black text-lg shadow-lg shadow-brand-primary/20 hover:brightness-105 transition-all">Export PDF</button>
                                  <button className="px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-900 font-bold hover:bg-slate-50 transition-all" onClick={() => setExpandedReportId(null)}>Collapse Focus</button>
                               </div>
                               <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Verified by Form-Fit AI CORE v2.5 FLASH</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                 })}
               </div>
            </div>
          )}
        </div>

        {/* New Assessment Modal */}
        {showNewAssessment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white border border-border-main rounded-2xl p-6 shadow-2xl w-full max-w-[500px] relative animate-in zoom-in-95">
              <button 
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" 
                onClick={() => setShowNewAssessment(false)}
              >
                <X size={24} />
              </button>
              
              <div className="mb-6">
                 <h3 className="text-xl font-bold text-slate-900 tracking-tight">AI Assessment Core</h3>
                 <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Kinematic Analysis Station</p>
              </div>

              {!analyzing ? (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Student</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 font-semibold text-sm outline-none focus:border-brand-primary" 
                      value={selectedLearnerId}
                      onChange={e => setSelectedLearnerId(e.target.value)}
                    >
                      <option value="">Select Profile...</option>
                      {learners.map(l => <option key={l.id} value={l.id}>{l.name} (Age {l.age})</option>)}
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Media Source</label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-slate-100 rounded-xl hover:border-brand-primary hover:bg-slate-50 cursor-pointer transition-all">
                        <Upload size={24} className="text-slate-300" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Upload Media</span>
                        <input type="file" className="hidden" onChange={e => setAssessmentFile(e.target.files[0])} />
                      </label>
                      <button className="flex flex-col items-center justify-center gap-3 p-6 border border-slate-100 rounded-xl hover:border-brand-primary hover:bg-slate-50 transition-all text-slate-300">
                        <Camera size={24} />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Live Feed</span>
                      </button>
                    </div>
                  </div>

                  {assessmentFile && (
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center text-brand-primary">
                           <CheckCircle size={18} />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold text-slate-900 truncate uppercase tracking-tight">{assessmentFile.name}</span>
                           <span className="text-[8px] font-bold text-emerald-500 uppercase">Ready</span>
                        </div>
                      </div>
                      <button className="text-slate-400 hover:text-red-500" onClick={() => setAssessmentFile(null)}><X size={16} /></button>
                    </div>
                  )}

                  <div className="flex gap-3 mt-2 pt-6 border-t border-slate-50">
                    <button 
                      className="flex-1 py-3 rounded-xl bg-brand-primary text-white font-bold text-sm shadow-md hover:brightness-105 disabled:opacity-50" 
                      onClick={runAssessment}
                      disabled={!selectedLearnerId || !assessmentFile}
                    >
                      Process Workstation
                    </button>
                    <button 
                      className="px-6 py-3 rounded-xl bg-slate-50 text-slate-500 font-bold text-sm hover:bg-slate-100" 
                      onClick={() => setShowNewAssessment(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-8 py-4">
                  <div className="w-full space-y-4">
                    <div className="flex justify-between items-end mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full bg-brand-primary led-indicator`}></div>
                        <span className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em]">{fakeStep}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{Math.round(analysisProgress)}%</span>
                    </div>
                    
                    <div className="relative p-1">
                      <div className="absolute inset-0 border-2 border-brand-primary/20 rounded-lg marching-ants"></div>
                      <div className="h-6 bg-slate-50 rounded-md overflow-hidden p-1 relative">
                        <div 
                          className="h-full bg-brand-primary rounded-sm transition-all duration-500" 
                          style={{ width: `${analysisProgress}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Operation</p>
                       <p className="text-sm font-bold text-slate-700">{analysisStep || 'Initializing kinematic model...'}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 items-center text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${i*20 <= analysisProgress ? 'bg-brand-primary led-indicator' : 'bg-slate-200'}`}></div>
                    ))}
                  </div>

                  <button className="text-red-500 font-bold uppercase text-[10px] tracking-widest hover:underline" onClick={handleAbort}>Abort Diagnostic</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Learner Modal */}
        {showAddLearner && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white border border-border-main rounded-2xl p-8 shadow-2xl w-full max-w-[500px] animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Student Registry</h3>
                <button onClick={() => setShowAddLearner(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddLearner} className="flex flex-col gap-6">
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Personal Profile</label>
                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 font-semibold text-sm outline-none focus:border-brand-primary transition-all" placeholder="Full Name" onChange={e => setNewLearnerData({ ...newLearnerData, name: e.target.value })} required />
                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 font-semibold text-sm outline-none focus:border-brand-primary transition-all" type="number" placeholder="Age" onChange={e => setNewLearnerData({ ...newLearnerData, age: e.target.value })} required />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kinematic constraints</label>
                    <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 text-slate-900 font-semibold text-sm outline-none focus:border-brand-primary transition-all min-h-[120px] resize-none" placeholder="Detailed physical needs..." onChange={e => setNewLearnerData({ ...newLearnerData, disabilityInfo: e.target.value })} required />
                  </div>
                </div>
                <div className="flex gap-3 mt-2">
                  <button className="flex-1 py-3 rounded-xl bg-brand-primary text-white font-bold text-sm shadow-md hover:brightness-105 active:scale-95 transition-all" type="submit">Complete Registry</button>
                  <button className="px-6 py-3 rounded-xl bg-slate-50 text-slate-500 font-bold text-sm hover:bg-slate-100 transition-all font-outfit" type="button" onClick={() => setShowAddLearner(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirm Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
             <div className="bg-white border border-border-main rounded-[40px] p-12 shadow-2xl w-full max-w-[500px] text-center animate-in zoom-in-95 duration-300">
                <div className="w-24 h-24 bg-red-100 text-red-500 rounded-[35px] flex items-center justify-center mx-auto mb-8 shadow-lg shadow-red-100">
                   <AlertCircle size={56} />
                </div>
                <h3 className="text-3xl font-outfit font-black text-slate-900 mb-4 lowercase tracking-tighter">Destroy Record?</h3>
                <p className="text-slate-500 font-medium text-lg leading-relaxed mb-10 px-4">
                  Are you sure you want to delete <strong>{learnerToDelete?.name}</strong>? This action is irreversible and will erase all kinematic data.
                </p>
                <div className="flex gap-4">
                   <button className="flex-1 py-5 rounded-3xl bg-red-500 text-white font-black text-xl hover:bg-red-600 transition-all shadow-xl shadow-red-100 active:scale-95" onClick={handleDeleteLearner}>Confirm Destruction</button>
                   <button className="flex-1 py-5 rounded-3xl bg-slate-100 text-slate-500 font-bold text-lg hover:bg-slate-200 transition-all" onClick={() => setShowDeleteConfirm(false)}>Keep Profile</button>
                </div>
             </div>
          </div>
        )}

      </main>
    </div>
  );
}
