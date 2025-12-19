"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MemberListPanel } from "@/components/members/MemberListPanel";
import { MemberProfileSheet } from "@/components/members/MemberProfileSheet";
import {
  MemberRoleFilterChips,
  ROLES,
  type Role,
  type MemberFilter,
} from "@/components/members/MemberRoleFilterChips";
import type { Member } from "@/components/members/MemberCard";

type ViewState = "idle" | "loading" | "empty" | "results" | "error";

export default function MembersLookupPage() {
  const router = useRouter();

  /* =====================
   * Search / Filter State
   * ===================== */
  const [name, setName] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<MemberFilter[]>([]);

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
   * Autocomplete State
   * ===================== */
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);

  /* =====================
   * Filter Parsing
   * ===================== */
  const newbieSelected = useMemo(
    () => selectedFilters.includes("신입"),
    [selectedFilters]
  );

  const selectedRolesOnly = useMemo(
    () => selectedFilters.filter((f) => f !== "신입") as Role[],
    [selectedFilters]
  );

  const rolesParam = useMemo(() => {
    if (selectedRolesOnly.length === 0) return null;
    return selectedRolesOnly.join(",");
  }, [selectedRolesOnly]);

  /* =====================
   * Navigation
   * ===================== */
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  /* =====================
   * Actions
   * ===================== */
  const resetAll = () => {
    setName("");
    setSelectedFilters([]);
    setMembers([]);
    setSuggestions([]);
    setSuggestOpen(false);
    setState("idle");
    setErrorMessage(undefined);
    setSheetOpen(false);
    setActiveMember(null);
  };

  const onClickAll = () => {
    setSelectedFilters([...ROLES]); // role 전체 선택, 신입 제외
  };

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
    const hasRoles = selectedRolesOnly.length > 0;
    const hasNewbie = newbieSelected;

    if (!hasName && !hasRoles && !hasNewbie) {
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
      if (hasNewbie) params.set("newbie", "1");

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
  }, [name, rolesParam, selectedRolesOnly.length, newbieSelected]);

  /* =====================
   * Auto-search on Filter Change
   * ===================== */
  useEffect(() => {
    const q = name.trim();
    const hasName = q.length > 0;
    const hasFilters = selectedFilters.length > 0;

    if (!hasName && !hasFilters) return;
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilters]);

  /* =====================
   * Autocomplete (Name)
   * ===================== */
  useEffect(() => {
    const q = name.trim();

    if (!q) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set("prefix", q);

        const res = await fetch(`/api/members/suggest?${params.toString()}`);
        const data = await res.json();

        if (!res.ok || !data?.ok) throw new Error();

        const list = (data.suggestions ?? []) as string[];
        setSuggestions(list);
        setSuggestOpen(list.length > 0);
      } catch {
        setSuggestions([]);
        setSuggestOpen(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [name]);

  const pickSuggestion = (s: string) => {
    setName(s);
    setSuggestOpen(false);
    setSuggestions([]);
    runSearch();
  };

  /* =====================
   * Render
   * ===================== */
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-[rgb(var(--bg))] px-4 pb-10 text-[rgb(var(--fg))]">

      {/* Search / Filter */}
      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="relative flex items-center gap-2">
          <div className="flex-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => suggestions.length && setSuggestOpen(true)}
              onBlur={() => setTimeout(() => setSuggestOpen(false), 120)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
              }}
              placeholder="이름으로 검색"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-700"
            />

            {/* Autocomplete */}
            {suggestOpen && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[44px] z-20 rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-900/30"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickSuggestion(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={runSearch}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            검색
          </button>
        </div>

        {/* Filters */}
        <div className="mt-3">
          <MemberRoleFilterChips
            selectedFilters={selectedFilters}
            onChangeSelectedFilters={setSelectedFilters}
            onClickAll={onClickAll}
            onClickReset={resetAll}
          />
        </div>

        {/* Hint */}
        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {name.trim()
            ? "이름 검색 결과에 필터가 적용됩니다."
            : selectedFilters.length
            ? newbieSelected && selectedFilters.length === 1
              ? "신입 회원 목록을 표시합니다."
              : "선택한 조건에 해당하는 회원 목록을 표시합니다."
            : "이름을 검색하거나 필터를 선택해 주세요."}
        </div>
      </div>

      {/* Results */}
      <MemberListPanel
        state={state}
        members={members}
        onClickMember={openMember}
        errorMessage={errorMessage}
        onRetry={runSearch}
      />

      {/* Bottom Sheet */}
      <MemberProfileSheet
        open={sheetOpen}
        member={activeMember}
        onClose={closeSheet}
      />
    </div>
  );
}
