'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, signInWithGoogle, isAdmin } from '@/lib/auth';
import './login.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailLoading(true);

    try {
      const user = await signIn(email, password);

      if (isAdmin(user.role)) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      if (message === 'PENDING_APPROVAL') router.push('/pending');
      else if (message === 'ACCOUNT_REJECTED') setError('Your account has been rejected. Please contact HR.');
      else if (message === 'ACCOUNT_SUSPENDED') setError('Your account has been suspended. Please contact HR.');
      else if (message.includes('auth/invalid-credential') || message.includes('auth/user-not-found') || message.includes('auth/wrong-password')) {
        setError('Invalid email or password.');
      } else {
        setError(message);
      }
      setEmailLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      const user = await signInWithGoogle();
      if (!user) router.push('/onboarding');
      else if (isAdmin(user.role)) router.push('/admin');
      else router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google Login failed';
      if (message === 'PENDING_APPROVAL') router.push('/pending');
      else if (message === 'ACCOUNT_REJECTED') setError('Your account has been rejected. Please contact HR.');
      else if (message === 'ACCOUNT_SUSPENDED') setError('Your account has been suspended. Please contact HR.');
      else setError(message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-bg-image"></div>
      
      <div className="login-card">
        <div className="login-left">
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#1a1a1a', letterSpacing: '1px' }}>
              MIMO <span style={{ color: '#4a6358', fontStyle: 'italic' }}>MONITOR</span>
            </span>
          </div>
          <h1 className="login-title">Log in</h1>
          
          {error && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="login-form-group">
              <label className="login-label" htmlFor="email">Login, email or phone number</label>
              <div className="login-input-wrapper">
                <input
                  id="email"
                  type="email"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="login-form-group">
              <label className="login-label" htmlFor="password">Password</label>
              <div className="login-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword ? (
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    ) : (
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={emailLoading || googleLoading}>
              {emailLoading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <div className="login-divider">
            <span>or log in with</span>
          </div>

          <div className="login-socials">
            <button type="button" className="social-btn" onClick={handleGoogleSignIn} disabled={emailLoading || googleLoading}>
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </button>
            <button type="button" className="social-btn" disabled={emailLoading || googleLoading}>
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" fill="#E74C3C"/>
              </svg>
            </button>
          </div>

          <Link href="/forgot" className="login-forgot">Forgot login or password?</Link>

          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: '#666' }}>
            <p>
              Don&apos;t have an account?{' '}
              <Link href="/register" style={{ color: '#4a6358', fontWeight: 600, textDecoration: 'none' }}>Register here</Link>
            </p>
          </div>

          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: '#555', lineHeight: '1.6' }}>
            <p>
              Software Designed & Developed by{' '}
              <Link href="/admin" style={{ color: '#4a6358', textDecoration: 'none', fontWeight: 700 }}>Afifaaa</Link>
            </p>
            <p>© 2026 Vision Printt Technologies. All Rights Reserved.</p>
          </div>
        </div>
        
        <div className="login-right">
          {/* Wavy paper cutouts using SVG overlapping */}
          <svg className="wave-layer wave-3" viewBox="0 0 100 1000" preserveAspectRatio="none">
            <path d="M0,0 L60,0 C30,150 90,300 20,450 C-10,550 70,750 40,1000 L0,1000 Z" fill="currentColor"/>
          </svg>
          <svg className="wave-layer wave-2" viewBox="0 0 100 1000" preserveAspectRatio="none">
            <path d="M0,0 L60,0 C30,150 90,300 20,450 C-10,550 70,750 40,1000 L0,1000 Z" fill="currentColor"/>
          </svg>
          <svg className="wave-layer wave-1" viewBox="0 0 100 1000" preserveAspectRatio="none">
            <path d="M0,0 L60,0 C30,150 90,300 20,450 C-10,550 70,750 40,1000 L0,1000 Z" fill="currentColor"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
