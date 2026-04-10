'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
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
    const messages = ['thinking...', 'generating...', 'verifying...'];
    const interval = setInterval(() => {
      setFakeStep(prev => messages[(messages.indexOf(prev) + 1) % messages.length]);
    }, 1500);
    return () => clearInterval(interval);
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
    });

    if (!response.ok) {
      showToast("Analysis failed.", 'error');
      setAnalyzing(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.type === 'progress') {
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
          } catch(e) {}
        }
      }
    }
  };

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
      <aside className="w-[280px] bg-white border-r border-border-main flex flex-col h-full z-50">
        <div className="p-10 flex items-center gap-4">
          <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
             <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain brightness-0 invert" />
          </div>
          <h2 className="font-outfit font-black text-2xl text-slate-900 tracking-tight lowercase">Form-Fit</h2>
        </div>
        
        <nav className="flex-1 px-6 py-4 flex flex-col gap-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'learners', label: 'Learners', icon: Users },
            { id: 'assessments', label: 'Assessments', icon: Search },
            { id: 'tools', label: '3D Tools', icon: Printer },
            { id: 'reports', label: 'Reports', icon: FileText },
          ].map((item) => (
            <button
              key={item.id}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all duration-300 ${
                activeTab === item.id 
                  ? 'bg-brand-primary/10 text-brand-primary shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-text-main'
              }`}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon size={22} className={activeTab === item.id ? 'animate-pulse' : ''} /> 
              <span className="text-[0.95rem]">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-slate-50">
          <div className="bg-slate-50 p-6 rounded-3xl mb-6">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cloud Status</p>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-bold text-slate-600">Gemini Pro connected</span>
             </div>
          </div>
          <button className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-red-500 font-bold transition-all hover:bg-red-50 active:scale-95" onClick={handleLogout}>
            <LogOut size={22} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar scroll-smooth">
        {/* Custom Nav Bar */}
        <header className="h-[90px] px-10 flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-border-main sticky top-0 z-40">
          <div className="flex items-center gap-4 bg-slate-100 rounded-2xl px-5 py-3 w-[400px] border border-slate-200 transition-all focus-within:ring-4 focus-within:ring-brand-primary/10 focus-within:border-brand-primary">
            <Search size={20} className="text-slate-400" />
            <input type="text" placeholder="Search learners, tools or reports..." className="bg-transparent border-none outline-none text-[0.95rem] font-medium w-full text-slate-900 placeholder:text-slate-400" />
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative cursor-pointer group">
              <Bell size={24} className="text-slate-400 group-hover:text-brand-primary transition-colors" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-secondary rounded-full border-2 border-white"></div>
            </div>
            
            <div className="h-10 w-[2px] bg-slate-100 mx-2"></div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-900 leading-none">{user?.email?.split('@')[0]}</p>
                <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest leading-none mt-1">Administrator</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-brand-primary text-xl overflow-hidden shadow-sm">
                {user?.email?.[0].toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Pages */}
        <div className="p-10 max-w-[1500px] mx-auto w-full">
          
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Premium Welcome Banner */}
              <div className="p-12 rounded-[40px] bg-slate-900 text-white overflow-hidden relative shadow-2xl shadow-slate-200">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/10 blur-[120px] rounded-full pointer-events-none -z-0"></div>
                <div className="relative z-10 max-w-[70%]">
                  <div className="flex items-center gap-3 mb-6">
                     <span className="px-4 py-1.5 rounded-full bg-brand-primary/20 text-brand-primary text-[10px] font-black uppercase tracking-[3px]">Next-Gen Ergonomics</span>
                  </div>
                  <h1 className="text-5xl font-outfit font-black mb-6 leading-none lowercase tracking-tighter">Empowering Inclusive Learning with AI</h1>
                  <p className="text-slate-400 text-xl mb-10 leading-relaxed font-medium">Advanced kinematic analysis directly synchronized with your school&apos;s 3D printer. Bridging the physical gap in educational engagement.</p>
                  <div className="flex gap-4">
                    <button className="px-8 py-4 rounded-2xl bg-brand-primary text-white font-black text-lg hover:shadow-xl hover:shadow-brand-primary/30 transition-all active:scale-95 flex items-center gap-3" onClick={() => setActiveTab('assessments')}>
                       New Assessment <ArrowRight size={20} />
                    </button>
                    <button className="px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-md text-white font-bold text-lg hover:bg-white/20 transition-all" onClick={() => setActiveTab('reports')}>
                       Review Reports
                    </button>
                  </div>
                </div>
                <div className="absolute right-12 bottom-0 text-[200px] leading-none opacity-20 select-none translate-y-20 rotate-12 transition-transform duration-1000 group-hover:rotate-0">🚀</div>
              </div>

              {/* Stats Box */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Registered Learners', value: learners.length, icon: GraduationCap, color: 'text-brand-primary', bg: 'bg-brand-primary/10' },
                  { label: 'AI Assessments', value: assessments.length, icon: Zap, color: 'text-brand-secondary', bg: 'bg-brand-secondary/10' },
                  { label: '3D Tools Generated', value: assessments.filter(a => a.recommendedToolId).length, icon: Printer, color: 'text-brand-accent', bg: 'bg-brand-accent/10' },
                  { label: 'Active Classes', value: classes.length || 0, icon: Globe, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white border border-border-main rounded-[32px] p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                       <stat.icon size={28} />
                    </div>
                    <div>
                       <h3 className="text-4xl font-black text-slate-900 leading-none">{stat.value}</h3>
                       <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2">{stat.label}</p>
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
                               <tr key={a.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => {setActiveTab('reports'); setExpandedReportId(a.id);}}>
                                  <td className="px-8 py-6 flex items-center gap-4">
                                     <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">👤</div>
                                     <div>
                                        <p className="font-bold text-slate-900 leading-none">{learners.find(l => l.id === a.learnerId)?.name || 'Unknown'}</p>
                                        <p className="text-xs text-slate-400 mt-1">Learner #{a.learnerId.substring(0, 6)}</p>
                                     </div>
                                  </td>
                                  <td className="px-8 py-6">
                                     <p className="text-sm font-medium text-slate-600 line-clamp-1 italic">&quot;{a.analysisResults?.issue || 'Processing kinematic data...'}&quot;</p>
                                  </td>
                                  <td className="px-8 py-6 text-right">
                                     <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
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
                 <div className="space-y-6">
                    <h3 className="text-2xl font-outfit font-black text-slate-900 px-4 lowercase tracking-tighter">Live feedback</h3>
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[40px] p-8 text-white shadow-xl shadow-indigo-200 group overflow-hidden relative">
                       <div className="relative z-10">
                          <Clock size={32} className="mb-4 text-indigo-300" />
                          <h4 className="text-2xl font-bold mb-2">Workstation Uptime</h4>
                          <p className="text-indigo-200 text-sm font-medium leading-relaxed">System is running at 99.9% capacity. AI inferences are currently sub-300ms.</p>
                       </div>
                       <div className="absolute -right-5 -bottom-5 text-8xl opacity-10 group-hover:scale-110 transition-transform">⚡</div>
                    </div>
                    <div className="bg-white border border-border-main rounded-[40px] p-8 shadow-sm">
                       <h4 className="font-black text-slate-400 uppercase tracking-widest text-xs mb-6">Printer Connection</h4>
                       <div className="flex items-center justify-between mb-4">
                          <span className="font-bold text-slate-900">Lab-1 PRINTER</span>
                          <span className="text-emerald-500 font-black text-xs uppercase">ONLINE</span>
                       </div>
                       <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 w-[75%]"></div>
                       </div>
                       <p className="text-[10px] font-bold text-slate-400 mt-3 italic text-right">75% filament remaining</p>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'learners' && (
            <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-5xl font-outfit font-black text-slate-900 tracking-tighter lowercase leading-none">Learner core</h1>
                    <p className="text-slate-400 text-xl font-medium mt-4">Management of student profiles and physical constraints.</p>
                  </div>
                  <button 
                    className="px-8 py-4 rounded-2xl bg-brand-primary text-white font-black text-lg shadow-xl shadow-brand-primary/20 hover:brightness-105 active:scale-95 transition-all" 
                    onClick={() => setShowAddLearner(true)}
                  >
                    + Registry Learner
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {learners.map(l => (
                    <div key={l.id} className="bg-white border border-border-main rounded-[32px] p-8 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[100px] -z-0 transition-all group-hover:bg-brand-primary/10"></div>
                       <div className="relative z-10">
                          <div className="flex justify-between items-start mb-6">
                             <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-3xl shadow-sm group-hover:rotate-6 transition-transform">👤</div>
                             <button className="p-2.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" onClick={() => {setLearnerToDelete(l); setShowDeleteConfirm(true);}}>
                               <Trash2 size={24} />
                             </button>
                          </div>
                          <h4 className="text-2xl font-black text-slate-900 mb-1 lowercase tracking-tight">{l.name}</h4>
                          <p className="text-slate-400 font-black text-xs uppercase tracking-widest italic mb-6">Age {l.age} Year Old</p>
                          
                          <div className="space-y-4 pt-6 border-t border-slate-50">
                             <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-2 leading-none">Physical constraint</p>
                                <p className="text-sm font-medium text-slate-600 line-clamp-3 leading-relaxed">{l.disabilityInfo || 'Physical Accessibility Review required.'}</p>
                             </div>
                             <button className="w-full py-3.5 rounded-xl border border-slate-100 text-slate-400 font-bold text-sm hover:border-brand-primary hover:text-brand-primary transition-all flex items-center justify-center gap-2 group/btn" onClick={() => {setSelectedLearnerId(l.id); setShowNewAssessment(true);}}>
                                Start Analysis <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
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
                          <tr key={a.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => {setExpandedReportId(a.id); setActiveTab('reports');}}>
                            <td className="px-10 py-8">
                               <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-bold text-slate-300 group-hover:rotate-3 transition-transform">📹</div>
                                  <div>
                                     <p className="font-bold text-slate-900 leading-none">{learners.find(l => l.id === a.learnerId)?.name || 'Unknown'}</p>
                                     <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">ID {a.id.substring(0, 8)}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-10 py-8">
                               <p className="text-sm font-semibold text-slate-600 max-w-[300px] leading-relaxed italic">&quot;{a.analysisResults?.issue || 'Analysis processing...'}&quot;</p>
                            </td>
                            <td className="px-10 py-8">
                               <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-xl text-xs font-bold border border-indigo-100 uppercase tracking-widest">
                                  {a.toolDescription || a.recommendedToolId || 'Evaluating solution...'}
                               </div>
                            </td>
                            <td className="px-10 py-8 text-right">
                               <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-100">
                                  <CheckCircle size={14} /> Completed
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
               <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-5xl font-outfit font-black text-slate-900 tracking-tighter lowercase leading-none">3D Library</h1>
                    <p className="text-slate-400 text-xl font-medium mt-4">Download custom generated STL blueprints for immediate 3D printing.</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {assessments.filter(a => a.recommendedToolId).map(a => (
                    <div key={`tool-${a.id}`} className="bg-white border border-border-main rounded-[40px] p-8 shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 flex items-center justify-center -z-0 group-hover:bg-brand-primary/10 transition-colors">
                          <Printer size={80} className="text-slate-100 -rotate-12 translate-x-6 translate-y-6" />
                       </div>
                       <div className="relative z-10 h-full flex flex-col">
                          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-3xl shadow-sm mb-6">🖨️</div>
                          <h4 className="text-2xl font-black text-slate-900 mb-2 lowercase tracking-tight leading-tight">{a.toolDescription || a.recommendedToolId.replace('_', ' ')}</h4>
                          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest italic mb-auto pb-8">Optimized For: {learners.find(l => l.id === a.learnerId)?.name || 'Custom Adaptation'}</p>
                          
                          <button 
                            className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-lg flex items-center justify-center gap-3 hover:bg-black active:scale-95 transition-all shadow-xl shadow-slate-200"
                            onClick={() => handleDownloadSTL(a.recommendedToolId, a.toolDescription)}
                          >
                            <Download size={22} /> Download STL
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-5xl font-outfit font-black text-slate-900 tracking-tighter lowercase leading-none">Inclusion reports</h1>
                    <p className="text-slate-400 text-xl font-medium mt-4">Full documentation of ergonomic assessments and adaptive strategies.</p>
                  </div>
                  <button className="px-8 py-4 rounded-2xl bg-slate-900 text-white font-black text-lg shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center gap-3" onClick={() => window.print()}>
                    <Printer size={20} /> Print All Work
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
                                    remarkPlugins={[remarkMath]} 
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
                               <p className="text-xs font-black text-slate-300 uppercase tracking-widest uppercase">Verified by Form-Fit AI CORE v1.5</p>
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white border border-border-main rounded-[40px] p-10 shadow-2xl w-full max-w-[600px] relative animate-in zoom-in-95 duration-300 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-slate-50">
                 <div className="h-full bg-brand-primary transition-all duration-1000" style={{ width: `${analyzing ? analysisProgress : 0}%` }}></div>
              </div>
              <button 
                className="absolute top-8 right-8 text-slate-400 hover:text-red-500 transition-colors" 
                onClick={() => setShowNewAssessment(false)}
              >
                <X size={32} />
              </button>
              
              <div className="mb-10 text-center">
                 <h3 className="text-4xl font-outfit font-black text-slate-900 mb-2 lowercase tracking-tighter">AI Assessment Core</h3>
                 <p className="text-slate-400 font-medium">Kinematic analysis for custom adaptive tooling.</p>
              </div>

              {!analyzing ? (
                <div className="flex flex-col gap-8">
                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-[3px]">Target Student</label>
                    <select 
                      className="w-full bg-slate-100 border border-slate-200 rounded-2xl py-4.5 px-6 text-slate-900 font-bold text-lg focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all appearance-none cursor-pointer" 
                      value={selectedLearnerId}
                      onChange={e => setSelectedLearnerId(e.target.value)}
                    >
                      <option value="">Select Profile...</option>
                      {learners.map(l => <option key={l.id} value={l.id}>{l.name} (Age {l.age})</option>)}
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-[3px]">Media Ingestion</label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex flex-col items-center justify-center gap-4 p-10 border-2 border-dashed border-slate-200 rounded-[30px] hover:border-brand-primary hover:bg-brand-primary/5 cursor-pointer transition-all group/upload">
                        <Upload size={48} className="text-slate-300 group-hover/upload:text-brand-primary transition-colors" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover/upload:text-brand-primary">Upload Video/Image</span>
                        <input type="file" className="hidden" onChange={e => setAssessmentFile(e.target.files[0])} />
                      </label>
                      <button className="flex flex-col items-center justify-center gap-4 p-10 border-2 border-slate-200 rounded-[30px] hover:border-brand-primary hover:bg-brand-primary/5 transition-all text-slate-300 hover:text-brand-primary group/cam">
                        <Camera size={48} className="group-hover/cam:scale-110 transition-transform" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover/cam:text-brand-primary">Live Session</span>
                      </button>
                    </div>
                  </div>

                  {assessmentFile && (
                    <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex items-center justify-between animate-in zoom-in-95">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-lg">
                           <CheckCircle size={24} />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-black text-emerald-900 truncate uppercase tracking-tighter">{assessmentFile.name}</span>
                           <span className="text-[10px] font-bold text-emerald-600 uppercase">File Verified</span>
                        </div>
                      </div>
                      <button className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center" onClick={() => setAssessmentFile(null)}><X size={20} /></button>
                    </div>
                  )}

                  <div className="flex gap-4 mt-4 pt-8 border-t border-slate-50">
                    <button 
                      className="flex-1 py-5 rounded-3xl bg-brand-primary text-white font-black text-xl shadow-2xl shadow-brand-primary/20 hover:brightness-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale" 
                      onClick={runAssessment}
                      disabled={!selectedLearnerId || !assessmentFile}
                    >
                      Process Workstation
                    </button>
                    <button 
                      className="px-10 py-5 rounded-3xl bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 transition-all font-outfit" 
                      onClick={() => setShowNewAssessment(false)}
                    >
                      Abort
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-10 py-10 animate-pulse">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <div className="absolute inset-0 border-[10px] border-slate-100 rounded-full"></div>
                    <div className="absolute inset-0 border-[10px] border-transparent border-t-brand-primary rounded-full animate-spin"></div>
                    <div className="absolute inset-4 border border-brand-primary/20 rounded-full animate-ping"></div>
                    <span className="text-3xl font-black text-brand-primary font-outfit">{Math.round(analysisProgress)}%</span>
                  </div>
                  <div className="text-center space-y-3">
                    <span className="text-3xl font-outfit font-black text-brand-primary tracking-[0.3em] uppercase">{fakeStep}</span>
                    <p className="text-slate-400 font-bold text-lg uppercase tracking-widest">{analysisStep}</p>
                  </div>
                  <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-brand-primary via-indigo-500 to-indigo-700 transition-all duration-700" style={{ width: `${analysisProgress}%` }}></div>
                  </div>
                  <button className="text-red-500 font-black uppercase text-xs tracking-widest hover:underline hover:scale-110 transition-transform" onClick={() => setAnalyzing(false)}>Abort sequence</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Learner Modal */}
        {showAddLearner && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white border border-border-main rounded-[40px] p-12 shadow-2xl w-full max-w-[600px] animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-4xl font-outfit font-black text-slate-900 lowercase tracking-tighter">Student Registry</h3>
                <button onClick={() => setShowAddLearner(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={32} /></button>
              </div>
              <form onSubmit={handleAddLearner} className="flex flex-col gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-[3px]">Personal Profile</label>
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4.5 px-6 text-slate-900 font-bold text-lg focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all placeholder:text-slate-300 placeholder:italic" placeholder="Student Full Name" onChange={e => setNewLearnerData({ ...newLearnerData, name: e.target.value })} required />
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4.5 px-6 text-slate-900 font-bold text-lg focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all placeholder:text-slate-300 placeholder:italic" type="number" placeholder="Biological Age" onChange={e => setNewLearnerData({ ...newLearnerData, age: e.target.value })} required />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-[3px]">Kinematic constraints</label>
                  <textarea className="w-full bg-slate-50 border border-slate-200 rounded-3xl py-6 px-6 text-slate-900 font-bold text-lg focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all min-h-[160px] resize-none placeholder:text-slate-300 placeholder:italic" placeholder="Detailed physical needs (e.g., limited forearm supination, proximal instability)" onChange={e => setNewLearnerData({ ...newLearnerData, disabilityInfo: e.target.value })} required />
                </div>
                <div className="flex gap-4 mt-4">
                  <button className="flex-1 py-5 rounded-3xl bg-brand-primary text-white font-black text-xl shadow-2xl shadow-brand-primary/20 hover:brightness-105 active:scale-95 transition-all" type="submit">Complete Registry</button>
                  <button className="px-10 py-5 rounded-3xl bg-slate-50 border border-slate-200 text-slate-500 font-bold hover:bg-slate-100 transition-all" type="button" onClick={() => setShowAddLearner(false)}>Cancel</button>
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
