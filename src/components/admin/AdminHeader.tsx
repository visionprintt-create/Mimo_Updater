'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set('q', val);
    } else {
      params.delete('q');
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <header className="admin-header">
      {/* Search Bar */}
      <div className="admin-search">
        <svg width="20" height="20" fill="none" stroke="var(--text-secondary)" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          type="text" 
          placeholder="Search interns, departments, reviews..." 
          value={query}
          onChange={handleSearch}
        />
      </div>

      {/* Right side actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        {/* Bell Icon */}
        <button style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '8px' }}>
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
        
        {/* User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: 'none', paddingLeft: '32px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--mimo-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', boxShadow: '0 0 15px rgba(214, 155, 105, 0.4)' }}>
            AD
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px', lineHeight: '1.2' }}>Admin User</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' }}>ADMINISTRATOR</span>
          </div>
        </div>
      </div>
    </header>
  );
}
