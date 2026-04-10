'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-bg-main text-text-main font-inter selection:bg-brand-primary selection:text-white">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 h-24 z-[100] flex items-center transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-border-main shadow-sm' : 'bg-transparent'}`}>
        <div className="w-full max-w-[1400px] mx-auto px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
            <span className="font-outfit font-bold text-xl text-text-main tracking-tight">Form-Fit Learner</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#mission" className="text-text-muted hover:text-brand-primary transition-colors font-medium text-[0.95rem]">Mission</a>
            <a href="#features" className="text-text-muted hover:text-brand-primary transition-colors font-medium text-[0.95rem]">Features</a>
            <a href="#creator" className="text-text-muted hover:text-brand-primary transition-colors font-medium text-[0.95rem]">About</a>
            <button 
              onClick={() => router.push('/login')}
              className="px-6 py-2.5 rounded-full border border-border-main bg-white text-text-main hover:bg-slate-50 transition-all font-semibold text-[0.9rem]"
            >
              Sign In
            </button>
            <button 
              onClick={() => router.push('/dashboard')}
              className="px-7 py-2.5 rounded-full bg-brand-primary text-white hover:brightness-110 shadow-lg shadow-brand-primary/20 transition-all font-bold text-[0.9rem]"
            >
              Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-[180px] pb-32 px-8 min-h-screen flex justify-center items-center relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-primary/5 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-secondary/5 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse delay-1000"></div>

        <div className="max-w-[1400px] w-full flex flex-col items-center">
          <div className="text-center max-w-[1000px] mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 mb-8">
              <Zap size={16} />
              <span className="text-sm font-bold uppercase tracking-wider">Education 2.0</span>
            </div>
            <h1 className="text-4xl md:text-8xl font-outfit font-black leading-tight mb-8 tracking-tighter text-slate-900 lowercase px-4">
              Inclusive Classrooms.<br />
              <span className="text-brand-primary">AI-Driven Comfort.</span>
            </h1>
            <p className="text-lg md:text-2xl text-text-muted max-w-[800px] mx-auto mb-12 leading-relaxed font-medium px-4">
              Advanced AI analyzes physical inabilities and constrictions to generate custom, 3D-printable assistive tools. Empowering every learner to reach their full potential.
            </p>
            <div className="flex flex-wrap gap-5 justify-center">
              <button 
                onClick={() => router.push('/login')}
                className="px-12 py-5 rounded-2xl font-outfit font-bold text-xl bg-brand-primary text-white shadow-2xl shadow-brand-primary/30 hover:shadow-brand-primary/50 hover:-translate-y-1 transition-all active:scale-95"
              >
                Start Assessment Free
              </button>
              <button className="px-12 py-5 rounded-2xl font-outfit font-bold text-xl bg-white border border-border-main text-text-main shadow-xl shadow-slate-200/50 hover:bg-slate-50 transition-all font-inter">
                See How It Works
              </button>
            </div>
          </div>
          
          <div className="w-full max-w-[1100px] relative z-10 transition-all duration-700 hover:scale-[1.01]">
            <div className="rounded-[40px] bg-white border border-border-main shadow-[0_50px_100px_-20px_rgba(15,23,42,0.1)] p-4 relative overflow-hidden">
               <div className="bg-slate-50 rounded-[30px] overflow-hidden border border-slate-100">
                  <div className="flex gap-2 px-6 py-4 bg-white border-b border-slate-100">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <img src="/hero-african.png" alt="Dashboard Mockup" className="w-full grayscale-[20%] hover:grayscale-0 transition-all duration-1000" />
               </div>
               
               {/* Floating Info Cards */}
                <div className="absolute -left-4 md:-left-12 bottom-[20%] bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-xl border border-slate-100">
                   <div className="flex flex-col items-start text-left">
                     <h4 className="text-[10px] md:text-sm font-bold text-text-muted uppercase tracking-widest mb-1">Analysis</h4>
                     <p className="text-xl md:text-3xl font-black text-brand-primary">99.8% Accuracy</p>
                   </div>
                </div>
                <div className="absolute -right-4 md:-right-10 top-[20%] bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-xl border border-slate-100">
                   <div className="flex items-center gap-3 md:gap-4">
                     <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 text-brand-primary rounded-xl md:rounded-2xl flex items-center justify-center">
                        <Zap size={20} />
                     </div>
                     <div className="flex flex-col text-left">
                        <h4 className="font-bold text-text-main text-sm md:text-lg uppercase">STL Ready</h4>
                        <p className="text-[10px] md:text-sm font-medium text-text-muted">Click to Download</p>
                     </div>
                   </div>
                </div>
            </div>
          </div>
        </div>
      </header>

      {/* Marquee Banner */}
      <div className="py-20 border-y border-border-main bg-white/40 overflow-hidden flex flex-col items-center">
        <div className="text-xs text-brand-primary font-black uppercase tracking-[4px] mb-10 text-center">
          Powered BY Google Cloud & Gemini AI
        </div>
        <div className="w-full overflow-hidden relative [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="flex w-max gap-32 px-10 animate-marquee">
            {['React.js', 'Firebase', 'Gemini AI Pro', 'Flutter SDK', 'STL Blueprinting', 'Kinematic Vision'].map((tech, i) => (
              <span key={i} className="text-4xl font-outfit font-black text-slate-200 hover:text-brand-primary transition-all cursor-default select-none uppercase tracking-tighter">{tech}</span>
            ))}
            {/* DUPLICATE */}
            {['React.js', 'Firebase', 'Gemini AI Pro', 'Flutter SDK', 'STL Blueprinting', 'Kinematic Vision'].map((tech, i) => (
              <span key={i+5} className="text-4xl font-outfit font-black text-slate-200 hover:text-brand-primary transition-all cursor-default select-none uppercase tracking-tighter">{tech}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <section id="mission" className="py-40 px-8 max-w-[1400px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
          <div>
            <div className="w-20 h-2 bg-brand-primary mb-10 rounded-full"></div>
            <h2 className="text-4xl md:text-8xl font-outfit font-black leading-tight mb-12 tracking-tighter text-slate-900 lowercase">One assessment.<br/><span className="text-brand-primary italic leading-[1.2]">Endless potential.</span></h2>
            <div className="space-y-8 text-lg md:text-xl text-text-muted leading-relaxed font-medium">
              <p>Traditional ergonomic tools are expensive, slow to arrive, and rarely fit perfectly. A growing student needs solutions that adapt as fast as they do.</p>
              <p>By combining mobile video capture with generative AI, we skip the supply chain entirely. What used to take months now takes minutes. From classroom recording directly to your school's 3D printer.</p>
            </div>
            <button className="mt-14 w-full md:w-auto px-10 py-5 rounded-2xl bg-slate-900 text-white hover:bg-black shadow-xl transition-all font-bold text-xl active:scale-95">
              Read the Whitepaper
            </button>
          </div>
          <div className="relative aspect-[4/5] rounded-[40px] overflow-hidden shadow-2xl border-4 border-white">
             <img src="/replace with this.jpeg" alt="Mission" className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition-all duration-1000" />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-40 px-8 bg-slate-50 border-y border-border-main">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-24 max-w-[800px] mx-auto">
            <h2 className="text-5xl md:text-7xl font-outfit font-black mb-8 tracking-tighter lowercase text-slate-900">Generative design, simplified.</h2>
            <p className="text-text-muted text-2xl font-medium tracking-tight">Everything you need to support your students' physical needs at scale.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-[minmax(350px,auto)] gap-8">
            <div className="bg-white border border-border-main rounded-[40px] p-12 md:col-span-2 md:row-span-2 flex flex-col justify-between group overflow-hidden relative">
              <div className="relative z-10">
                <h3 className="text-4xl md:text-5xl font-outfit font-black mb-6 max-w-[80%] tracking-tighter lowercase leading-none text-slate-900">Proprietary AI Kinematic Analysis</h3>
                <p className="text-text-muted text-xl leading-relaxed max-w-[90%] font-medium">Our algorithms identify physical inabilities and constrictions from simple video captures in real-time, calculating precise anatomical adjustments for custom tooling.</p>
              </div>
              <div className="pt-10 flex justify-center items-center h-80 relative">
                 <div className="w-[300px] h-[300px] rounded-full bg-brand-primary/5 transition-all duration-700"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-4 border-brand-primary/10 rounded-full"></div>
                 </div>
              </div>
            </div>
            
            <div className="bg-white border border-border-main rounded-[40px] p-12 group hover:border-brand-secondary transition-all">
              <h3 className="text-4xl font-outfit font-black mb-6 text-brand-secondary tracking-tighter lowercase">Instant STLs</h3>
              <p className="text-text-muted text-xl leading-relaxed font-medium">Automatically convert assessment data into custom STL blueprints ready for any standard 3D printer.</p>
            </div>
            
            <div className="bg-white border border-border-main rounded-[40px] p-12 group hover:border-brand-accent transition-all">
              <h3 className="text-4xl font-outfit font-black mb-6 text-brand-accent tracking-tighter lowercase">FERPA Compliant</h3>
              <p className="text-text-muted text-xl leading-relaxed font-medium">Enterprise-grade security ensures all student video data is processed anonymously and split-encrypted.</p>
            </div>
            
            <div className="bg-slate-900 text-white rounded-[40px] p-12 md:col-span-1 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="text-4xl font-outfit font-black mb-6 tracking-tighter lowercase leading-none">Mass Personalization</h3>
                <p className="text-slate-400 text-xl leading-relaxed font-medium">Scalable software solutions for special-ed departments to provide individualized support at the cost of mass production.</p>
              </div>
              <div className="absolute -right-10 -bottom-10 opacity-10 transition-transform duration-700">
                <Zap size={200} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Creator Section */}
      <section id="creator" className="py-40 px-8 max-w-[1400px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <div className="relative aspect-square max-w-[550px] mx-auto w-full group">
            <div className="absolute inset-0 bg-brand-primary rounded-[50px] rotate-6 group-hover:rotate-3 transition-transform duration-500 -z-10"></div>
            <div className="w-full h-full rounded-[50px] overflow-hidden border-8 border-white shadow-2xl">
              <img src="/Image 5.png" alt="Founder" className="w-full h-full object-cover" />
            </div>
          </div>
          <div>
            <h2 className="text-6xl font-outfit font-black mb-8 tracking-tighter text-slate-900 lowercase">Built for the 1 in 5.</h2>
            <div className="space-y-6 text-2xl text-text-muted leading-relaxed font-medium">
              <p>Hi, I&apos;m the creator of Form-Fit Learner. I spent years observing how standardized learning environments fail to address the nuance of individual physical needs.</p>
              <p>That&apos;s why I built Form-Fit. To bridge the gap between cutting-edge AI and practical classroom reality without wait times.</p>
            </div>
            <div className="mt-12 p-8 bg-slate-50 rounded-3xl border-l-8 border-brand-primary italic shadow-lg shadow-slate-100">
              <p className="text-2xl text-slate-900 font-bold mb-4">&quot;We&apos;re not just 3D printing plastic. We&apos;re printing access, comfort, and human focus.&quot;</p>
              <span className="text-brand-primary font-black not-italic uppercase tracking-widest">— Developer & Founder</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-32 px-8 border-t border-slate-800">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between gap-20">
          <div className="max-w-[400px]">
            <div className="flex items-center gap-3 mb-8">
              <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
              <span className="font-outfit font-black text-2xl tracking-tighter lowercase">Form-Fit Learner</span>
            </div>
            <p className="text-slate-400 text-lg leading-relaxed mb-6 font-medium italic">&copy; 2026 Form-Fit Learner. Advanced Assistive Technology developed with compassion and code.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-16">
            <div className="flex flex-col gap-5">
              <h4 className="text-lg font-black uppercase tracking-widest text-brand-primary">Product</h4>
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-lg font-medium">Dashboard</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-lg font-medium">3D Library</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-lg font-medium">Case Studies</a>
            </div>
            <div className="flex flex-col gap-5">
              <h4 className="text-lg font-black uppercase tracking-widest text-brand-primary">Safety</h4>
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-lg font-medium">Privacy Policy</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-lg font-medium">FERPA Compliance</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-lg font-medium">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
