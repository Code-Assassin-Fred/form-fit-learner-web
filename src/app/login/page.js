'use client';

import React, { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { LogIn, Mail, Lock, Globe, UserPlus, ArrowLeft, Zap } from 'lucide-react';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    console.log('Attempting authentication...', { isSignUp, email });
    try {
      if (isSignUp) {
        console.log('Creating user...');
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        console.log('Signing in...');
        await signInWithEmailAndPassword(auth, email, password);
      }
      console.log('Auth successful, redirecting...');
      router.push('/dashboard');
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
      router.push('/dashboard');
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

        <div className="w-full max-w-[450px] space-y-10">
          <div className="text-center">
            <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner shadow-slate-200/50">
              <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="text-4xl font-outfit font-black text-slate-900 tracking-tighter lowercase mb-2">
              {isSignUp ? 'Join the future.' : 'Welcome back.'}
            </h1>
            <p className="text-text-muted font-medium text-lg italic">
              {isSignUp ? 'Create your professional account.' : 'Sign in to your AI workstation.'}
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 ml-1 uppercase tracking-widest" htmlFor="email">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-primary transition-colors" size={20} />
                <input 
                  type="email" 
                  id="email" 
                  placeholder="name@example.com" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-12 text-text-main focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all font-medium"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 ml-1 uppercase tracking-widest" htmlFor="password">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-primary transition-colors" size={20} />
                <input 
                  type="password" 
                  id="password" 
                  placeholder="••••••••" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-12 text-text-main focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-500 text-sm py-4 px-5 rounded-2xl text-center font-bold animate-shake">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 rounded-2xl bg-brand-primary text-white font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-brand-primary/20 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
              {isSignUp ? <UserPlus size={22} /> : <LogIn size={22} />}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black"><span className="bg-white px-6 text-slate-300 tracking-[4px]">IDENTITY VERIFICATION</span></div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full py-5 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-lg flex items-center justify-center gap-3 hover:bg-slate-50 active:scale-[0.98] transition-all shadow-sm"
          >
            <Globe size={22} className="text-brand-primary" />
            Continue with Google
          </button>

          <p className="text-center text-text-muted font-medium">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"} 
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
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
