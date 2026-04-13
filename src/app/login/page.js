'use client';

import React, { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { LogIn, Mail, Lock, Globe, UserPlus, ArrowLeft, Zap } from 'lucide-react';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setLoading(true);
        try {
          const token = await currentUser.getIdToken();
          const res = await fetch('/api/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          router.push(data.onboardingComplete ? '/dashboard' : '/onboarding');
        } catch (err) {
          console.error("Auth check error:", err);
          setLoading(false);
        }
      }
    });
    return () => unsub();
  }, [router]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    console.log('Attempting authentication...', { isSignUp, email });
    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        console.log('Creating user...');
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        console.log('Signing in...');
        await signInWithEmailAndPassword(auth, email, password);
      }
      console.log('Auth successful, redirecting to onboarding...');
      router.push('/onboarding');
    } catch (err) {
      console.error('Auth error:', err);
      setError(isSignUp ? 'Sign up failed. Try a different email.' : 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push('/onboarding');
    } catch (err) {
      setError('Google Sign-In failed.');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex font-inter selection:bg-brand-primary selection:text-white">
      {/* Left Side: Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white relative z-10 shadow-2xl">
        <button 
          onClick={() => router.push('/')}
          className="absolute top-10 left-10 flex items-center gap-2 text-text-muted hover:text-brand-primary transition-colors group font-bold uppercase tracking-widest text-xs"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </button>

        <div className="w-full max-w-[420px] space-y-7">
          <div className="text-center">
            <h1 className="text-3xl font-outfit font-black text-slate-900 tracking-tighter lowercase mb-2">
              {isSignUp ? 'Join the future.' : ''}
            </h1>
            <p className="text-text-muted font-medium text-base italic">
              {isSignUp ? 'Create your professional account.' : 'Sign in to your AI workstation.'}
            </p>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-base flex items-center justify-center gap-3 hover:bg-slate-50 active:scale-[0.98] transition-all shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.85 0-5.27-1.92-6.13-4.51H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.87 14.13c-.22-.67-.35-1.39-.35-2.13s.13-1.46.35-2.13V7.03H2.18C1.43 8.53 1 10.22 1 12s.43 3.47 1.18 4.97l3.69-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.03l3.69 2.84c.86-2.59 3.28-4.51 6.13-4.51z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black"><span className="bg-white px-6 text-slate-500 tracking-[4px]">or sign in with email</span></div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600 ml-1 uppercase tracking-widest" htmlFor="email">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={20} />
                <input 
                  type="email" 
                  id="email" 
                  placeholder="name@example.com" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-10 text-text-main focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all font-medium text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600 ml-1 uppercase tracking-widest" htmlFor="password">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={20} />
                <input 
                  type="password" 
                  id="password" 
                  placeholder="••••••••" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-10 text-text-main focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all font-medium text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>
 
            {isSignUp && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <label className="text-xs font-black text-slate-600 ml-1 uppercase tracking-widest" htmlFor="confirmPassword">Confirm Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={20} />
                  <input 
                    type="password" 
                    id="confirmPassword" 
                    placeholder="••••••••" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-10 text-text-main focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all font-medium text-sm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required 
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-500 text-sm py-4 px-5 rounded-2xl text-center font-bold animate-shake">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-brand-primary text-white font-black text-base flex items-center justify-center gap-3 shadow-xl shadow-brand-primary/20 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
              {isSignUp ? <UserPlus size={22} /> : <LogIn size={22} />}
            </button>
          </form>

          <p className="text-center text-text-muted font-medium">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"} 
            <button 
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setConfirmPassword('');
              }}
              className="text-brand-primary font-black ml-2 hover:underline decoration-2"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>

      {/* Right Side: Visual */}
      <div className="hidden lg:flex flex-[1.2] relative overflow-hidden bg-slate-900 items-center justify-center p-20">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 via-brand-secondary/10 to-transparent"></div>
        {/* Animated Background shapes */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-brand-primary/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-brand-secondary/10 blur-[120px] rounded-full animate-pulse delay-1000"></div>

        <div className="relative w-full aspect-video bg-white/5 backdrop-blur-3xl rounded-[40px] border border-white/10 p-4 shadow-[0_50px_100px_rgba(0,0,0,0.5)] transform -rotate-3 hover:rotate-0 transition-all duration-1000 group">
           <div className="w-full h-full bg-slate-800 rounded-[30px] overflow-hidden border border-white/5 relative">
              <img src="/hero-african.png" alt="App Preview" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-60"></div>
           </div>
           
           {/* Floating elements */}
           <div className="absolute top-10 right-10 flex gap-2">
              <Zap size={24} className="text-brand-primary animate-bounce" />
              <span className="text-white font-black lowercase tracking-tighter text-2xl italic">Real-time</span>
           </div>
        </div>
      </div>
    </div>
  );
}
