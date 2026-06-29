"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ManageMode } from "./ManageModeTabs";
import AutocompleteInput from "@/components/ui/AutocompleteInput";
import Segmented from "@/components/ui/Segmented";

export type PickMemberRole = "운영진" | "정회원" | "준회원" | "OB" | "휴면" | "탈퇴";

export type PickMember = {
  member_id: string;
  name: string;
  role: PickMemberRole;
  total_score?: number; // 출석 미달자 필터에서만 내려옴
};

type ViewState = "idle" | "loading" | "empty" | "results" | "error";
type AttendanceUnder = "quarter" | "half";

type FilterValue =
  | "운영진"
  | "정회원"
  | "준회원"
  | "OB"
  | "신입"
  | "휴면"
  | "탈퇴";

type RoleSegValue = "" | FilterValue;
type UnderSegValue = "" | AttendanceUnder;

const FILTER_OPTIONS = [
  { label: "운영진", value: "운영진" },
  { label: "정회원", value: "정회원" },
  { label: "준회원", value: "준회원" },
  { label: "OB", value: "OB" },
  { label: "신입", value: "신입" },
  { label: "휴면", value: "휴면" },
  { label: "탈퇴", value: "탈퇴" },
] as const;

const UNDER_OPTIONS = [
  { label: "이번 분기 미달", value: "quarter" },
  { label: "이번 반기 미달", value: "half" },
] as const;

function cx(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(" ");
}

