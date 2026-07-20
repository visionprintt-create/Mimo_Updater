'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { createLeaveRequest, getUserLeaveRequests, createNotification } from '@/lib/firestore';
import type { LeaveRequest, LeaveType } from '@/types';
import { calculateBusinessDays } from '@/lib/dateUtils';
import styles from '../dashboard/Dashboard.module.css';

export default function EmployeeLeavePage() {
  const { mimoUser } = useAuthStore();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    startDate: '',
    endDate: '',
    leaveType: 'Casual' as LeaveType,
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const ANNUAL_LEAVE_ALLOWANCE = 20;

  useEffect(() => {
    if (mimoUser) {
      fetchRequests();
    }
  }, [mimoUser]);

  const fetchRequests = async () => {
    if (!mimoUser) return;
    try {
      const data = await getUserLeaveRequests(mimoUser.uid);
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysTaken = () => {
    return requests
      .filter(r => r.status === 'approved')
      .reduce((total, r) => total + r.days, 0);
  };

  const daysTaken = calculateDaysTaken();
  const daysRemaining = Math.max(0, ANNUAL_LEAVE_ALLOWANCE - daysTaken);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mimoUser) return;
    setError('');
    setSubmitting(true);

    const days = calculateBusinessDays(form.startDate, form.endDate);
    if (days <= 0) {
      setError('Invalid date range. Please select valid business days.');
      setSubmitting(false);
      return;
    }

    try {
      const newRequest: Omit<LeaveRequest, 'id'> = {
        userId: mimoUser.uid,
        userName: mimoUser.displayName,
        startDate: form.startDate,
        endDate: form.endDate,
        days,
        leaveType: form.leaveType,
        reason: form.reason,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await createLeaveRequest(newRequest);
      
      // Notify managers
      if (mimoUser.managerId) {
         await createNotification({
            userId: mimoUser.managerId,
            title: 'New Leave Request',
            message: `${mimoUser.displayName} has requested ${days} day(s) of leave.`,
            type: 'system',
            read: false,
            createdAt: new Date().toISOString()
         });
      }

      await fetchRequests();
      setShowModal(false);
      setForm({ startDate: '', endDate: '', leaveType: 'Casual', reason: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '24px' }}>Loading leaves...</div>;

  return (
    <div className="fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Leave Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track and manage your leave requests.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Apply for Leave
        </button>
      </div>

      {/* Balance Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-card-static" style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>{ANNUAL_LEAVE_ALLOWANCE}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>Total Allowance</div>
        </div>
        <div className="glass-card-static" style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--status-active)' }}>{daysTaken}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>Days Taken</div>
        </div>
        <div className="glass-card-static" style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '32px', fontWeight: 800, color: daysRemaining < 5 ? 'var(--status-flagged)' : 'var(--mimo-primary)' }}>{daysRemaining}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>Days Remaining</div>
        </div>
      </div>

      {/* Request History Table */}
      <div className="glass-card-static" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Request History</h2>
        {requests.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No leave requests found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 0', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '12px 0', fontWeight: 600 }}>Duration</th>
                  <th style={{ padding: '12px 0', fontWeight: 600 }}>Days</th>
                  <th style={{ padding: '12px 0', fontWeight: 600 }}>Reason</th>
                  <th style={{ padding: '12px 0', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px 0', fontWeight: 500 }}>{req.leaveType}</td>
                    <td style={{ padding: '16px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                      {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 0', fontWeight: 600 }}>{req.days}</td>
                    <td style={{ padding: '16px 0', color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {req.reason}
                    </td>
                    <td style={{ padding: '16px 0' }}>
                      <span className={`status-badge status-${req.status}`}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                      {req.rejectionReason && (
                        <div style={{ fontSize: '12px', color: 'var(--status-flagged)', marginTop: '4px' }}>
                          Reason: {req.rejectionReason}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Application Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content glass-card-static" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>Apply for Leave</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Submit a new leave request.</p>
            {error && (
              <div style={{ color: 'var(--status-flagged)', background: 'rgba(235,87,87,0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Start Date</label>
                  <input required className="form-input" type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">End Date</label>
                  <input required className="form-input" type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="form-label">Leave Type</label>
                <select className="form-input" value={form.leaveType} onChange={e => setForm({...form, leaveType: e.target.value as LeaveType})}>
                  <option value="Casual">Casual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </select>
              </div>
              <div>
                <label className="form-label">Reason</label>
                <textarea 
                  required 
                  className="form-input" 
                  rows={3} 
                  placeholder="Briefly explain the reason for your leave..."
                  value={form.reason} 
                  onChange={e => setForm({...form, reason: e.target.value})} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !form.startDate || !form.endDate || !form.reason}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
