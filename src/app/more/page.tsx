'use client';

import CardSection from '@/components/ui/CardSection';

export default function MorePage() {
  return (
    <div className="mx-auto max-w-md px-4 pb-24">
      <CardSection
        title="더보기"
        description="기타 설정 및 정보를 확인할 수 있어요."
      >
        <div className="divide-y">
          {/* 외부 링크 1 */}
          <a
            href="https://drive.google.com/file/d/1NrzYXccyQYbQ2FKx5TrnXqIMdx1ho93F/viewhttps://docs.google.com/spreadsheets/d/XXXX"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-between py-3 text-sm hover:bg-zinc-50 rounded-md px-3"
          >
            <span>크림슨블루 회칙</span>
            <span className="text-zinc-400">↗</span>
          </a>

          {/* 외부 링크 2 */}
          <a
            href="https://docs.google.com/spreadsheets/d/16kXhEch_y5-69sSA4bxa5xV0AefVNnFHl52NN9dWJ_A/edit?gid=659829463#gid=659829463"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-between py-3 text-sm hover:bg-zinc-50 rounded-md px-3"
          >
            <span>담당 업무</span>
            <span className="text-zinc-400">↗</span>
          </a>
        </div>
      </CardSection>
    </div>
  );
}
