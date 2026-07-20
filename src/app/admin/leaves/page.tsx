'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getAllLeaveRequests, updateLeaveStatus, createNotification } from '@/lib/firestore';
import type { LeaveRequest } from '@/types';

export default function AdminLeavesPage() {
  const { mimoUser } = useAuthStore();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (mimoUser) fetchRequests();
  }, [mimoUser]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await getAllLeaveRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (req: LeaveRequest) => {
    if (!mimoUser) return;
    try {
      await updateLeaveStatus(req.id!, 'approved', mimoUser.uid);
      await createNotification({
        userId: req.userId,
        title: 'Leave Approved',
        message: `Your ${req.leaveType} leave request for ${req.days} days has been approved.`,
        type: 'system',
        read: false,
        createdAt: new Date().toISOString()
      });
      await fetchRequests();
    } catch (err) {
      console.error(err);
      alert('Failed to approve request');
    }
  };

  const handleRejectSubmit = async (req: LeaveRequest) => {
    if (!mimoUser || !rejectingId) return;
    if (!rejectionReason) {
      alert('Please provide a reason for rejection.');
      return;
    }

    try {
      await updateLeaveStatus(req.id!, 'rejected', mimoUser.uid, rejectionReason);
      await createNotification({
        userId: req.userId,
        title: 'Leave Rejected',
        message: `Your leave request was rejected: ${rejectionReason}`,
        type: 'system',
        read: false,
        createdAt: new Date().toISOString()
      });
      setRejectingId(null);
      setRejectionReason('');
      await fetchRequests();
    } catch (err) {
      console.error(err);
      alert('Failed to reject request');
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const historyRequests = requests.filter(r => r.status !== 'pending');

  if (loading) return <div style={{ padding: '24px' }}>Loading leaves...</div>;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Team Leave Requests</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Review and manage employee leave applications.</p>
        </div>
      </div>

      <div className="glass-card-static" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Pending Requests 
          {pendingRequests.length > 0 && (
            <span style={{ background: 'var(--status-flagged)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
              {pendingRequests.length}
            </span>
          )}
        </h2>
        
        {pendingRequests.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No pending requests.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 0', fontWeight: 600 }}>Employee</th>
                  <th style={{ padding: '12px 0', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '12px 0', fontWeight: 600 }}>Dates</th>
                  <th style={{ padding: '12px 0', fontWeight: 600 }}>Days</th>
                  <th style={{ padding: '12px 0', fontWeight: 600 }}>Reason</th>
                  <th style={{ padding: '12px 0', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px 0', fontWeight: 600 }}>{req.userName}</td>
                    <td style={{ padding: '16px 0' }}>{req.leaveType}</td>
                    <td style={{ padding: '16px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                      {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 0', fontWeight: 600 }}>{req.days}</td>
                    <td style={{ padding: '16px 0', color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {req.reason}
                    </td>
                    <td style={{ padding: '16px 0' }}>
                      {rejectingId === req.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Reason for rejection..."
                            value={rejectionReason}
                            onChange={e => setRejectionReason(e.target.value)}
                            autoFocus
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-sm" style={{ background: 'var(--status-flagged)', color: 'white' }} onClick={() => handleRejectSubmit(req)}>Confirm</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setRejectingId(null); setRejectionReason(''); }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-sm" style={{ background: 'var(--status-active)', color: 'white' }} onClick={() => handleApprove(req)}>Approve</button>
                          <button className="btn btn-sm" style={{ background: 'var(--status-flagged)', color: 'white' }} onClick={() => setRejectingId(req.id!)}>Reject</button>
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

      <div className="glass-card-static" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Leave History</h2>
        {historyRequests.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No past requests.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 0', fontWeight: 600 }}>Employee</th>
                  <th style={{ padding: '12px 0', fontWeight: 600 }}>Dates</th>
                  <th style={{ padding: '12px 0', fontWeight: 600 }}>Reason</th>
                  <th style={{ padding: '12px 0', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {historyRequests.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px 0', fontWeight: 600 }}>{req.userName}</td>
                    <td style={{ padding: '16px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                      {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 0', color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {req.reason}
                    </td>
                    <td style={{ padding: '16px 0' }}>
                      <span className={`status-badge status-${req.status}`}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
