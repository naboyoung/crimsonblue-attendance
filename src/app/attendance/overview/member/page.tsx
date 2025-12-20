'use client';

import CardSection from '@/components/ui/CardSection';
import MemberView from '@/components/attendance/overview/MemberView';

export default function MemberOverviewPage() {
  return (
    <CardSection
      title="회원별 출석 현황"
      description="회원 단위로 출석 및 점수를 확인해요."
      // 🔧 CHANGED: 정렬 UI는 MemberView 내부(리스트 바로 위)로 이동
    >
      <MemberView />
    </CardSection>
  );
}
