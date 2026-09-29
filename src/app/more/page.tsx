'use client';

import { useState } from 'react';
import CardSection from '@/components/ui/CardSection';
import { Button } from '@/components/ui/button';
import Link from "next/link";

export default function MorePage() {
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  async function handleChangePassword() {
    setErr(null);
    setMsg(null);

    const cur = currentPassword.trim();
    const next = newPassword.trim();
    const next2 = confirmNewPassword.trim();

    if (!cur || !next || !next2) {
      setErr('현재 비밀번호와 새 비밀번호를 모두 입력해 주세요.');
      return;
    }
    if (next.length < 10) {
      setErr('새 비밀번호는 10자 이상으로 설정해 주세요.');
      return;
    }
    if (next !== next2) {
      setErr('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    if (cur === next) {
      setErr('현재 비밀번호와 다른 새 비밀번호를 입력해 주세요.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: cur, newPassword: next }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErr(data?.error || '비밀번호 변경에 실패했습니다.');
        return;
      }

      setMsg('비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용해 주세요.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPwModalOpen(false);
    } catch {
      setErr('네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-4">
      <CardSection title="더보기" description="기타 설정 및 정보를 확인할 수 있어요.">
        <div className="divide-y">
          {/* 크림슨블루 회칙 */}
          <a
            href={process.env.NEXT_PUBLIC_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-between rounded-md px-3 py-3 text-sm hover:bg-zinc-50"
          >
            <span>크림슨블루 회칙</span>
            <span className="text-zinc-400">↗</span>
          </a>

          {/* 담당업무(Google Sheet) */}
          <a
            href={process.env.NEXT_PUBLIC_ORIGINAL_SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-between rounded-md px-3 py-3 text-sm hover:bg-zinc-50"
          >
            <span>담당 업무</span>
            <span className="text-zinc-400">↗</span>
          </a>

          {/* 개인 출석조회 열람설정 */}
          <Link
            href="/more/my-attendance"
            className="flex w-full items-center justify-between rounded-md px-3 py-3 text-sm hover:bg-zinc-50"
          >
            <span>출석조회 열람설정 (회원용)</span>
            <span className="text-zinc-400">›</span>
          </Link>

          {/* 비밀번호 변경 */}
          <button
            type="button"
            onClick={() => {
              setErr(null);
              setMsg(null);
              setPwModalOpen(true);
            }}
            className="flex w-full items-center justify-between rounded-md px-3 py-3 text-sm hover:bg-zinc-50"
          >
            <span>비밀번호 변경</span>
            <span className="text-zinc-400">›</span>
          </button>

          {/* 로그아웃 */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-between rounded-md px-3 py-3 text-sm hover:bg-zinc-50"
          >
            <span className="text-red-600">로그아웃</span>
            <span className="text-zinc-400">⎋</span>
          </button>
        </div>

        {/* 상태 메시지(선택) */}
        {msg && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {msg}
          </div>
        )}
        {err && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}
      </CardSection>

      {/* 비밀번호 변경 모달 */}
      {pwModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center"
          onClick={() => setPwModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">비밀번호 변경</h2>
              <button
                type="button"
                onClick={() => setPwModalOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100"
              >
                닫기
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <div className="text-xs text-zinc-600">현재 비밀번호</div>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                  placeholder="현재 비밀번호 입력"
                  autoFocus
                />
              </div>

              <div>
                <div className="text-xs text-zinc-600">새 비밀번호</div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                  placeholder="10자 이상"
                />
              </div>

              <div>
                <div className="text-xs text-zinc-600">새 비밀번호 확인</div>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                  placeholder="새 비밀번호 다시 입력"
                />
              </div>

              {err && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {err}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setPwModalOpen(false)}
                  disabled={saving}
                >
                  취소
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleChangePassword}
                  disabled={saving}
                >
                  {saving ? '변경 중...' : '변경하기'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
