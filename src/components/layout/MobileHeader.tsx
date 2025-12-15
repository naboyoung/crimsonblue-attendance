'use client';

import { useRouter } from 'next/navigation';

type Props = {
  title: string;
  backHref?: string; // 뒤로가기 스택이 없을 때 대비
};

export default function MobileHeader({ title, backHref = '/' }: Props) {
  const router = useRouter();

  const onBack = () => {
    // ✅ 모바일 웹에서 새 탭/직접 진입 케이스 대응
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push(backHref);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="h-12 px-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="h-9 w-9 rounded-md border border-slate-200 text-sm font-semibold"
          aria-label="뒤로가기"
        >
          ←
        </button>
        <h1 className="text-base font-semibold">{title}</h1>
      </div>
    </header>
  );
}
