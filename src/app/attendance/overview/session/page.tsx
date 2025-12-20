'use client';

import CardSection from '@/components/ui/CardSection';
import SessionView from '@/components/attendance/overview/SessionView';

export default function SessionOverviewPage() {
  return (
    <CardSection
      title="세션별 출석 현황"
      description="세션 단위로 참석자와 모임 기록을 확인해요."
    >
      <SessionView />
    </CardSection>
  );
}
