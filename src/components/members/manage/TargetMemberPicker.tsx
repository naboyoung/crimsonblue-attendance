"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ManageMode } from "./ManageModeTabs";

export type PickMemberRole = "운영진" | "정회원" | "준회원" | "휴면" | "탈퇴";

export type PickMember = {
  member_id: string;
  name: string;
  role: PickMemberRole;
  total_score?: number; // 출석 미달자 필터에서만 내려옴
};

type ViewState = "idle" | "loading" | "empty" | "results" | "error";
type PickMode = "SEARCH" | "FILTER";

const ROLES: PickMemberRole[] = ["운영진", "정회원", "준회원", "휴면", "탈퇴"];
type AttendanceUnder = "quarter" | "half";

export function TargetMemberPicker(props: {
  mode: ManageMode;
  selectedMembers: PickMember[];
  onChangeSelectedMembers: (next: PickMember[]) => void;
}) {
  const { mode, selectedMembers, onChangeSelectedMembers } = props;
  const canMulti = mode === "ROLE_STATUS";

  const [pickMode, setPickMode] = useState<PickMode>("SEARCH");

  const [name, setName] = useState("");
  const [roleFilter, setRoleFilter] = useState<PickMemberRole | null>(null);
  const [attendanceUnder, setAttendanceUnder] = useState<AttendanceUnder | null>(null);

  const [state, setState] = useState<ViewState>("idle");
  const [list, setList] = useState<PickMember[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const selectedIdSet = useMemo(
    () => new Set(selectedMembers.map((m) => m.member_id)),
    [selectedMembers]
  );

  // =========================
  // ✅ Autocomplete (SEARCH mode)
  // =========================
  const [acOpen, setAcOpen] = useState(false);
  const [acLoading, setAcLoading] = useState(false);
  const [acItems, setAcItems] = useState<string[]>([]);
  const acBoxRef = useRef<HTMLDivElement | null>(null);

  const runSearch = useCallback(async () => {
    setState("loading");
    setList([]);
    setCheckedIds(new Set());

    try {
      const params = new URLSearchParams();

      if (pickMode === "SEARCH" && name.trim()) {
        params.set("name", name.trim());
      }

      if (pickMode === "FILTER") {
        if (attendanceUnder) {
          params.set("attendance_under", attendanceUnder);
        } else if (roleFilter) {
          params.set("roles", roleFilter);
        }
      }

      if ([...params.keys()].length === 0) {
        setState("idle");
        return;
      }

      const res = await fetch(`/api/members/lookup?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "조회 실패");

      const members = (data.members ?? []) as PickMember[];
      setList(members);
      setState(members.length ? "results" : "empty");
    } catch {
      setState("error");
    }
  }, [name, roleFilter, attendanceUnder, pickMode]);

  // ✅ 필터 칩 클릭 즉시 조회
  useEffect(() => {
    if (pickMode !== "FILTER") return;
    if (!roleFilter && !attendanceUnder) return;
    runSearch();
  }, [pickMode, roleFilter, attendanceUnder, runSearch]);

  // ✅ SEARCH 자동완성: 입력 디바운스 후 후보 fetch
  useEffect(() => {
    if (pickMode !== "SEARCH") {
      setAcOpen(false);
      setAcItems([]);
      setAcLoading(false);
      return;
    }

    const q = name.trim();
    if (q.length < 1) {
      setAcOpen(false);
      setAcItems([]);
      setAcLoading(false);
      return;
    }

    let alive = true;
    const t = window.setTimeout(async () => {
      try {
        setAcLoading(true);
        const res = await fetch(`/api/members/lookup?name=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!alive) return;

        if (!res.ok || !data?.ok) {
          setAcItems([]);
          setAcOpen(false);
          return;
        }

        const members = (data.members ?? []) as PickMember[];
        // ✅ 이름만, 중복 제거, 최대 8개
        const uniq = Array.from(
          new Set(members.map((m) => (m.name ?? "").trim()).filter(Boolean))
        ).slice(0, 8);

        setAcItems(uniq);
        setAcOpen(uniq.length > 0);
      } finally {
        if (alive) setAcLoading(false);
      }
    }, 200);

    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [name, pickMode]);

  // ✅ 자동완성 바깥 클릭 시 닫기
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = acBoxRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setAcOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const selectAutocomplete = (v: string) => {
    setName(v);
    setAcOpen(false);
  };

  // =========================
  // list selection helpers
  // =========================
  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const checkAll = () => setCheckedIds(new Set(list.map((m) => m.member_id)));
  const uncheckAll = () => setCheckedIds(new Set());

  const applyChecked = () => {
    const map = new Map<string, PickMember>();
    selectedMembers.forEach((m) => map.set(m.member_id, m));
    list.forEach((m) => {
      if (checkedIds.has(m.member_id)) map.set(m.member_id, m);
    });
    onChangeSelectedMembers(Array.from(map.values()));
    setCheckedIds(new Set());
  };

  const clearSelected = () => onChangeSelectedMembers([]);
  const removeSelected = (id: string) =>
    onChangeSelectedMembers(selectedMembers.filter((m) => m.member_id !== id));

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex justify-between">
        <div>
          <div className="font-semibold">대상 회원 선택</div>
          <div className="text-xs text-zinc-500">
            {canMulti ? "여러 명 선택 가능" : "1명만 선택 가능"}
          </div>
        </div>
        {selectedMembers.length > 0 && (
          <button onClick={clearSelected} className="text-xs text-zinc-500 underline">
            전체 해제
          </button>
        )}
      </div>

      {/* 선택된 회원 */}
      <div className="mt-3 max-h-[96px] overflow-auto flex flex-wrap gap-2">
        {selectedMembers.length === 0 ? (
          <div className="text-sm text-zinc-500">선택된 회원 없음</div>
        ) : (
          selectedMembers.map((m) => (
            <div key={m.member_id} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
              {m.name}
              <span className="text-xs text-zinc-500">({m.role})</span>
              <button onClick={() => removeSelected(m.member_id)}>✕</button>
            </div>
          ))
        )}
      </div>

      {/* 모드 전환 */}
      {canMulti && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setPickMode("SEARCH")}
            className={`flex-1 rounded-xl border py-2 text-sm ${
              pickMode === "SEARCH" ? "bg-zinc-900 text-white" : ""
            }`}
          >
            검색
          </button>
          <button
            onClick={() => setPickMode("FILTER")}
            className={`flex-1 rounded-xl border py-2 text-sm ${
              pickMode === "FILTER" ? "bg-zinc-900 text-white" : ""
            }`}
          >
            필터
          </button>
        </div>
      )}

      {/* 검색 */}
      {pickMode === "SEARCH" && (
        <div className="mt-4" ref={acBoxRef}>
          <div className="relative flex gap-2">
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setAcOpen(true);
              }}
              onFocus={() => {
                if (acItems.length > 0) setAcOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setAcOpen(false);
                  runSearch();
                }
                if (e.key === "Escape") setAcOpen(false);
              }}
              placeholder="이름 검색"
              className="flex-1 rounded-xl border px-3 py-2 text-sm"
            />

            <button onClick={() => { setAcOpen(false); runSearch(); }} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white">
              검색
            </button>

            {/* 자동완성 드롭다운 */}
            {acOpen && (
              <div className="absolute left-0 right-[76px] top-[44px] z-10 rounded-xl border bg-white shadow-sm">
                {acLoading ? (
                  <div className="px-3 py-2 text-sm text-zinc-500">불러오는 중…</div>
                ) : acItems.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-zinc-500">후보 없음</div>
                ) : (
                  <ul className="max-h-[220px] overflow-auto">
                    {acItems.map((v) => (
                      <li key={v}>
                        <button
                          type="button"
                          onClick={() => selectAutocomplete(v)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
                        >
                          {v}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="mt-2 text-xs text-zinc-500">
            입력 중에는 이름 후보가 표시됩니다. (선택하면 바로 검색)
          </div>
        </div>
      )}

      {/* 필터 */}
      {pickMode === "FILTER" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => {
                setAttendanceUnder(null);
                setRoleFilter(r);
              }}
              className={`rounded-full border px-3 py-1 text-sm ${
                roleFilter === r ? "bg-zinc-900 text-white" : ""
              }`}
            >
              {r}
            </button>
          ))}

          <button
            onClick={() => {
              setRoleFilter(null);
              setAttendanceUnder("quarter");
            }}
            className={`rounded-full border px-3 py-1 text-sm ${
              attendanceUnder === "quarter" ? "bg-zinc-900 text-white" : ""
            }`}
          >
            이번 분기 출석 미달자
          </button>

          <button
            onClick={() => {
              setRoleFilter(null);
              setAttendanceUnder("half");
            }}
            className={`rounded-full border px-3 py-1 text-sm ${
              attendanceUnder === "half" ? "bg-zinc-900 text-white" : ""
            }`}
          >
            이번 반기 출석 미달자
          </button>

          <button
            onClick={() => {
              setRoleFilter(null);
              setAttendanceUnder(null);
              setState("idle");
              setList([]);
              setCheckedIds(new Set());
            }}
            className="ml-auto text-xs text-zinc-500 underline"
          >
            초기화
          </button>
        </div>
      )}

      {/* 결과 */}
      <div className="mt-4">
        {state === "loading" && <div className="text-sm text-zinc-500">조회 중…</div>}
        {state === "error" && <div className="text-sm text-red-600">조회 오류</div>}

        {state === "results" && (
          <>
            <div className="mb-2 flex gap-2 text-xs">
              <button onClick={checkAll} className="underline">
                전체선택
              </button>
              <button onClick={uncheckAll} className="underline">
                전체해제
              </button>
            </div>

            <div className="max-h-[260px] overflow-auto rounded-xl border">
              {list.map((m) => (
                <label key={m.member_id} className="flex items-center gap-3 border-b px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={checkedIds.has(m.member_id)}
                    onChange={() => toggleCheck(m.member_id)}
                  />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {m.name}
                      {selectedIdSet.has(m.member_id) && (
                        <span className="ml-2 text-xs text-zinc-500">(이미 선택됨)</span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                      <span>{m.role}</span>
                      {typeof m.total_score === "number" && (
                        <span>점수 합계: {m.total_score}점</span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <button
              onClick={applyChecked}
              disabled={checkedIds.size === 0}
              className="mt-3 w-full rounded-xl bg-zinc-900 py-2 text-sm text-white disabled:bg-zinc-300"
            >
              선택한 항목 추가
            </button>
          </>
        )}

        {state === "empty" && <div className="text-sm text-zinc-500">결과 없음</div>}
        {state === "idle" && pickMode === "FILTER" && (
          <div className="text-sm text-zinc-500">필터를 선택하세요.</div>
        )}
      </div>
    </div>
  );
}
