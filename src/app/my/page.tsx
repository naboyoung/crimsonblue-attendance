"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Gate = { enabled: boolean; message: string };

export default function MyLookupPage() {
  const router = useRouter();

  const [gateLoading, setGateLoading] = useState(true);
  const [gate, setGate] = useState<Gate | null>(null);

  const [name, setName] = useState("");
  const [last4, setLast4] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setGateLoading(true);
      try {
        const res = await fetch("/api/my/config", { method: "GET", cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (data?.ok) {
          setGate({ enabled: !!data.enabled, message: String(data.message ?? "") });
        } else {
          setGate({
            enabled: false,
            message: "현재 개인 출석 조회 기간이 아닙니다. 운영진 공지를 확인해 주세요.",
          });
        }
      } catch {
        setGate({
          enabled: false,
          message: "현재 개인 출석 조회 기간이 아닙니다. 운영진 공지를 확인해 주세요.",
        });
      } finally {
        setGateLoading(false);
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (gate && !gate.enabled) {
      setError(gate.message);
      return;
    }

    const n = name.trim();
    const l4 = last4.replace(/\D/g, "").slice(-4);

    if (!n || l4.length !== 4) {
      setError("이름과 휴대폰번호 뒤 4자리를 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/my/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, last4: l4 }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setError(data?.message ?? "조회에 실패했습니다. 입력값을 확인해 주세요.");
        return;
      }

      sessionStorage.setItem("MY_AUTH_TOKEN", data.token);
      sessionStorage.setItem("MY_PROFILE_NAME", data.profile?.name ?? n);
      sessionStorage.setItem("MY_PROFILE_ROLE", data.profile?.role ?? "");

      router.push("/my/view");
    } finally {
      setLoading(false);
    }
  }

  if (gateLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="rounded-2xl border bg-white p-4 text-sm">불러오는 중...</div>
      </div>
    );
  }

  // ✅ OFF면: 입력 폼 자체를 숨기고 안내만
  if (gate && !gate.enabled) {
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-lg font-semibold">내 출석 조회</div>
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {gate.message || "현재 개인 출석 조회 기간이 아닙니다. 운영진 공지를 확인해 주세요."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-lg font-semibold">내 출석 조회</div>
        <div className="mt-1 text-sm text-slate-600">
          이름과 휴대폰번호 뒤 4자리를 입력하면 본인의 출석현황을 확인할 수 있어요.
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div className="space-y-1">
            <div className="text-xs text-slate-600">이름</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
              placeholder="예) 크블"
              autoComplete="name"
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-slate-600">휴대폰번호 뒤 4자리</div>
            <input
              value={last4}
              onChange={(e) => setLast4(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
              placeholder="예) 1234"
              inputMode="numeric"
              maxLength={4}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "조회 중..." : "출석현황 조회"}
          </button>

          <div className="text-xs text-slate-500">
            ※ 휴대폰 번호가 등록되어 있지 않다면 운영진에게 문의해 주세요.
          </div>
        </form>
      </div>
    </div>
  );
}
