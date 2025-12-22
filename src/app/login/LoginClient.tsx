"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextPath = useMemo(() => sp.get("next") || "/", [sp]);

  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr((data as any)?.error || "로그인에 실패했습니다.");
        return;
      }

      router.replace(nextPath);
    } catch {
      setErr("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-semibold">운영진 로그인</h1>
        <p className="mt-1 text-sm text-neutral-600">
          비밀번호를 입력하면 앱을 사용할 수 있어요.
        </p>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm text-neutral-700">비밀번호</span>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-500"
              placeholder="비밀번호 입력"
              autoFocus
            />
          </label>

          {err && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || pw.length === 0}
            className="w-full rounded-xl bg-black px-3 py-2 text-white disabled:opacity-50"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </main>
  );
}
