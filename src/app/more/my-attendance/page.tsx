"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import { FIELD_BASE, cx } from "@/components/ui/fieldStyles";

// ✅ CardSection 대신: 이 페이지 안에서만 쓰는 “출석등록 톤” 섹션 카드
function SectionCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-4">
      <div className="text-sm font-semibold">{title}</div>
      {desc ? <div className="mt-1 text-xs text-zinc-600">{desc}</div> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function MyAttendanceAdminPage() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState(
    "현재 개인 출석 조회 기간이 아닙니다. 단톡방 공지를 확인해 주세요."
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/my-attendance-config", {
        method: "GET",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);

      if (data?.ok) {
        setEnabled(!!data.enabled);
        setMessage(String(data.message ?? ""));
      } else {
        setToast("설정을 불러오지 못했습니다.");
      }
    } catch {
      setToast("설정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/my-attendance-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, message }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setToast(data?.message ?? "저장에 실패했습니다.");
        return;
      }

      setToast("저장되었습니다.");
      await load();
    } catch {
      setToast("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <PageShell>
      {/* ✅ 출석등록 페이지 톤처럼: 상단 헤더를 페이지 내부에서 직접 */}
      <div className="mx-auto max-w-md px-4 pt-4">
        <div className="text-lg font-semibold">개인 출석조회 설정</div>
        <div className="mt-1 text-sm text-zinc-600">
          개인 출석조회(/my) 열기/닫기 및 안내 문구를 관리합니다.
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 pb-6 pt-4 space-y-4">
        <SectionCard
          title="열람 설정"
          desc="단톡방 공지 시점에 ON으로 바꾸고, 분기 종료 후 OFF로 바꿔 주세요."
        >
          {loading ? (
            <div className="text-sm text-zinc-500">불러오는 중...</div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                현재 상태:{" "}
                <span className={cx("font-semibold", enabled ? "text-emerald-600" : "text-zinc-600")}>
                  {enabled ? "열림(ON)" : "닫힘(OFF)"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setEnabled((v) => !v)}
                className={cx(
                  "rounded-md px-3 py-2 text-sm font-semibold border",
                  enabled ? "bg-black text-white border-black" : "bg-white text-zinc-800 border-zinc-200",
                  loading || saving ? "opacity-60" : ""
                )}
                disabled={loading || saving}
              >
                {enabled ? "ON" : "OFF"}
              </button>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="닫힘 안내 문구"
          desc="OFF 상태에서 /my 페이지에 표시되는 안내 문구입니다."
        >
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={cx(FIELD_BASE, "min-h-[96px] resize-none")}
            placeholder="예) 현재 개인 출석 조회 기간이 아닙니다. 단톡방 공지를 확인해 주세요."
            disabled={loading || saving}
          />

          <div className="mt-2 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            미리보기: {message || "현재 개인 출석 조회 기간이 아닙니다. 단톡방 공지를 확인해 주세요."}
          </div>
        </SectionCard>

        <SectionCard title="저장" desc="저장하면 즉시 /my 페이지에 반영됩니다.">
          {toast ? (
            <div className="mb-3 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              {toast}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={loading || saving}
              className="flex-1 rounded-md bg-black px-3 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
            >
              {saving ? "저장 중..." : "저장"}
            </button>

            <button
              type="button"
              onClick={load}
              disabled={saving}
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
            >
              새로고침
            </button>
          </div>

          <div className="mt-3 text-xs text-zinc-500">
            개인 출석조회 URL: <span className="font-semibold">/my</span>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