export function TargetMemberPicker(props: {
  mode: ManageMode;
  selectedMembers: PickMember[];
  onChangeSelectedMembers: (next: PickMember[]) => void;
}) {
  const { mode, selectedMembers, onChangeSelectedMembers } = props;
  const canMulti = mode === "ROLE_STATUS";

  const [name, setName] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterValue | null>(null);
  const [attendanceUnder, setAttendanceUnder] = useState<AttendanceUnder | null>(
    null
  );

  const [state, setState] = useState<ViewState>("idle");
  const [list, setList] = useState<PickMember[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();

  // ✅ MembersLookupPage와 동일 패턴: suggest 후보
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const suggestDebounceRef = useRef<number | null>(null);

  // ✅ 실시간 조회 디바운스
  const searchDebounceRef = useRef<number | null>(null);

  const selectedIdSet = useMemo(
    () => new Set(selectedMembers.map((m) => m.member_id)),
    [selectedMembers]
  );

  const isNewbie = selectedFilter === "신입";
  const rolesParam = useMemo(() => {
    if (!selectedFilter) return null;
    if (selectedFilter === "신입") return null;
    // 서버 roles 필터는 role 문자열과 동일 비교
    return selectedFilter;
  }, [selectedFilter]);

  const segRoleValue: RoleSegValue = selectedFilter ?? "";
  const segUnderValue: UnderSegValue = attendanceUnder ?? "";

  // =========================
  // ✅ runSearch (name/filter/under 기반)
  // =========================
  const runSearch = useCallback(async () => {
    const q = name.trim();
    const hasName = q.length > 0;
    const hasRoleOrNewbie = selectedFilter !== null;
    const hasUnder = attendanceUnder !== null;

    // 아무것도 없으면 idle
    if (!hasName && !hasRoleOrNewbie && !hasUnder) {
      setState("idle");
      setList([]);
      setErrorMessage(undefined);
      return;
    }

    setState("loading");
    setList([]);
    setErrorMessage(undefined);

    try {
      const params = new URLSearchParams();
      if (hasName) params.set("name", q);
      if (rolesParam) params.set("roles", rolesParam);
      if (isNewbie) params.set("newbie", "1");
      if (attendanceUnder) params.set("attendance_under", attendanceUnder);

      const res = await fetch(`/api/members/lookup?${params.toString()}`);
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message ?? "조회 실패");
      }

      const members = (data.members ?? []) as PickMember[];
      setList(members);
      setState(members.length ? "results" : "empty");
    } catch (e) {
      setState("error");
      setErrorMessage(e instanceof Error ? e.message : "조회 오류");
    }
  }, [name, selectedFilter, attendanceUnder, rolesParam, isNewbie]);

  // =========================
  // ✅ 실시간 조회 (디바운스)
  // =========================
  useEffect(() => {
    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = window.setTimeout(() => {
      runSearch();
    }, 280);

    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, [name, selectedFilter, attendanceUnder, runSearch]);

  // =========================
  // ✅ Suggestions (Name prefix)
  // =========================
  useEffect(() => {
    const q = name.trim();

    if (!q) {
      setSuggestions([]);
      return;
    }

    if (suggestDebounceRef.current) {
      window.clearTimeout(suggestDebounceRef.current);
    }

    suggestDebounceRef.current = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set("prefix", q);

        const res = await fetch(`/api/members/suggest?${params.toString()}`);
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.ok) throw new Error();

        const list = (data.suggestions ?? []) as string[];
        setSuggestions(list);
      } catch {
        setSuggestions([]);
      }
    }, 250);

    return () => {
      if (suggestDebounceRef.current) {
        window.clearTimeout(suggestDebounceRef.current);
      }
    };
  }, [name]);

  // =========================
  // ✅ selection helpers
  // =========================
  const clearSelected = () => onChangeSelectedMembers([]);

  const removeSelected = (id: string) =>
    onChangeSelectedMembers(selectedMembers.filter((m) => m.member_id !== id));

  const toggleSelected = (m: PickMember) => {
    const exists = selectedIdSet.has(m.member_id);

    // PROFILE_EDIT: 단일 + "재탭 시 해제" 허용(전자로)
    if (!canMulti) {
      if (exists) {
        onChangeSelectedMembers([]);
      } else {
        onChangeSelectedMembers([m]);
      }
      return;
    }

    // ROLE_STATUS: 멀티 토글
    if (exists) {
      onChangeSelectedMembers(selectedMembers.filter((x) => x.member_id !== m.member_id));
    } else {
      onChangeSelectedMembers([...selectedMembers, m]);
    }
  };

  const selectAllFromList = () => {
    if (!canMulti) return;
    const map = new Map<string, PickMember>();
    selectedMembers.forEach((m) => map.set(m.member_id, m));
    list.forEach((m) => map.set(m.member_id, m));
    onChangeSelectedMembers(Array.from(map.values()));
  };

  const unselectAllFromList = () => {
    if (!canMulti) return;
    const removeSet = new Set(list.map((m) => m.member_id));
    onChangeSelectedMembers(selectedMembers.filter((m) => !removeSet.has(m.member_id)));
  };

  const hint = useMemo(() => {
    const q = name.trim();
    if (!q && !selectedFilter && !attendanceUnder) return "이름을 입력하거나 필터를 선택해 주세요.";
    if (q && (selectedFilter || attendanceUnder))
      return "이름 검색 결과에 선택한 조건이 적용됩니다.";
    if (q) return "이름 입력에 따라 회원 목록이 실시간으로 표시됩니다.";
    if (attendanceUnder) return "출석 미달자 조건에 해당하는 회원 목록을 표시합니다.";
    if (selectedFilter === "신입") return "신입(탈퇴 제외 · 최근 0~5개월) 회원 목록을 표시합니다.";
    return "선택한 조건에 해당하는 회원 목록을 표시합니다.";
  }, [name, selectedFilter, attendanceUnder]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-zinc-900">대상 회원 선택</div>
          <div className="mt-1 text-xs text-zinc-500">
            {canMulti ? "여러 명 선택 가능" : "1명만 선택 가능"}
          </div>
        </div>

        {selectedMembers.length > 0 && (
          <button
            type="button"
            onClick={clearSelected}
            className="text-xs text-zinc-500 underline"
          >
            전체 해제
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mt-4 space-y-2">
        <AutocompleteInput
          value={name}
          onChange={setName}
          options={suggestions}
          placeholder="이름으로 검색"
          noResultsText="검색 결과가 없습니다."
        />

        <div className="text-xs text-zinc-500">
          입력하면 실시간으로 조회됩니다. (후보 선택도 가능)
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 space-y-2">
        <Segmented<RoleSegValue>
          scroll
          mode="single"
          value={segRoleValue}
          options={FILTER_OPTIONS as unknown as { label: string; value: RoleSegValue }[]}
          onChange={(v) => {
            const next = v === "" ? null : (v as FilterValue);

            // ✅ 출석미달(quarter/half)은 role/newbie와 성격 다르니, 같이 쓰는 건 허용하되
            // UX상 섞어 쓰지 않게 하고 싶으면 여기서 attendanceUnder를 null로 리셋하면 됨.
            // 지금은 "둘 다 가능"으로 유지.
            setSelectedFilter((prev) => (prev === next ? null : next));
          }}
        />

        <div className="pt-1">
          <div className="mb-2 text-xs font-semibold text-zinc-700">
            추가 필터 (출석 미달)
          </div>
          <Segmented<UnderSegValue>
            scroll
            mode="single"
            value={segUnderValue}
            options={UNDER_OPTIONS as unknown as { label: string; value: UnderSegValue }[]}
            onChange={(v) => {
              const next = v === "" ? null : (v as AttendanceUnder);
              setAttendanceUnder((prev) => (prev === next ? null : next));
            }}
          />
        </div>

        <div className="text-xs text-zinc-500">{hint}</div>
      </div>
      
      {/* 구분선 */}
      <div className="my-4 border-t border-zinc-200" />


      {/* Selected chips */}
      <div className="mt-3 max-h-[96px] overflow-auto">
        {selectedMembers.length === 0 ? (
          <div className="text-sm text-zinc-500">선택된 회원 없음</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedMembers.map((m) => (
              <div
                key={m.member_id}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-800"
              >
                <span className="max-w-[140px] truncate">{m.name}</span>
                <span className="text-xs text-zinc-500">({m.role})</span>
                <button
                  type="button"
                  onClick={() => removeSelected(m.member_id)}
                  className="text-xs text-zinc-500"
                  aria-label="선택 해제"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* 구분선 */}
      <div className="my-4 border-t border-zinc-200" />
      
      {/* Results */}
      <div className="mt-4">
        {state === "loading" && (
          <div className="py-3 text-sm text-zinc-500">조회 중…</div>
        )}

        {state === "error" && (
          <div className="py-3 text-sm text-red-600">
            {errorMessage || "조회 오류"}
          </div>
        )}

        {state === "idle" && (
          <div className="py-3 text-sm text-zinc-500">조건을 입력/선택해 주세요.</div>
        )}

        {state === "empty" && (
          <div className="py-3 text-sm text-zinc-500">결과 없음</div>
        )}

        {state === "results" && (
          <>
            {canMulti && list.length > 0 && (
              <div className="mb-2 flex gap-3 text-xs text-zinc-600">
                <button type="button" onClick={selectAllFromList} className="underline">
                  전체선택
                </button>
                <button type="button" onClick={unselectAllFromList} className="underline">
                  전체해제(목록)
                </button>
              </div>
            )}

            <div className="max-h-[300px] overflow-auto rounded-xl border border-zinc-200 bg-white">
              {list.map((m) => {
                const selected = selectedIdSet.has(m.member_id);
                return (
                  <button
                    key={m.member_id}
                    type="button"
                    onClick={() => toggleSelected(m)}
                    className={cx(
                      "w-full border-b border-zinc-100 px-4 py-3 text-left last:border-b-0",
                      "transition hover:bg-zinc-50",
                      selected && "bg-zinc-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-semibold text-zinc-900">
                            {m.name}
                          </div>
                          {selected && (
                            <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-600">
                              선택됨
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                          <span>{m.role}</span>
                          {typeof m.total_score === "number" && (
                            <span>점수 합계: {m.total_score}점</span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 pt-1 text-xs text-zinc-500">
                        {selected ? "✓" : ""}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
