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
  Camera, X, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, Trash2, Globe, Clock,
  ArrowRight, Download, Filter, Menu, UserCheck
} from 'lucide-react';
import { db } from '@/lib/firebase';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Persistence for active tab
  useEffect(() => {
    const savedTab = localStorage.getItem('formFitActiveTab');
    if (savedTab) setActiveTab(savedTab);
  }, []);

  useEffect(() => {
    localStorage.setItem('formFitActiveTab', activeTab);
  }, [activeTab]);

  const [showAddClient, setShowAddClient] = useState(false);
  const [showNewAssessment, setShowNewAssessment] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: '', age: '', disabilityInfo: '' });
  const [assessmentFile, setAssessmentFile] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [fakeStep, setFakeStep] = useState('thinking...');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssessmentDeleteConfirm, setShowAssessmentDeleteConfirm] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [assessmentToDelete, setAssessmentToDelete] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [clients, setClients] = useState([]);
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
    let processed = typeof content === 'string' ? content.trim() : String(content);
    if ((processed.startsWith('{') && processed.endsWith('}')) || processed.includes('"details"')) {
      try {
        const parsed = JSON.parse(processed);
        if (parsed.details) return cleanReportContent(parsed.details);
      } catch (e) {
        const detailsMatch = processed.match(/"details"\s*:\s*"([\s\S]*?)"(?=\s*\}|\s*,"[a-zA-Z]+"\s*:)/);
        if (detailsMatch && detailsMatch[1]) {
           let extracted = detailsMatch[1];
           extracted = extracted.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
           return cleanReportContent(extracted);
        }
      }
    }
    return processed
      .replace(/\\documentclass\{[\s\S]*?\\begin\{document\}/g, '')
      .replace(/\\end\{document\}/g, '')
      .replace(/\\section\*?\{/g, '## ')
      .replace(/\\subsection\*?\{/g, '### ')
      .replace(/\\textbf\{([\s\S]*?)\}/g, '**$1**')
      .replace(/\\textit\{([\s\S]*?)\}/g, '*$1*')
      .trim();
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

      const [clientsRes, assessmentsRes, classesRes, tasksRes, activitiesRes] = await Promise.all([
        fetch('/api/learners', { headers }),
        fetch('/api/assessments', { headers }),
        fetch('/api/classes', { headers }),
        fetch('/api/tasks', { headers }),
        fetch('/api/activities', { headers })
      ]);

      const [clientsData, assessmentsData, classesData, tasksData, activitiesData] = await Promise.all([
        clientsRes.json(),
        assessmentsRes.json(),
        classesRes.json(),
        tasksRes.json(),
        activitiesRes.json()
      ]);

      setClients(clientsData || []);
      setAssessments(assessmentsData || []);
      setClasses(classesData || []);
      setTasks(tasksData || []);
      setActivities(activitiesData || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      showToast("Sync failure. Check connectivity.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const token = await currentUser.getIdToken();
        const res = await fetch('/api/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.onboardingComplete) {
          router.push('/onboarding');
          return;
        }
        fetchAllData(currentUser);
      } else {
        router.push('/login');
      }
    });
    return () => unsubAuth();
  }, [router, fetchAllData]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!newClientData.name) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/learners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newClientData)
      });
      if (res.ok) {
        showToast(`Client ${newClientData.name} registered.`);
        setShowAddClient(false);
        setNewClientData({ name: '', age: '', disabilityInfo: '' });
        fetchAllData(user);
      }
    } catch (err) {
      showToast("Registration failed.", 'error');
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/learners?id=${clientToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Client record expunged.");
        setShowDeleteConfirm(false);
        setClientToDelete(null);
        fetchAllData(user);
      }
    } catch (err) {
      showToast("Deletion failed.", 'error');
    }
  };

  const handleDeleteAssessment = async () => {
    if (!assessmentToDelete) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/assessments?id=${assessmentToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Assessment record purged.");
        setShowAssessmentDeleteConfirm(false);
        setAssessmentToDelete(null);
        fetchAllData(user);
      }
    } catch (err) {
      showToast("Purge failed.", 'error');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) setAssessmentFile(file);
  };

  const runAssessment = async () => {
    if (!assessmentFile || !selectedClientId) return;
    setAnalyzing(true);
    setAnalysisStep('Booting AI agents...');
    setAnalysisProgress(5);

    const reader = new FileReader();
    reader.readAsDataURL(assessmentFile);
    reader.onload = async () => {
      const base64Content = reader.result.split(',')[1];
      const mimeType = assessmentFile.type;
      const mediaType = mimeType.startsWith('video') ? 'video' : 'image';

      abortControllerRef.current = new AbortController();
      const token = await user.getIdToken();
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          mediaBase64: base64Content,
          mimeType,
          mediaType,
          clientId: selectedClientId,
          mode: 'analysis'
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        showToast("AI Core offline or failed.", 'error');
        setAnalyzing(false);
        return;
      }

      const readerStream = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await readerStream.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'progress') {
              setAnalysisStep(data.message);
              setAnalysisProgress(data.progress || 50);
            } else if (data.type === 'complete') {
              showToast("Analysis complete!");
              setAnalyzing(false);
              setShowNewAssessment(false);
              setAssessmentFile(null);
              fetchAllData(user);
            }
          }
        }
      }
    };
  };

  const handleRefineWithAI = async (assessmentId, feedback) => {
    if (!feedback || feedback.trim().length < 5) {
      showToast("Please provide more detailed feedback.", "info");
      return;
    }

    setAnalyzing(true);
    setAnalysisStep("Initializing Refinement Agent...");
    setAnalysisProgress(10);

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          mode: 'refine',
          assessmentId,
          clientFeedback: feedback
        })
      });

      if (!response.ok) {
        showToast("Refinement failed.", 'error');
        setAnalyzing(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'progress') {
              setAnalysisStep(data.message);
              setAnalysisProgress(data.progress || 50);
            } else if (data.type === 'complete') {
              showToast("Refinement complete!");
              setAnalyzing(false);
              setExpandedReportId(null);
              fetchAllData(user);
            }
          }
        }
      }
    } catch (err) {
      console.error("[REFINE ERROR]", err);
      showToast("Refinement engine error.", "error");
      setAnalyzing(false);
    }
  };

  const handleUpdateFeedback = async (id, feedback) => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/assessments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ clientFeedback: feedback })
      });
      if (res.ok) {
        showToast("Suggestions saved.");
        fetchAllData(user);
      }
    } catch (err) {
      showToast("Sync failed.", "error");
    }
  };

  const handleDownloadSTL = (assessment) => {
    if (!assessment.stlData) return;
    const blob = new Blob([assessment.stlData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assessment.toolDescription.replace(/\s+/g, '_')}_blueprint.stl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("STL Blueprint exported.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-brand-primary rounded-full animate-spin"></div>
        <p className="font-outfit font-black text-slate-300 uppercase tracking-[0.3em] text-xs">Syncing Core Data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-inter text-slate-900 selection:bg-brand-primary/10 selection:text-brand-primary">
      {/* Sidebar Navigation */}
      <aside className={`fixed top-0 left-0 bottom-0 w-72 bg-white border-r border-border-main z-[60] transition-transform duration-500 lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="p-8 pb-12 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
             <img src="/logo.png" alt="Logo" className="w-6" />
          </div>
          <span className="font-outfit font-black text-2xl tracking-tighter lowercase">form-fit</span>
        </div>

        <nav className="px-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'clients', label: 'Clients', icon: Users },
            { id: 'assessments', label: 'Assessments', icon: Camera },
            { id: '3d-tools', label: '3D Tools', icon: Printer },
            { id: 'reports', label: 'Reports', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-8 left-0 right-0 px-8">
           <button 
             onClick={handleLogout}
             className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold text-sm text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
           >
             <LogOut size={20} />
             Logout System
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72 min-h-screen">
        <header className="sticky top-0 right-0 left-0 bg-white/80 backdrop-blur-md border-b border-border-main z-50 p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <button className="lg:hidden text-slate-500" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                <Menu size={24} />
             </button>
             <div className="relative hidden md:block">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
               <input 
                 type="text" 
                 placeholder="Search registry..." 
                 className="bg-slate-100 border-none rounded-2xl py-2.5 pl-11 pr-6 text-sm font-medium w-64 focus:ring-2 focus:ring-brand-primary/20 transition-all"
               />
             </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="text-slate-300 hover:text-slate-500 transition-colors relative">
               <Bell size={22} />
               <div className="absolute top-0 right-0 w-2 h-2 bg-brand-primary rounded-full border-2 border-white"></div>
            </button>
            <div className="w-[1px] h-8 bg-slate-100"></div>
            
            <div 
              className="flex items-center gap-4 pl-3 group cursor-pointer"
              onClick={() => showToast("Profile active", "info")}
            >
              <div className="text-right hidden md:block">
                <p className="text-[0.9rem] font-bold text-slate-900 leading-tight group-hover:text-brand-primary transition-colors">{user?.email}</p>
              </div>
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center font-bold text-white text-base shadow-xl shadow-brand-primary/10 group-hover:scale-105 transition-all">
                {user?.email?.[0].toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="p-6 md:p-10 max-w-[1600px] mx-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Clients', value: clients.length, icon: Users, color: 'text-brand-primary' },
                    { label: 'Assessments', value: assessments.length, icon: Camera, color: 'text-brand-accent' },
                    { label: 'Active Tasks', value: tasks.length, icon: GraduationCap, color: 'text-emerald-500' },
                    { label: '3D Prototypes', value: assessments.filter(a => a.stlData).length, icon: Printer, color: 'text-indigo-500' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[28px] border border-border-main shadow-sm hover:shadow-md transition-all group">
                       <div className="flex justify-between items-start mb-4">
                          <div className={`p-3 rounded-2xl bg-slate-50 ${stat.color} group-hover:scale-110 transition-transform`}>
                             <stat.icon size={24} />
                          </div>
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Live Sync</span>
                       </div>
                       <p className="text-3xl font-black text-slate-900 mb-1">{stat.value}</p>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                    </div>
                  ))}
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                     <div className="flex justify-between items-end px-2">
                        <h2 className="text-xl font-bold font-outfit text-slate-900 tracking-tight lowercase">Recent Assessments</h2>
                        <button onClick={() => setActiveTab('assessments')} className="text-xs font-bold text-brand-primary hover:underline uppercase tracking-widest">View All</button>
                     </div>
                     <div className="bg-white rounded-[32px] border border-border-main shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                           <table className="w-full text-left">
                              <thead>
                                 <tr className="border-b border-slate-50">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-300 uppercase tracking-widest">Client</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-300 uppercase tracking-widest">Date</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-300 uppercase tracking-widest">Assessment Issue</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-300 uppercase tracking-widest">Status</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                 {assessments.slice(0, 5).map((a) => (
                                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => { setExpandedReportId(a.id); setActiveTab('reports'); }}>
                                       <td className="px-8 py-5">
                                          <div className="flex items-center gap-3">
                                             <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center font-bold text-xs">
                                                {clients.find(l => l.id === a.learnerId)?.name?.[0]}
                                             </div>
                                             <span className="font-bold text-sm text-slate-700">{clients.find(l => l.id === a.learnerId)?.name}</span>
                                          </div>
                                       </td>
                                       <td className="px-8 py-5 text-slate-500 font-medium text-xs">{new Date(a.timestamp).toLocaleDateString()}</td>
                                       <td className="px-8 py-5">
                                          <span className="text-xs font-bold text-slate-900 line-clamp-1 max-w-[200px]">{a.analysisResults?.issue || 'Initial Analysis'}</span>
                                       </td>
                                       <td className="px-8 py-5">
                                          <div className="flex items-center gap-2">
                                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                             <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Processed</span>
                                          </div>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="flex justify-between items-end px-2">
                        <h2 className="text-xl font-bold font-outfit text-slate-900 tracking-tight lowercase">AI Workstation</h2>
                        <Zap size={18} className="text-brand-primary" />
                     </div>
                     <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-12 text-white/5 group-hover:rotate-12 transition-transform duration-700">
                           <GraduationCap size={160} />
                        </div>
                        <div className="relative z-10">
                           <p className="text-[10px] font-black text-brand-accent uppercase tracking-[0.3em] mb-4">Core Engine Active</p>
                           <h3 className="text-3xl font-outfit font-black tracking-tighter leading-none lowercase mb-6">Analyze. Print.<br />Empower.</h3>
                           <p className="text-white/40 text-sm font-medium leading-relaxed mb-10">Launch the kinematic workstation to analyze new client recordings and generate custom 3D printable assistive tools.</p>
                           <button 
                             onClick={() => setShowNewAssessment(true)}
                             className="w-full py-4 rounded-2xl bg-white text-slate-900 font-black text-sm shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                           >
                             Start New Analysis <ArrowRight size={20} />
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
                  <div>
                    <h1 className="text-3xl font-outfit font-bold text-slate-900 tracking-tight lowercase">Client Registry</h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">Manage all client profiles and kinematic data.</p>
                  </div>
                  <button onClick={() => setShowAddClient(true)} className="px-6 py-3.5 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-lg shadow-slate-200 hover:bg-black transition-all flex items-center gap-2 justify-center">
                    <Users size={20} /> Register Client
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {clients.map(l => (
                   <div key={l.id} className="bg-white border border-border-main rounded-[32px] p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => { setClientToDelete(l); setShowDeleteConfirm(true); }} className="text-red-400 hover:text-red-500">
                           <Trash2 size={20} />
                         </button>
                      </div>
                      <div className="flex flex-col items-center text-center">
                         <div className="w-20 h-20 rounded-[28px] bg-slate-50 flex items-center justify-center text-2xl font-black text-slate-900 mb-4 group-hover:scale-110 transition-transform">
                            {l.name[0]}
                         </div>
                         <h3 className="text-lg font-bold text-slate-900 truncate w-full">{l.name}</h3>
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Age: {l.age || 'N/A'}</p>
                         <p className="text-[10px] font-medium text-slate-400 mt-4 line-clamp-2">{l.disabilityInfo || 'No bio provided.'}</p>
                         
                         <div className="mt-8 pt-8 border-t border-slate-50 w-full flex justify-between items-center">
                            <div className="text-left">
                               <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Assessments</p>
                               <p className="font-bold text-slate-900">{assessments.filter(a => a.learnerId === l.id).length}</p>
                            </div>
                            <button onClick={() => { setActiveTab('reports'); setSearchTerm?.(l.name); }} className="p-3 rounded-xl bg-slate-50 text-slate-400 hover:text-brand-primary transition-colors">
                               <ArrowRight size={20} />
                            </button>
                         </div>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'assessments' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-center py-20">
               <div className="max-w-[500px] mx-auto space-y-6">
                  <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center mx-auto text-slate-200">
                     <Camera size={48} />
                  </div>
                  <h1 className="text-3xl font-outfit font-black text-slate-900 tracking-tighter lowercase">Visual Assessment Core</h1>
                  <p className="text-slate-400 font-medium">To run a new visual assessment, please use the <strong>AI Workstation</strong> on the main dashboard tab.</p>
                  <button onClick={() => setActiveTab('dashboard')} className="px-8 py-4 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-xl shadow-slate-200">Go to Workstation</button>
               </div>
            </div>
          )}

          {activeTab === '3d-tools' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
                  <div>
                    <h1 className="text-3xl font-outfit font-bold text-slate-900 tracking-tight lowercase">3D Blueprint Lab</h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">Export parametric STL designs for local fabrication.</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {assessments.filter(a => a.stlData).map(a => (
                    <div key={`stl-${a.id}`} className="bg-white border border-border-main rounded-[40px] p-10 shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative">
                       <div className="absolute top-0 right-0 p-8 text-slate-50 group-hover:text-slate-100/50 transition-colors -z-10">
                          <Printer size={120} />
                       </div>
                       <div className="space-y-8 relative z-10">
                          <div className="space-y-2">
                             <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
                               <Printer size={24} />
                             </div>
                             <h3 className="text-2xl font-black text-slate-900 lowercase tracking-tighter pt-2">{a.toolDescription}</h3>
                             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{a.analysisResults?.stlSpecs?.type || 'Grip'} Adaptation</p>
                          </div>

                          <div className="bg-slate-50 rounded-2xl p-6 flex flex-col gap-3">
                             <div className="flex justify-between items-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                <span>Parametric Specs</span>
                                <span>STL v{a.id.substring(0,4)}</span>
                             </div>
                             <div className="flex flex-wrap gap-2 pt-2">
                                {Object.entries(a.analysisResults?.stlSpecs?.dimensions || {}).slice(0, 3).map(([key, val]) => (
                                   <div key={key} className="px-3 py-1.5 rounded-lg bg-white border border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                      {key}: {val}mm
                                   </div>
                                ))}
                             </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px]">
                              <div className="flex flex-col gap-1">
                                 <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Assigned Client</span>
                                 <span className="font-bold text-slate-700">{clients.find(l => l.id === a.learnerId)?.name || 'General Access'}</span>
                              </div>
                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-50 text-slate-400 font-black uppercase tracking-tighter text-[8px]">{a.analysisResults?.category || 'Accessibility'}</span>
                          </div>

                          <button 
                            className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-slate-200 hover:bg-black transition-all flex items-center justify-center gap-2"
                            onClick={() => handleDownloadSTL(a)}
                          >
                            <Download size={14} /> Export STL Blueprint
                          </button>
                       </div>
                    </div>
                  ))}
               </div>

               {assessments.filter(a => a.stlData).length === 0 && (
                  <div className="px-10 py-20 text-center">
                     <div className="flex flex-col items-center gap-3 text-slate-300">
                        <Printer size={48} />
                        <p className="font-bold text-lg lowercase">No tools generated yet</p>
                     </div>
                  </div>
               )}
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
                             <div>
                                <h3 className="text-xl md:text-2xl font-black text-slate-900 lowercase tracking-tight">Report for {clients.find(l => l.id === a.learnerId)?.name || 'Client Profile'}</h3>
                                <p className="text-slate-400 font-bold text-[10px] md:text-sm mt-1 uppercase tracking-wider">
                                  {new Date(a.timestamp).toLocaleDateString()}
                                  {isExpanded && a.analysisResults?.issue && (
                                    <span className="block mt-2 normal-case font-medium text-slate-400 leading-relaxed max-w-[600px]">
                                      {a.analysisResults.issue}
                                    </span>
                                  )}
                                </p>
                             </div>
                          </div>
                          <div className={`w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center transition-transform duration-500 ${isExpanded ? 'rotate-180 bg-brand-primary/10 text-brand-primary' : ''}`}>
                             <ChevronDown size={28} />
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="animate-in slide-in-from-top duration-500">
                             <div className="p-0 sm:p-4 md:p-12 border-t border-border-main bg-slate-50/30">
                                <div className="w-full max-w-[850px] mx-auto bg-white px-6 py-12 md:px-24 md:py-28 shadow-[0_10px_50px_rgba(0,0,0,0.1)] border border-slate-200 rounded-[2px] min-h-[1150px] relative overflow-hidden flex flex-col gap-8 md:gap-12 font-[family:'Georgia','Times_New_Roman',serif] leading-relaxed text-slate-800">
                                   <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4 border-b-2 border-slate-100 pb-10 opacity-70">
                                      <div className="flex items-center gap-2">
                                         <img src="/logo.png" alt="Logo" className="w-5 h-5" />
                                         <span className="font-outfit font-bold text-xs uppercase tracking-tighter">Form-Fit Client</span>
                                      </div>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center sm:text-right">Confidential Kinematic Report</span>
                                   </div>

                                   {/* AI Proposed Device Preview */}
                                   {a.previewImage && (
                                     <div className="space-y-4 animate-in fade-in duration-1000">
                                       <div className="flex items-center gap-2 mb-2">
                                         <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></div>
                                         <span className="text-[10px] font-black text-brand-accent uppercase tracking-[0.2em]">AI Structural Visualization</span>
                                       </div>
                                       <div className="relative group rounded-[32px] overflow-hidden border border-slate-200 bg-slate-50 aspect-video md:aspect-[21/9] shadow-inner">
                                         <img 
                                           src={a.previewImage} 
                                           alt="Proposed Device Preview" 
                                           className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                                         />
                                         <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                                         <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end text-white">
                                           <div>
                                              <p className="font-outfit font-black text-lg md:text-2xl leading-none lowercase tracking-tighter">{a.toolDescription || 'Assistive Prototype'}</p>
                                              <p className="text-[10px] md:text-sm font-bold opacity-80 uppercase tracking-widest mt-2">Gemini 3.0 Pro Image Preview</p>
                                           </div>
                                           <div className="px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-widest">
                                              Proposal
                                           </div>
                                         </div>
                                       </div>
                                       <p className="text-xs text-slate-400 font-medium italic text-center">**Disclaimer**: This image is an AI-generated approximation of the structural proposal for visualization purposes.</p>
                                     </div>
                                   )}

                                   <div className="prose prose-slate [&_h1]:font-outfit [&_h1]:font-black [&_h1]:tracking-tight [&_h1]:text-slate-900 [&_h1]:text-4xl [&_h1]:mb-12 [&_h2]:font-outfit [&_h2]:font-black [&_h2]:tracking-tight [&_h2]:text-slate-900 [&_h2]:text-2xl [&_h2]:mt-10 [&_h2]:mb-6 [&_h2]:border-b [&_h2]:border-slate-100 [&_h2]:pb-2 [&_h3]:font-outfit [&_h3]:font-black [&_h3]:tracking-tight [&_h3]:text-slate-900 [&_h3]:text-lg [&_p]:text-lg [&_p]:mb-6 [&_p]:leading-[1.8] [&_strong]:text-slate-900 [&_li]:text-lg [&_li]:mb-2 [&_table]:border-collapse [&_th]:bg-slate-50 [&_th]:p-4 [&_td]:p-4 [&_td]:border [&_td]:border-slate-100 max-w-none">
                                      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                                        {cleanReportContent((a.reportChunks && a.reportChunks.length > 0) 
                                          ? a.reportChunks.join('') 
                                          : (a.reportSummary || a.analysisResults?.details || 'Retrieving assessment data...'))}
                                      </ReactMarkdown>
                                   </div>

                                   <div className="mt-auto pt-10 border-t border-slate-100 flex justify-between items-center opacity-40 italic text-[10px] tracking-widest uppercase">
                                      <span>Generated by Gemini 2.5 Flash</span>
                                      <span>© {new Date().getFullYear()} Form-Fit Assistive Tech</span>
                                   </div>
                                </div>

                                <div className="mt-16 pt-12 border-t border-slate-100 space-y-6 print:hidden">
                                   <div className="flex items-center gap-3">
                                      <div className="w-1.5 h-6 bg-brand-primary rounded-full"></div>
                                      <h4 className="font-outfit font-black text-slate-900 uppercase tracking-widest text-sm">Collaborative Review</h4>
                                   </div>
                                   <p className="text-slate-400 text-sm font-medium">You can refine the model below by submitting your specific design suggestions.</p>
                                   <textarea 
                                     className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 md:p-8 font-inter font-medium text-slate-900 text-sm md:text-base outline-none focus:border-brand-primary transition-all min-h-[140px] resize-none placeholder:text-slate-300"
                                     placeholder="Suggested improvements (e.g. 'increase grip diameter by 5mm', 'add ventilation slots', 'soften the edges')..."
                                     value={a.clientFeedback || ''}
                                     onChange={(e) => {
                                        const newAssessments = assessments.map(item => 
                                           item.id === a.id ? { ...item, clientFeedback: e.target.value } : item
                                        );
                                        setAssessments(newAssessments);
                                     }}
                                   />
                                   <div className="flex flex-col sm:flex-row gap-4">
                                     <button 
                                       className="flex-1 py-4 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
                                       onClick={() => handleUpdateFeedback(a.id, a.clientFeedback)}
                                     >
                                        Save Suggestion
                                     </button>
                                     <button 
                                       className="flex-1 py-4 rounded-2xl bg-brand-primary text-white font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-primary/10"
                                       onClick={() => handleRefineWithAI(a.id, a.clientFeedback)}
                                     >
                                        Refine with AI <Zap size={18} fill="currentColor" />
                                     </button>
                                   </div>
                                </div>
                             </div>
                             <div className="p-10 bg-slate-50 border-t border-border-main flex justify-between items-center no-print">
                                <div className="flex gap-3">
                                   <button onClick={() => window.print()} className="px-6 py-3 rounded-xl bg-brand-primary text-white font-bold text-sm shadow-md hover:brightness-105 transition-all">Export PDF</button>
                                   <button className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold text-sm hover:bg-slate-50 transition-all" onClick={() => setExpandedReportId(null)}>Collapse Focus</button>
                                   <button 
                                     className="px-6 py-3 rounded-xl bg-red-50 text-red-500 font-bold text-sm hover:bg-red-100 transition-all flex items-center gap-2"
                                     onClick={() => { setAssessmentToDelete(a); setShowAssessmentDeleteConfirm(true); }}
                                   >
                                     <Trash2 size={16} /> Delete Report
                                   </button>
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
        </main>

        {/* New Assessment Modal */}
        {showNewAssessment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white border border-border-main rounded-2xl p-6 shadow-2xl w-full max-w-[500px] relative animate-in zoom-in-95">
              <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" onClick={() => setShowNewAssessment(false)}><X size={24} /></button>
              <div className="mb-6">
                 <h3 className="text-xl font-bold text-slate-900 tracking-tight">AI Assessment Core</h3>
                 <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Kinematic Analysis Station</p>
              </div>

              {!analyzing ? (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Client</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 font-bold text-sm outline-none focus:border-brand-primary transition-all"
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                    >
                      <option value="">Select a client...</option>
                      {clients.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recording Source</label>
                    <div 
                      className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${assessmentFile ? 'border-brand-primary bg-brand-primary/5' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
                      onClick={() => fileInputRef.current.click()}
                    >
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                      {assessmentFile ? (
                        <>
                          <div className="w-16 h-16 rounded-2xl bg-brand-primary text-white flex items-center justify-center shadow-xl shadow-brand-primary/20">
                             <CheckCircle size={32} />
                          </div>
                          <div className="text-center">
                             <p className="font-bold text-slate-900">{assessmentFile.name}</p>
                             <p className="text-[10px] text-brand-primary font-black uppercase tracking-widest">File Armed</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center">
                             <Camera size={32} />
                          </div>
                          <p className="font-bold text-slate-400 text-sm">Upload interaction capture</p>
                        </>
                      )}
                    </div>
                  </div>
                  <button 
                    className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-sm shadow-xl hover:bg-black transition-all disabled:opacity-30"
                    onClick={runAssessment}
                    disabled={!selectedClientId || !assessmentFile}
                  >
                    Initiate Kinematic Pass
                  </button>
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center gap-10">
                   <div className="relative w-32 h-32">
                      <div className="absolute inset-0 border-4 border-slate-100 rounded-[40px]"></div>
                      <div className="absolute inset-0 border-4 border-brand-primary rounded-[40px] animate-spin border-t-transparent"></div>
                      <div className="absolute inset-0 flex items-center justify-center text-brand-primary">
                         <Zap size={40} className="animate-pulse" />
                      </div>
                   </div>
                   <div className="text-center space-y-3">
                      <p className="text-2xl font-black text-slate-900 tracking-tighter lowercase">{analysisStep}</p>
                      <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden mx-auto">
                        <div className="h-full bg-brand-primary transition-all duration-500" style={{ width: `${analysisProgress}%` }}></div>
                      </div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Core Analysis Progress: {analysisProgress}%</p>
                      <button onClick={handleAbort} className="text-xs font-bold text-red-500 hover:underline mt-4">Abort Instance</button>
                   </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Delete Confirmations */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl p-8 shadow-2xl w-full max-w-[400px] text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Delete Client Record?</h3>
                <p className="text-slate-400 text-sm mt-2">This will permanently erase the client profile and all associated data.</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-xl bg-slate-50 text-slate-500 font-bold text-sm">Cancel</button>
                <button onClick={handleDeleteClient} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all">Yes, Erase</button>
              </div>
            </div>
          </div>
        )}

        {showAssessmentDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl p-8 shadow-2xl w-full max-w-[400px] text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Purge Assessment?</h3>
                <p className="text-slate-400 text-sm mt-2">You are about to remove this kinematic report and the associated 3D blueprint.</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowAssessmentDeleteConfirm(false)} className="flex-1 py-3 rounded-xl bg-slate-50 text-slate-500 font-bold text-sm">Stay Safe</button>
                <button onClick={handleDeleteAssessment} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all">Purge Data</button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl border text-white font-bold text-sm animate-in slide-in-from-right-10 flex items-center gap-3 ${toast.type === 'error' ? 'bg-red-500 border-red-600' : (toast.type === 'info' ? 'bg-indigo-500 border-indigo-600' : 'bg-slate-900 border-slate-950')}`}>
            {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
