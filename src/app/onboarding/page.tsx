'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { completeOnboarding } from '@/lib/auth';
import { DEPARTMENTS, type Department, type UserRole } from '@/types';

export default function OnboardingPage() {
  const router = useRouter();
  const { firebaseUser, mimoUser, loading } = useAuthStore();
  
  const [role, setRole] = useState<UserRole>('intern');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [departments, setDepartments] = useState<Department[]>(['Frontend']);
  const [internshipStartDate, setInternshipStartDate] = useState('');
  const [internshipEndDate, setInternshipEndDate] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Route away once auth resolves
  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace('/login');
    } else if (mimoUser) {
      // Already has a profile — route to correct place
      router.replace('/login');
    }
  }, [firebaseUser, mimoUser, loading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    
    setError('');
    setIsSubmitting(true);

    try {
      await completeOnboarding(firebaseUser, role, departments, phoneNumber, internshipStartDate, internshipEndDate);
      router.push('/pending');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to complete profile';
      setError(message);
      setIsSubmitting(false);
    }
  };

  // Show spinner only while loading or while mimoUser redirects
  if (loading || !firebaseUser) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  // If they have a profile, don't render form (redirect effect will fire)
  if (mimoUser) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card animate-in">
        <div className="auth-logo">
          <h1>Mimo</h1>
          <p>Complete Your Profile</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div style={{ marginBottom: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Welcome, <strong>{firebaseUser.displayName || firebaseUser.email}</strong>! <br/>
          Just one more step before your account is ready for approval.
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="ob-phone">
              Phone Number
            </label>
            <input
              id="ob-phone"
              type="tel"
              className="form-input"
              placeholder="9876543210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              className="form-select"
              value={role}
              onChange={(e) => {
                const r = e.target.value as UserRole;
                setRole(r);
                if (r === 'hr') setDepartments(['HR']);
                else if (r === 'founder') setDepartments(['Management']);
                else setDepartments(['Frontend']);
              }}
            >
              <option value="intern">Intern</option>
              <option value="hr">HR</option>
              <option value="founder">Founder</option>
            </select>
          </div>

          {role === 'intern' && (
            <>
              <div className="form-group">
                <label className="form-label">
                  Departments
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                  {DEPARTMENTS.map((dept) => (
                    <label key={dept} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'var(--bg-glass)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', fontSize: '14px' }}>
                      <input
                        type="checkbox"
                        checked={departments.includes(dept)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setDepartments([...departments, dept]);
                          } else {
                            if (departments.length > 1) {
                              setDepartments(departments.filter(d => d !== dept));
                            }
                          }
                        }}
                      />
                      {dept}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="start-date">
                    Internship Start Date
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    className="form-input"
                    value={internshipStartDate}
                    onChange={(e) => setInternshipStartDate(e.target.value)}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="end-date">
                    Internship End Date
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    className="form-input"
                    value={internshipEndDate}
                    onChange={(e) => setInternshipEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isSubmitting}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {isSubmitting ? (
              <span className="spinner spinner-sm" style={{ borderTopColor: 'white' }} />
            ) : (
              'Complete Setup'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
