"use client";

export type Role = "운영진" | "정회원" | "준회원" | "OB" | "휴면" | "탈퇴";
export type MemberFilter = Role | "신입";

export const ROLES: Role[] = ["운영진", "정회원", "준회원", "OB", "휴면", "탈퇴"];
export const FILTERS: MemberFilter[] = ["신입", ...ROLES];

function chipBase(selected: boolean) {
  return [
    "px-3 py-1.5 rounded-full text-sm border transition",
    selected
      ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100"
      : "bg-transparent text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-900/30",
  ].join(" ");
}

export function MemberRoleFilterChips(props: {
  selectedFilters: MemberFilter[];
  onChangeSelectedFilters: (next: MemberFilter[]) => void;
  onClickAll: () => void;
  onClickReset: () => void;
}) {
  const { selectedFilters, onChangeSelectedFilters, onClickAll, onClickReset } = props;

  const isSelected = (f: MemberFilter) => selectedFilters.includes(f);

  const toggle = (f: MemberFilter) => {
    const next = isSelected(f)
      ? selectedFilters.filter((x) => x !== f)
      : [...selectedFilters, f];
    onChangeSelectedFilters(next);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-2 min-w-max pr-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={chipBase(isSelected(f))}
              onClick={() => toggle(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="px-3 py-1.5 rounded-full text-sm border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900/30"
        onClick={onClickAll}
      >
        전체
      </button>

      <button
        type="button"
        className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100"
        onClick={onClickReset}
        aria-label="초기화"
        title="초기화"
      >
        초기화
      </button>
    </div>
  );
}
