'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  User, MapPin, CheckCircle, ChevronRight, 
  ArrowRight, Globe, Info, Zap, Mail,
  Target, Shield, Award 
} from 'lucide-react';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    gender: '',
    location: '',
    bio: '',
    expertise: '',
    newsletter: true
  });
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);
      setFormData(prev => ({ 
        ...prev, 
        name: currentUser.displayName || '', 
        email: currentUser.email || '' 
      }));

      // Check if already completed via API (Admin SDK)
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch('/api/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.onboardingComplete) {
          router.push('/dashboard');
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error checking onboarding status:", err);
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  // Automatic Location Fetching
  const fetchLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data.city && data.country_name) {
        setFormData(prev => ({ ...prev, location: `${data.city}, ${data.country_name}` }));
      }
    } catch (err) {
      console.error("Failed to fetch location", err);
    }
  };

  useEffect(() => {
    if (step === 2 && !formData.location) {
      fetchLocation();
    }
  }, [step]);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          ...formData,
          onboardingComplete: true,
          onboardedAt: new Date().toISOString(),
          role: 'client'
        })
      });

      if (res.ok) {
        router.push('/dashboard');
      } else {
        throw new Error('Failed to save profile');
      }
    } catch (err) {
      console.error("Error saving onboarding data:", err);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6">
        <div className="w-12 h-12 border-4 border-white/10 border-t-brand-accent rounded-full animate-spin"></div>
        <p className="font-outfit font-black text-white/40 uppercase tracking-[0.3em] text-xs">Authenticating Profile</p>
      </div>
    );
  }

  const steps = [
    { title: 'Personal Profile', icon: User },
    { title: 'Regional Context', icon: MapPin },
    { title: 'Professional Bio', icon: Info },
    { title: 'Complete', icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-inter overflow-hidden relative selection:bg-brand-accent selection:text-white">
      {/* Background elements */}
      <div className="absolute top-[-20%] right-[-10%] w-[1000px] h-[1000px] bg-brand-primary/20 blur-[180px] rounded-full -z-10 animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[800px] h-[800px] bg-brand-accent/10 blur-[160px] rounded-full -z-10 animate-pulse delay-1000"></div>

      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 p-8 flex justify-between items-center z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="w-6" />
          </div>
          <span className="font-outfit font-black text-2xl tracking-tighter">form-fit</span>
        </div>
        <div className="flex gap-2">
          {steps.map((s, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-500 ${step > i ? 'bg-brand-accent w-12' : 'bg-white/10 w-4'}`}
            />
          ))}
        </div>
      </header>

      <main className="min-h-screen pt-32 pb-20 px-6 flex items-center justify-center">
        <div className="w-full max-w-[580px] relative">
          
          {/* Step 1: Personal Profile */}
          {step === 1 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="space-y-3">
                <span className="px-3 py-1 rounded-full bg-brand-accent/20 text-brand-accent text-[10px] font-black uppercase tracking-widest">Step 01</span>
                <h1 className="text-5xl font-outfit font-black tracking-tighter lowercase leading-tight">Setting up your identity.</h1>
                <p className="text-white/50 text-lg font-medium">Let&apos;s start with the basics to personalize your workstation.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-accent transition-colors" size={20} />
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-[22px] py-4 pl-14 pr-6 text-white focus:outline-none focus:border-brand-accent/50 focus:ring-4 focus:ring-brand-accent/5 transition-all font-medium"
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Email Address</label>
                  <div className="relative group opacity-60">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                    <input 
                      type="email" 
                      readOnly
                      className="w-full bg-white/5 border border-white/10 rounded-[22px] py-4 pl-14 pr-6 text-white/50 cursor-not-allowed font-medium"
                      value={formData.email}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Gender Identity</label>
                  <div className="grid grid-cols-3 gap-4">
                    {['Male', 'Female', 'Other'].map(g => (
                      <button 
                        key={g}
                        onClick={() => setFormData({...formData, gender: g})}
                        className={`py-4 rounded-[22px] border font-bold text-sm transition-all ${
                          formData.gender === g 
                          ? 'bg-brand-accent border-brand-accent text-white shadow-xl shadow-brand-accent/20' 
                          : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                disabled={!formData.name || !formData.gender}
                onClick={handleNext}
                className="w-full py-5 rounded-[24px] bg-white text-slate-950 font-black text-lg flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30"
              >
                Continue to Location <ArrowRight size={24} />
              </button>
            </div>
          )}

          {/* Step 2: Regional Context */}
          {step === 2 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
              <div className="space-y-3">
                <span className="px-3 py-1 rounded-full bg-brand-accent/20 text-brand-accent text-[10px] font-black uppercase tracking-widest">Step 02</span>
                <h1 className="text-5xl font-outfit font-black tracking-tighter lowercase leading-tight">Where are you based?</h1>
                <p className="text-white/50 text-lg font-medium">We use your location to sync with local fabrication standards.</p>
              </div>

              <div className="relative p-8 rounded-[32px] bg-white/5 border border-white/10 overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Globe size={120} />
                </div>
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-accent/20 text-brand-accent flex items-center justify-center">
                      <MapPin size={24} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Current Location</p>
                       <p className="text-xl font-bold">{formData.location || 'Detecting...'}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Manual Override</label>
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-5 text-white/70 focus:outline-none focus:border-brand-accent/40 font-medium"
                      placeholder="e.g. Nairobi, Kenya"
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={handleBack}
                  className="px-8 py-5 rounded-[24px] bg-white/5 text-white font-bold border border-white/10 hover:bg-white/10 transition-all"
                >
                  Back
                </button>
                <button 
                  disabled={!formData.location}
                  onClick={handleNext}
                  className="flex-1 py-5 rounded-[24px] bg-white text-slate-950 font-black text-lg flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Next Step <ArrowRight size={24} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Bio & Expertise */}
          {step === 3 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
              <div className="space-y-3">
                <span className="px-3 py-1 rounded-full bg-brand-accent/20 text-brand-accent text-[10px] font-black uppercase tracking-widest">Step 03</span>
                <h1 className="text-5xl font-outfit font-black tracking-tighter lowercase leading-tight">Tell us your focus.</h1>
                <p className="text-white/50 text-lg font-medium">Briefly describe your interest or professional background in inclusion.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Professional / Personal Bio</label>
                  <textarea 
                    className="w-full bg-white/5 border border-white/10 rounded-[24px] p-6 text-white h-32 resize-none focus:outline-none focus:border-brand-accent/50 transition-all font-medium"
                    placeholder="Physical therapist, inclusive educator, researcher..."
                    value={formData.bio}
                    onChange={e => setFormData({...formData, bio: e.target.value})}
                  />
                </div>

                <div className="p-6 rounded-[24px] bg-brand-accent/5 border border-brand-accent/10 flex items-start gap-4">
                  <Shield size={20} className="text-brand-accent mt-1 shrink-0" />
                  <p className="text-xs text-brand-accent/80 font-medium leading-relaxed uppercase tracking-wider">
                    Data is handled per FERPA standards. Your bio helps us refine the AI recommendations for your specific use cases.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={handleBack}
                  className="px-8 py-5 rounded-[24px] bg-white/5 text-white font-bold border border-white/10 hover:bg-white/10 transition-all"
                >
                  Back
                </button>
                <button 
                  disabled={!formData.bio}
                  onClick={handleNext}
                  className="flex-1 py-5 rounded-[24px] bg-brand-accent text-white font-black text-lg flex items-center justify-center gap-3 hover:shadow-2xl hover:shadow-brand-accent/20 transition-all"
                >
                  Review Summary <ChevronRight size={24} />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Final Review */}
          {step === 4 && (
            <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={48} />
                </div>
                <h1 className="text-5xl font-outfit font-black tracking-tighter lowercase">All systems ready.</h1>
                <p className="text-white/50 text-lg font-medium">Verify your profile summary before launching your AI Workstation.</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 space-y-6">
                <div className="flex justify-between items-center pb-6 border-b border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-accent text-white flex items-center justify-center font-black text-xl">
                      {formData.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{formData.name}</p>
                      <p className="text-sm text-white/40">{formData.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setStep(1)} className="text-[10px] font-black text-brand-accent hover:underline uppercase tracking-widest">Edit</button>
                </div>

                <div className="grid grid-cols-2 gap-8">
                   <div>
                     <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Region</p>
                     <p className="font-bold text-white/80">{formData.location}</p>
                   </div>
                   <div>
                     <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Identity</p>
                     <p className="font-bold text-white/80">{formData.gender}</p>
                   </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex items-center gap-4">
                  <input 
                    type="checkbox" 
                    id="news" 
                    checked={formData.newsletter} 
                    onChange={e => setFormData({...formData, newsletter: e.target.checked})}
                    className="w-5 h-5 rounded-lg accent-brand-accent"
                  />
                  <label htmlFor="news" className="text-xs text-white/50 font-medium">Join the monthly research newsletter for inclusion tech.</label>
                </div>
              </div>

              <button 
                disabled={saving}
                onClick={handleSubmit}
                className="w-full py-6 rounded-[28px] bg-white text-slate-950 font-black text-xl flex items-center justify-center gap-4 hover:scale-[1.02] transition-all shadow-2xl shadow-white/5"
              >
                {saving ? 'Initializing AI Core...' : 'Launch Workstation'}
                <Zap size={24} className="fill-current" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Floating Decorative Stats */}
      {step < 4 && (
        <div className="fixed bottom-10 right-10 hidden xl:flex flex-col gap-4 animate-in slide-in-from-right-10 duration-1000">
           {[
             { label: 'Latency', val: '24ms', icon: Zap },
             { label: 'Sync', val: 'Active', icon: Globe },
             { label: 'Encryp', val: 'AES-256', icon: Shield }
           ].map((s, i) => (
             <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4">
                <s.icon size={16} className="text-white/30" />
                <div>
                   <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">{s.label}</p>
                   <p className="text-xs font-bold">{s.val}</p>
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
