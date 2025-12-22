import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh flex items-center justify-center p-6" />}>
      <LoginClient />
    </Suspense>
  );
}
