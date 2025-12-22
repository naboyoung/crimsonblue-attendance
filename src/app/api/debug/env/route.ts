import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      vercelEnv: process.env.VERCEL_ENV ?? null,
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      hasAuth: !!process.env.AUTH_SECRET,
      hasMy: !!process.env.MY_AUTH_SECRET,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
