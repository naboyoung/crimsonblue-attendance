"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full text-left rounded-xl px-4 py-3 text-sm text-red-600 hover:bg-red-50"
    >
      로그아웃
    </button>
  );
}
