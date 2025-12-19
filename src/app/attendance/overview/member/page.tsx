'use client';

import { useState } from 'react';
import CardSection from '@/components/ui/CardSection';
import MemberView, { type SortDir, type SortKey } from '@/components/attendance/overview/MemberView';

export default function MemberOverviewPage() {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSortDir = () => setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));

  return (
    <CardSection
      title="회원별 출석 현황"
      description="회원 단위로 출석 및 점수를 확인해요."
      rightAction={
        <div className="flex items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-fg"
          >
            <option value="name">이름순</option>
            <option value="score">점수순</option>
          </select>

          <button
            type="button"
            onClick={toggleSortDir}
            title={sortDir === 'asc' ? '오름차순' : '내림차순'}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-fg transition hover:bg-white/10 active:scale-[0.99]"
          >
            {sortDir === 'asc' ? '▲' : '▼'}
          </button>
        </div>
      }
    >
      <MemberView sortKey={sortKey} sortDir={sortDir} />
    </CardSection>
  );
}
