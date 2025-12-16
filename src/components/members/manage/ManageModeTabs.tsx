"use client";

export type ManageMode = "ROLE_STATUS" | "PROFILE_EDIT";

export function ManageModeTabs(props: {
  mode: ManageMode;
  onChange: (next: ManageMode) => void;
}) {
  const { mode, onChange } = props;

  const tabBase =
    "flex-1 rounded-xl px-3 py-2 text-sm font-semibold border transition";
  const active =
    "bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800";
  const inactive =
    "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-2">
      <div className="flex gap-2">
        <button
          type="button"
          className={`${tabBase} ${mode === "ROLE_STATUS" ? active : inactive}`}
          onClick={() => onChange("ROLE_STATUS")}
        >
          등급/상태 변경
        </button>
        <button
          type="button"
          className={`${tabBase} ${mode === "PROFILE_EDIT" ? active : inactive}`}
          onClick={() => onChange("PROFILE_EDIT")}
        >
          개인정보 수정
        </button>
      </div>
    </div>
  );
}
