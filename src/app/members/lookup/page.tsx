"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MemberListPanel } from "@/components/members/MemberListPanel";
import { MemberProfileSheet } from "@/components/members/MemberProfileSheet";
import type { Member } from "@/components/members/MemberCard";

import AutocompleteInput from "@/components/ui/AutocompleteInput";
import Segmented from "@/components/ui/Segmented";

type ViewState = "idle" | "loading" | "empty" | "results" | "error";

type FilterValue =
  | "운영진"
  | "정회원"
  | "준회원"
  | "OB"
  | "신입"
  | "휴면"
  | "탈퇴";

type SegValue = "" | FilterValue;

export default function MembersLookupPage() {
  const router = useRouter();

  /* =====================
   * Search / Filter State
   * ===================== */
  const [name, setName] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterValue | null>(null);

  /* =====================
   * Result State
   * ===================== */
  const [state, setState] = useState<ViewState>("idle");
  const [members, setMembers] = useState<Member[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();

  /* =====================
   * Bottom Sheet State
   * ===================== */
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeMember, setActiveMember] = useState<Member | null>(null);

  /* =====================
   * Autocomplete Suggestions
   * ===================== */
  const [suggestions, setSuggestions] = useState<string[]>([]);

  /* =====================
   * Debounce refs
   * ===================== */
  const searchDebounceRef = useRef<number | null>(null);
  const suggestDebounceRef = useRef<number | null>(null);

  /* =====================
   * Filter parsing
   * ===================== */
  const isNewbie = selectedFilter === "신입";
  const rolesParam = useMemo(() => {
    if (!selectedFilter) return null;
    if (selectedFilter === "신입") return null; // role이 아니라 별도 파라미터
    return selectedFilter; // 단일 role
  }, [selectedFilter]);

  /* =====================
   * Actions
   * ===================== */

  const openMember = (m: Member) => {
    setActiveMember(m);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setActiveMember(null);
  };

  /* =====================
   * Search Logic
   * ===================== */
  const runSearch = useCallback(async () => {
    const q = name.trim();
    const hasName = q.length > 0;
    const hasFilter = selectedFilter !== null;

    // ✅ A안: 아무것도 입력/선택 없으면 idle(안내)
    if (!hasName && !hasFilter) {
      setMembers([]);
      setState("idle");
      setErrorMessage(undefined);
      return;
    }

    setState("loading");
    setErrorMessage(undefined);

    try {
      const params = new URLSearchParams();
      if (hasName) params.set("name", q);
      if (rolesParam) params.set("roles", rolesParam);
      if (isNewbie) params.set("newbie", "1");

      const res = await fetch(`/api/members/lookup?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message ?? "조회 실패");
      }

      const list = (data.members ?? []) as Member[];
      setMembers(list);
      setState(list.length ? "results" : "empty");
    } catch (e) {
      setMembers([]);
      setState("error");
      setErrorMessage(e instanceof Error ? e.message : "Unknown error");
    }
  }, [name, selectedFilter, rolesParam, isNewbie]);

  /* =====================
   * Live search (name/filter change) with debounce
   * ===================== */
  useEffect(() => {
    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);

    // ✅ 타이핑/필터 변경 후 디바운스 검색
    searchDebounceRef.current = window.setTimeout(() => {
      runSearch();
    }, 280);

    return () => {
      if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    };
  }, [name, selectedFilter, runSearch]);

  /* =====================
   * Suggestions (Name prefix)
   * ===================== */
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
        const data = await res.json();

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

  /* =====================
   * Segmented options
   * ===================== */
  const filterOptions = [
    { label: "운영진", value: "운영진" },
    { label: "정회원", value: "정회원" },
    { label: "준회원", value: "준회원" },
    { label: "OB", value: "OB" },
    { label: "신입", value: "신입" },
    { label: "휴면", value: "휴면" },
    { label: "탈퇴", value: "탈퇴" },
  ] as const;

  const onPick = (v: FilterValue) => {
    setSelectedFilter((prev) => (prev === v ? null : v)); // 택1이지만 "해제"는 허용
  };

  /* =====================
   * Hint text
   * ===================== */
  const hint = useMemo(() => {
    const q = name.trim();
    if (!q && !selectedFilter) return "이름을 검색하거나 필터를 선택해 주세요.";
    if (q && selectedFilter) return "이름 검색 결과에 선택한 필터가 적용됩니다.";
    if (q) return "이름 입력에 따라 회원 목록이 실시간으로 표시됩니다.";
    // filter only
    if (selectedFilter === "신입") return "신입 회원 목록을 표시합니다.";
    return "선택한 조건에 해당하는 회원 목록을 표시합니다.";
  }, [name, selectedFilter]);

  const segValue: SegValue = selectedFilter ?? "";

  /* =====================
   * Render
   * ===================== */
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-[rgb(var(--bg))] px-4 pb-10 text-[rgb(var(--fg))]">
      {/* 상단 헤더는 기존 프로젝트 구조에 따라 다른 컴포넌트가 있을 수 있어
         여기서는 페이지 단 파일만 기준으로 유지 (goBack은 필요 시 연결) */}

      {/* ✅ 통합 카드(검색/필터 + 결과) */}
      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
        {/* Section title + description (출석등록 톤에 맞춰 추후 CardSection 컴포넌트로 통일 가능) */}
        <div className="mb-3">
          <div className="text-base font-semibold">회원 조회</div>
          <div className="mt-1 text-xs text-zinc-500">
            이름 검색 또는 필터로 회원 정보를 확인할 수 있어요.
          </div>
        </div>

        {/* Search */}
        <div className="space-y-2">
          <AutocompleteInput
            value={name}
            onChange={setName}
            options={suggestions}
            placeholder="이름으로 검색"
            noResultsText="검색 결과가 없습니다."
          />
        </div>

        {/* Filters */}
        <div className="mt-3 space-y-2">
          <Segmented
            scroll
            mode = "single"
            value={segValue}
            options={filterOptions as unknown as { label: string; value: SegValue}[]}
            onChange={(v) => {
              if (v === "") return;
              setSelectedFilter((prev) => (prev === v ? null : (v as FilterValue)));
            }}       
          />
        </div>

        {/* Hint */}
        <div className="mt-2 text-xs text-zinc-500">{hint}</div>

        {/* Results */}
        <div className="mt-4">
          <MemberListPanel
            state={state}
            members={members}
            onClickMember={openMember}
            errorMessage={errorMessage}
            onRetry={runSearch}
          />
        </div>
      </div>

      {/* Bottom Sheet */}
      <MemberProfileSheet open={sheetOpen} member={activeMember} onClose={closeSheet} />
    </div>
  );
}
