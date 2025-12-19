'use client';

import { useState } from 'react';
import MobileHeader from '@/components/layout/MobileHeader';

import SessionView from '@/components/attendance/overview/SessionView';
import MemberView from '@/components/attendance/overview/MemberView';

export default function AttendanceOverviewPage() {
  const [activeTab, setActiveTab] = useState<'session' | 'member'>('session');

  return (
    <div className="min-h-screen bg-white">
      <main className="space-y-3 p-4">
        {/* 탭 버튼 */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={[
              'rounded-md border px-3 py-2 text-sm font-semibold',
              activeTab === 'session'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-700',
            ].join(' ')}
            onClick={() => setActiveTab('session')}
          >
            Session View
          </button>

          <button
            type="button"
            className={[
              'rounded-md border px-3 py-2 text-sm font-semibold',
              activeTab === 'member'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-700',
            ].join(' ')}
            onClick={() => setActiveTab('member')}
          >
            Member View
          </button>
        </div>

        {/* Session View */}
        {activeTab === 'session' && <SessionView />}

        {/* Member View */}
        {activeTab === 'member' && <MemberView />}
      </main>
    </div>
  );
}
