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
  const [department, setDepartment] = useState<Department>('Frontend');
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
      await completeOnboarding(firebaseUser, role, department, internshipStartDate, internshipEndDate);
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
            <label className="form-label" htmlFor="department">
              Department
            </label>
            <select
              id="department"
              className="form-select"
              value={department}
              onChange={(e) => setDepartment(e.target.value as Department)}
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
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

          <div className="form-group">
            <label className="form-label" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="intern">Intern</option>
              <option value="hr">HR</option>
              <option value="co-founder">Co-Founder</option>
              <option value="founder">Founder</option>
            </select>
          </div>

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
