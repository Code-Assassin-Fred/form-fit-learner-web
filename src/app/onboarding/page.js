'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
        <div className="w-8 h-8 border-2 border-slate-100 border-t-brand-primary rounded-full animate-spin"></div>
        <p className="font-outfit font-bold text-slate-600 uppercase tracking-widest text-[10px]">Syncing workstation</p>
      </div>
    );
  }

  const steps = ['Identity', 'Region', 'Bio', 'Summary'];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-inter selection:bg-brand-primary/10 selection:text-brand-primary">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 p-8 flex justify-between items-center z-50 bg-white/80 backdrop-blur-md border-b border-slate-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-100 shadow-sm">
            <img src="/logo.png" alt="Logo" className="w-5" />
          </div>
          <span className="font-outfit font-black text-xl tracking-tighter lowercase">form-fit</span>
        </div>
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all duration-500 ${step > i ? 'bg-brand-primary w-8' : 'bg-slate-100 w-3'}`}
            />
          ))}
        </div>
      </header>

      <main className="min-h-screen pt-40 pb-20 px-6 flex items-start justify-center">
        <div className="w-full max-w-[450px] relative">
          
          {/* Step 1: Personal Profile */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <span className="inline-block px-2.5 py-1 rounded-md bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest mb-2">Step 01</span>
                <h1 className="text-3xl font-outfit font-black tracking-tight leading-none text-slate-900 lowercase">identity registry</h1>
                <p className="text-slate-700 text-sm font-medium">Basic authentication data for your profile workstation.</p>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-5 text-slate-900 focus:outline-none focus:border-brand-primary focus:bg-white transition-all font-semibold text-sm"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    type="email" 
                    readOnly
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-xl py-3 px-5 text-slate-500 cursor-not-allowed font-semibold text-sm"
                    value={formData.email}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Gender Identity</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Male', 'Female', 'Other'].map(g => (
                      <button 
                        key={g}
                        onClick={() => setFormData({...formData, gender: g})}
                        className={`py-3 rounded-xl border font-bold text-xs transition-all ${
                          formData.gender === g 
                          ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/10' 
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
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
                className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-20"
              >
                Proceed to Localization
              </button>
            </div>
          )}

          {/* Step 2: Regional Context */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <span className="inline-block px-2.5 py-1 rounded-md bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest mb-2">Step 02</span>
                <h1 className="text-3xl font-outfit font-black tracking-tight leading-none text-slate-900 lowercase">regional context</h1>
                <p className="text-slate-700 text-sm font-medium">Syncing with local fabrication and ergonomic standards.</p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-5">
                <div className="flex flex-col gap-1">
                   <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Automatic Detection</p>
                   <p className="text-lg font-bold text-slate-900">{formData.location || 'Locating...'}</p>
                </div>
                
                <div className="space-y-1.5 pt-4 border-t border-slate-200">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Manual Override</label>
                  <input 
                    type="text" 
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 focus:outline-none focus:border-brand-primary text-sm font-semibold"
                    placeholder="City, Country"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={handleBack}
                  className="px-6 py-3.5 rounded-xl bg-white text-slate-700 font-bold border border-slate-200 hover:bg-slate-50 transition-all text-xs"
                >
                  Back
                </button>
                <button 
                  disabled={!formData.location}
                  onClick={handleNext}
                  className="flex-1 py-3.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:brightness-110 transition-all"
                >
                  Confirm Region
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Bio & Expertise */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <span className="inline-block px-2.5 py-1 rounded-md bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest mb-2">Step 03</span>
                <h1 className="text-3xl font-outfit font-black tracking-tight leading-none text-slate-900 lowercase">professional bio</h1>
                <p className="text-slate-700 text-sm font-medium">Your background helps us refine AI ergonomic models.</p>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Case Context or Professional Field</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-5 text-slate-900 h-32 resize-none focus:outline-none focus:border-brand-primary focus:bg-white transition-all font-semibold text-sm"
                    placeholder="Clinician, researcher, educator, or independent client..."
                    value={formData.bio}
                    onChange={e => setFormData({...formData, bio: e.target.value})}
                  />
                </div>

                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <p className="text-[10px] text-blue-600 font-bold leading-relaxed uppercase tracking-wide">
                    Encrypted profile data ensures HIPAA-level security for all kinematic recordings.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={handleBack} className="px-6 py-3.5 rounded-xl bg-white text-slate-700 font-bold border border-slate-200 hover:bg-slate-50 transition-all text-xs">Back</button>
                <button 
                  disabled={!formData.bio}
                  onClick={handleNext}
                  className="flex-1 py-3.5 rounded-xl bg-brand-primary text-white font-bold text-sm hover:brightness-105 shadow-xl shadow-brand-primary/10 transition-all"
                >
                  Review Application
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Final Review */}
          {step === 4 && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-outfit font-black tracking-tight lowercase text-slate-900">ready for deployment</h1>
                <p className="text-slate-700 text-sm font-medium text-center">Verify your identity summary before launch.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-lg">
                      {formData.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{formData.name}</p>
                      <p className="text-[10px] text-slate-600 font-semibold">{formData.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setStep(1)} className="text-[9px] font-black text-brand-primary hover:underline uppercase tracking-widest">Edit</button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div>
                     <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Region</p>
                     <p className="font-bold text-slate-700 text-sm">{formData.location}</p>
                   </div>
                   <div>
                     <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Identity</p>
                     <p className="font-bold text-slate-700 text-sm">{formData.gender}</p>
                   </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="news" 
                    checked={formData.newsletter} 
                    onChange={e => setFormData({...formData, newsletter: e.target.checked})}
                    className="w-4 h-4 rounded-md accent-brand-primary"
                  />
                  <label htmlFor="news" className="text-[10px] text-slate-600 font-bold uppercase tracking-wide cursor-pointer">Subscribe to research updates</label>
                </div>
              </div>

              <button 
                disabled={saving}
                onClick={handleSubmit}
                className="w-full py-4 rounded-xl bg-slate-900 text-white font-black text-base flex items-center justify-center gap-3 hover:brightness-110 transition-all shadow-xl shadow-slate-200"
              >
                {saving ? 'Syncing...' : 'Complete Registry'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
