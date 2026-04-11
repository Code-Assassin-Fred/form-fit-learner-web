'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, ChevronRight, Play, Layout, Shield, Cpu } from 'lucide-react';

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-bg-main text-text-main font-inter selection:bg-brand-accent selection:text-white">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 h-20 z-[100] flex items-center transition-all duration-700 ${scrolled ? 'bg-gradient-to-br from-[#0F172A] to-[#1E293B] border-b border-slate-800' : 'bg-transparent'}`}>
        <div className="w-full max-w-[1400px] mx-auto px-8 flex justify-between items-center text-[0.9rem]">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform duration-500">
              <img src="/logo.png" alt="Logo" className="h-6 w-auto" />
            </div>
            <span className={`font-outfit font-black text-2xl tracking-tighter transition-colors ${scrolled ? 'text-white' : 'text-brand-primary'}`}>form-fit</span>
          </div>
          
          <div className="hidden md:flex items-center gap-10">
            <a href="#mission" className={`transition-colors font-semibold ${scrolled ? 'text-slate-300 hover:text-white' : 'text-text-muted hover:text-brand-accent'}`}>Mission</a>
            <a href="#features" className={`transition-colors font-semibold ${scrolled ? 'text-slate-300 hover:text-white' : 'text-text-muted hover:text-brand-accent'}`}>Features</a>
            <a href="#creator" className={`transition-colors font-semibold ${scrolled ? 'text-slate-300 hover:text-white' : 'text-text-muted hover:text-brand-accent'}`}>About</a>
            <div className={`h-4 w-[1px] mx-2 ${scrolled ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
            <button 
              onClick={() => router.push('/login')}
              className={`px-6 py-2.5 rounded-full transition-all font-bold ${scrolled ? 'text-slate-300 hover:text-white' : 'text-brand-primary hover:text-brand-accent'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => router.push('/dashboard')}
              className={`px-7 py-2.5 rounded-full shadow-xl transition-all font-bold ${scrolled ? 'bg-white text-brand-primary hover:bg-slate-100' : 'bg-brand-primary text-white hover:bg-slate-800 shadow-brand-primary/10'}`}
            >
              Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-[140px] pb-24 px-8 min-h-screen flex justify-center items-center relative overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-[-20%] right-[-10%] w-[1000px] h-[1000px] bg-brand-secondary/5 blur-[160px] rounded-full -z-10 animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[800px] h-[800px] bg-brand-accent/5 blur-[140px] rounded-full -z-10 animate-pulse delay-1000"></div>

        <div className="max-w-[1400px] w-full flex flex-col items-center">
          <div className="text-center max-w-[900px] mb-20 relative z-10">
            <h1 className="text-5xl md:text-[5.5rem] font-outfit font-black leading-[1] mb-10 tracking-tighter text-brand-primary lowercase px-4">
              inclusive classrooms.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#F97316] to-[#FB923C]">ai-driven comfort.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-text-muted max-w-[700px] mx-auto mb-14 leading-relaxed font-medium px-4">
              advanced ai analyzes physical inabilities to generate custom, 3d-printable assistive tools. empowering every learner to reach their full potential.
            </p>
            
            <div className="flex flex-wrap gap-5 justify-center">
              <button 
                onClick={() => router.push('/login')}
                className="group px-10 py-4 rounded-2xl font-black text-[0.9rem] bg-gradient-to-br from-[#F97316] to-[#FB923C] text-white shadow-2xl shadow-brand-accent/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
              >
                Start Assessment Free
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-10 py-4 rounded-2xl font-black text-[0.9rem] bg-white border border-slate-200 text-brand-primary shadow-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-2">
                <Play size={16} fill="currentColor" />
                See How It Works
              </button>
            </div>
          </div>
          
          {/* Hero Mockup */}
          <div className="w-full max-w-[1200px] relative z-10">
            <div className="group rounded-[48px] bg-white/40 backdrop-blur-md border border-white p-5 relative overflow-hidden shadow-[0_60px_120px_-20px_rgba(15,23,42,0.12)] transition-all duration-1000 hover:shadow-[0_80px_150px_-30px_rgba(15,23,42,0.18)]">
               <div className="bg-slate-900 rounded-[36px] overflow-hidden border border-slate-800 shadow-2xl relative">
                  <div className="flex gap-2 px-8 py-5 bg-slate-900/50 backdrop-blur-md border-b border-slate-800/50 absolute top-0 left-0 right-0 z-20">
                    <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                  </div>
                  <img src="/hero-premium.png" alt="Inclusive Education" className="w-full h-auto object-cover transition-all duration-1000 group-hover:scale-[1.05]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent pointer-events-none"></div>
               </div>
               
               {/* Floating Badges */}
                <div className="absolute -left-6 md:-left-12 bottom-[15%] bg-white/60 backdrop-blur-2xl border border-white/40 shadow-[0_32px_64px_-16px_rgba(15,23,42,0.06)] p-6 md:p-8 rounded-[32px] shadow-2xl animate-float">
                   <div className="flex flex-col items-start gap-1">
                     <span className="text-[0.65rem] font-black text-brand-accent uppercase tracking-widest">Kinematics</span>
                     <p className="text-2xl md:text-4xl font-black text-brand-primary">99.8%</p>
                     <span className="text-[0.7rem] font-bold text-text-muted">Analysis Accuracy</span>
                   </div>
                </div>
                
                <div className="absolute -right-6 md:-right-12 top-[15%] bg-white/60 backdrop-blur-2xl border border-white/40 shadow-[0_32px_64px_-16px_rgba(15,23,42,0.06)] p-6 md:p-8 rounded-[32px] shadow-2xl animate-float-delayed">
                   <div className="flex items-center gap-5">
                     <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-[#F97316] to-[#FB923C] text-white flex items-center justify-center shadow-lg shadow-brand-accent/20">
                        <Cpu size={28} />
                     </div>
                     <div className="flex flex-col">
                        <h4 className="font-black text-brand-primary text-sm md:text-xl uppercase tracking-tighter">STL Ready</h4>
                        <p className="text-[0.7rem] md:text-[0.85rem] font-bold text-text-muted">Instant Fabrication</p>
                     </div>
                   </div>
                </div>
            </div>
          </div>
        </div>
      </header>

      {/* Marquee Banner */}
      <div className="py-24 border-y border-slate-200/60 bg-white/30 overflow-hidden flex flex-col items-center">
        <div className="text-[0.65rem] text-brand-accent font-black uppercase tracking-[0.4em] mb-12 text-center opacity-80">
          Powered BY Google Cloud & Gemini AI Architecture
        </div>
        <div className="w-full overflow-hidden relative [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
          <div className="flex w-max gap-32 px-10 animate-marquee">
            {['React.js', 'Firebase', 'Gemini AI Pro', '3D Printing', 'STL Design', 'Kinematics'].map((tech, i) => (
              <span key={i} className="text-3xl font-outfit font-black text-slate-300 hover:text-brand-accent transition-all duration-500 cursor-default select-none uppercase tracking-tighter">{tech}</span>
            ))}
            {/* DUPLICATE */}
            {['React.js', 'Firebase', 'Gemini AI Pro', '3D Printing', 'STL Design', 'Kinematics'].map((tech, i) => (
              <span key={i+10} className="text-3xl font-outfit font-black text-slate-300 hover:text-brand-accent transition-all duration-500 cursor-default select-none uppercase tracking-tighter">{tech}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <section id="mission" className="py-32 px-8 max-w-[1400px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <div className="relative group">
            <div className="w-16 h-1.5 bg-gradient-to-br from-[#F97316] to-[#FB923C] mb-10 rounded-full"></div>
            <h2 className="text-4xl md:text-6xl font-outfit font-black leading-[1.1] mb-10 tracking-tighter text-brand-primary lowercase">
              One assessment.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#F97316] to-[#FB923C] italic">Endless potential.</span>
            </h2>
            <div className="space-y-6 text-base md:text-[1.05rem] text-text-muted leading-relaxed font-medium max-w-[500px]">
              <p>Traditional ergonomic tools are expensive, slow to arrive, and rarely fit perfectly. A growing student needs solutions that adapt as fast as they do.</p>
              <p>By combining mobile video capture with generative AI, we skip the supply chain entirely. What used to take months now takes minutes. From classroom recording directly to your school's 3D printer.</p>
            </div>
            <div className="mt-12 flex items-center gap-6">
              <button className="px-8 py-3.5 rounded-xl bg-brand-primary text-white hover:bg-slate-800 shadow-lg shadow-brand-primary/10 transition-all font-bold text-[0.85rem] active:scale-95">
                Read the Whitepaper
              </button>
              <div className="flex -space-x-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300"></div>
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-white bg-brand-accent text-white flex items-center justify-center text-[10px] font-black italic">+500</div>
              </div>
            </div>
          </div>
          <div className="relative p-4">
             <div className="absolute inset-0 bg-gradient-to-br from-[#F97316] to-[#FB923C] blur-[80px] opacity-10 -z-10 group-hover:opacity-20 transition-opacity"></div>
             <div className="relative aspect-[4/5] rounded-[40px] overflow-hidden shadow-2xl border border-white/50 group">
                <img src="/Image 1.jpg" alt="Mission" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/40 to-transparent"></div>
             </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-8 bg-slate-50 border-y border-slate-200/60">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div className="max-w-[600px]">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/10 text-brand-accent border border-brand-accent/20 mb-6 font-black text-[0.65rem] uppercase tracking-widest">
                Capabilities
              </div>
              <h2 className="text-4xl md:text-5xl font-outfit font-black tracking-tighter text-brand-primary lowercase leading-tight">
                Generative design,<br/>simplified for scale.
              </h2>
            </div>
            <p className="text-text-muted text-lg font-medium max-w-[400px] pb-2 leading-relaxed">
              Everything you need to support your students&apos; physical needs at scale with automated precision.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[240px]">
            {/* Main Feature */}
            <div className="md:col-span-8 md:row-span-2 bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(15,23,42,0.04)] rounded-[32px] transition-all duration-500 hover:shadow-[0_40px_80px_-15px_rgba(15,23,42,0.08)] hover:-translate-y-2 p-12 flex flex-col justify-between overflow-hidden relative group border-none shadow-[0_40px_80px_-15px_rgba(15,23,42,0.05)]">
               <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-[#F97316] to-[#FB923C] opacity-5 blur-[100px] -z-10 group-hover:opacity-10 transition-opacity"></div>
               <div className="relative z-10">
                 <div className="w-14 h-14 rounded-2xl bg-brand-primary text-white flex items-center justify-center mb-8 shadow-xl shadow-brand-primary/10">
                   <Cpu size={28} />
                 </div>
                 <h3 className="text-3xl md:text-4xl font-outfit font-black mb-6 tracking-tighter text-brand-primary lowercase">Kinematic Analysis AI</h3>
                 <p className="text-text-muted text-lg leading-relaxed max-w-[450px] font-medium">Our proprietary vision algorithms identify physical constraints from simple video captures, calculating precise anatomical offsets for custom tools.</p>
               </div>
               <div className="absolute right-0 bottom-0 w-1/2 h-full hidden lg:flex items-center justify-center translate-y-20 group-hover:translate-y-10 transition-transform duration-1000">
                  <div className="w-64 h-64 rounded-full border-[20px] border-slate-50/50 relative flex items-center justify-center">
                     <div className="w-40 h-40 rounded-full border-[10px] border-orange-50/50"></div>
                     <div className="absolute w-2 h-2 rounded-full bg-brand-accent animate-ping"></div>
                  </div>
               </div>
            </div>
            
            {/* Small Features */}
            <div className="md:col-span-4 md:row-span-1 bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(15,23,42,0.04)] rounded-[32px] transition-all duration-500 hover:shadow-[0_40px_80px_-15px_rgba(15,23,42,0.08)] hover:-translate-y-2 p-8 group border-none shadow-[0_30px_60px_-12px_rgba(15,23,42,0.04)]">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-brand-primary flex items-center justify-center mb-6 group-hover:bg-brand-accent group-hover:text-white transition-all">
                <Shield size={22} />
              </div>
              <h3 className="text-xl font-outfit font-black mb-3 text-brand-primary tracking-tighter lowercase">FERPA Compliant</h3>
              <p className="text-text-muted text-[0.95rem] leading-relaxed font-medium">Enterprise-grade security ensures student data is handled with maximum privacy.</p>
            </div>
            
            <div className="md:col-span-4 md:row-span-1 bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(15,23,42,0.04)] rounded-[32px] transition-all duration-500 hover:shadow-[0_40px_80px_-15px_rgba(15,23,42,0.08)] hover:-translate-y-2 p-8 group border-none shadow-[0_30px_60px_-12px_rgba(15,23,42,0.04)]">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-brand-accent flex items-center justify-center mb-6 group-hover:bg-brand-primary group-hover:text-white transition-all">
                <Layout size={22} />
              </div>
              <h3 className="text-xl font-outfit font-black mb-3 text-brand-primary tracking-tighter lowercase">Instant STLs</h3>
              <p className="text-text-muted text-[0.95rem] leading-relaxed font-medium">Automated blueprint generation ready for any standard 3D printer.</p>
            </div>

            {/* Wide Feature */}
            <div className="md:col-span-12 md:row-span-1 bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(15,23,42,0.04)] rounded-[32px] transition-all duration-500 hover:shadow-[0_40px_80px_-15px_rgba(15,23,42,0.08)] hover:-translate-y-2 bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-12 flex flex-col md:flex-row justify-between items-center group overflow-hidden border-none">
               <div className="md:max-w-xl text-center md:text-left">
                 <h3 className="text-3xl font-outfit font-black mb-4 tracking-tighter text-white lowercase">Mass Personalized Education</h3>
                 <p className="text-slate-400 text-lg leading-relaxed font-medium">Scalable software solutions for special-ed departments to provide individualized support at a fraction of standard costs.</p>
               </div>
               <button className="mt-8 md:mt-0 px-8 py-3.5 rounded-xl bg-white text-brand-primary font-black text-[0.85rem] hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                 Explore the Model <ChevronRight size={18} />
               </button>
               <div className="absolute -right-10 -bottom-10 text-white/5 rotate-12 group-hover:scale-110 transition-transform duration-700">
                  <Zap size={240} />
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Creator Section */}
      <section id="creator" className="py-32 px-8 max-w-[1400px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <div className="relative aspect-square max-w-[500px] mx-auto w-full group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#F97316] to-[#FB923C] rounded-[64px] rotate-12 blur-[60px] opacity-10 group-hover:rotate-6 transition-transform duration-700"></div>
            <div className="w-full h-full rounded-[64px] overflow-hidden border-[12px] border-white shadow-[0_40px_80px_-15px_rgba(15,23,42,0.1)] relative z-10">
              <img src="/Image 5.png" alt="Founder" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/20 to-transparent"></div>
            </div>
            {/* Floating Info */}
            <div className="absolute -right-8 bottom-12 bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 z-20 animate-float translate-x-4">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                     <img src="/logo.png" alt="Mini Logo" className="w-5" />
                 </div>
                 <div>
                   <p className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest">Visionary</p>
                   <p className="text-sm font-black text-brand-primary">Founder & CEO</p>
                 </div>
               </div>
            </div>
          </div>
          <div className="relative">
            <div className="w-16 h-1.5 bg-gradient-to-br from-[#F97316] to-[#FB923C] mb-10 rounded-full"></div>
            <h2 className="text-5xl font-outfit font-black mb-8 tracking-tighter text-brand-primary lowercase">Built for the 1 in 5.</h2>
            <div className="space-y-6 text-xl text-text-muted leading-relaxed font-medium">
              <p>Hi, I&apos;m the creator of Form-Fit Learner. I spent years observing how standardized learning environments fail to address the nuance of individual physical needs.</p>
              <p>That&apos;s why I built Form-Fit. To bridge the gap between cutting-edge AI and practical classroom reality without wait times.</p>
            </div>
            <div className="mt-12 p-10 bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(15,23,42,0.04)] rounded-[32px] transition-all duration-500 hover:shadow-[0_40px_80px_-15px_rgba(15,23,42,0.08)] hover:-translate-y-2 bg-slate-50/50 border-none relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#F97316] to-[#FB923C] opacity-10 rounded-full blur-3xl -translate-y-16 translate-x-16"></div>
              <p className="text-xl text-brand-primary font-bold mb-6 italic leading-relaxed relative z-10">&quot;We&apos;re not just 3D printing plastic. We&apos;re printing access, comfort, and human focus.&quot;</p>
              <span className="text-brand-accent font-black not-italic uppercase tracking-[0.2em] text-xs">— Developer & Founder</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white py-24 px-8 border-t border-slate-800">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col lg:flex-row justify-between gap-20 mb-20">
            <div className="max-w-[400px]">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <img src="/logo.png" alt="Logo" className="h-7 w-auto" />
                </div>
                <span className="font-outfit font-black text-3xl tracking-tighter lowercase">form-fit</span>
              </div>
              <p className="text-slate-400 text-lg leading-relaxed font-medium mb-10 italic">Advanced assistive technology developed with compassion, code, and classroom reality in mind.</p>
              <div className="flex gap-4">
                 {[1, 2, 3, 4].map(i => (
                   <div key={i} className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-brand-accent hover:border-brand-accent transition-all cursor-pointer group">
                      <div className="w-4 h-4 rounded-sm bg-slate-600 group-hover:bg-white transition-colors"></div>
                   </div>
                 ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-16 lg:gap-24">
              <div className="flex flex-col gap-6">
                <h4 className="text-sm font-black uppercase tracking-[0.3em] text-brand-accent">Platform</h4>
                <a href="#" className="text-slate-400 hover:text-white transition-colors font-semibold text-[0.95rem]">Dashboard</a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors font-semibold text-[0.95rem]">3D Library</a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors font-semibold text-[0.95rem]">Resources</a>
              </div>
              <div className="flex flex-col gap-6">
                <h4 className="text-sm font-black uppercase tracking-[0.3em] text-cyan-400">Security</h4>
                <a href="#" className="text-slate-400 hover:text-white transition-colors font-semibold text-[0.95rem]">Privacy Policy</a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors font-semibold text-[0.95rem]">Compliance</a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors font-semibold text-[0.95rem]">Terms</a>
              </div>
              <div className="flex flex-col gap-6">
                <h4 className="text-sm font-black uppercase tracking-[0.3em] text-slate-300">Company</h4>
                <a href="#" className="text-slate-400 hover:text-white transition-colors font-semibold text-[0.95rem]">Mission</a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors font-semibold text-[0.95rem]">About</a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors font-semibold text-[0.95rem]">Contact</a>
              </div>
            </div>
          </div>
          
          <div className="pt-10 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-slate-500 text-sm font-medium">&copy; 2026 Form-Fit Learner. All rights reserved.</p>
            <div className="flex gap-8 text-slate-500 text-sm font-medium">
               <span>System Status: <span className="text-emerald-400">Operational</span></span>
               <span>v1.0.4-beta</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
