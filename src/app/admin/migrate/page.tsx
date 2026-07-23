'use client';

import React, { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

export default function MigrateTasksPage() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMigrate = async () => {
    setLoading(true);
    setStatus('Fetching old weekly_tasks...');
    try {
      const snap = await getDocs(collection(db, 'weekly_tasks'));
      const oldTasks = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      
      setStatus(`Found ${oldTasks.length} old tasks. Migrating to new tasks collection...`);
      
      for (const old of oldTasks) {
        const ref = doc(db, 'tasks', old.id);
        const now = Timestamp.now();
        
        let dueDate = null;
        if (old.dueDate) {
          dueDate = Timestamp.fromDate(new Date(old.dueDate));
        }

        let completedAt = null;
        if (old.completedAt) {
          completedAt = Timestamp.fromDate(new Date(old.completedAt));
        }

        await setDoc(ref, {
          title: old.title || 'Untitled',
          description: '',
          assignedTo: old.userId || 'unknown',
          assignedBy: old.userId || 'unknown', // Defaulting to self for older tasks
          priority: 'Medium',
          status: old.completed ? 'completed' : 'pending',
          startDate: null,
          dueDate: dueDate,
          completedAt: completedAt,
          createdAt: old.createdAt ? Timestamp.fromDate(new Date(old.createdAt)) : now,
          updatedAt: now,
        });
      }
      
      setStatus(`Migration complete! Successfully moved ${oldTasks.length} tasks.`);
    } catch (e: any) {
      console.error(e);
      setStatus(`Error during migration: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1>Migrate Tasks Data</h1>
      <p>Click the button below to migrate old <code>weekly_tasks</code> to the new <code>tasks</code> collection.</p>
      <button 
        style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
        onClick={handleMigrate}
        disabled={loading}
      >
        {loading ? 'Migrating...' : 'Run Migration'}
      </button>
      {status && <p style={{ marginTop: '16px', fontWeight: 600 }}>{status}</p>}
    </div>
  );
}
