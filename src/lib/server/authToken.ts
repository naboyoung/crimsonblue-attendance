// src/lib/server/authToken.ts
const COOKIE_NAME = "cb_session";
const TOKEN_TTL_DAYS = 7; // ✅ 자동 로그아웃 7일

function base64UrlEncode(bytes: Uint8Array) {
  const b64 = Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeToBytes(s: string) {
  const pad = 4 - (s.length % 4 || 4);
  const b64 = (s + "=".repeat(pad)).replace(/-/g, "+").replace(/_/g, "/");
  return new Uint8Array(Buffer.from(b64, "base64"));
}

async function hmacSha256(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return new Uint8Array(sig);
}

function nowMs() {
  return Date.now();
}

function ttlMs() {
  return TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
}

function randomNonce(len = 16) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export function getCookieName() {
  return COOKIE_NAME;
}

export function getTokenTtlDays() {
  return TOKEN_TTL_DAYS;
}

export async function issueSessionToken(secret: string) {
  const issuedAt = String(nowMs());
  const nonce = randomNonce();
  const payload = `${issuedAt}.${nonce}`;
  const sigBytes = await hmacSha256(secret, payload);
  const sig = base64UrlEncode(sigBytes);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(secret: string, token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { ok: false as const, reason: "format" };

    const issuedAtStr = parts[0]!;
    const nonce = parts[1]!;
    const sig = parts[2]!;

    const issuedAt = Number(issuedAtStr);
    if (!Number.isFinite(issuedAt)) return { ok: false as const, reason: "issuedAt" };

    if (nowMs() - issuedAt > ttlMs()) return { ok: false as const, reason: "expired" };

    const payload = `${issuedAtStr}.${nonce}`;
    const expectedSigBytes = await hmacSha256(secret, payload);
    const givenSigBytes = base64UrlDecodeToBytes(sig);

    if (givenSigBytes.length !== expectedSigBytes.length) {
      return { ok: false as const, reason: "sig_len" };
    }
    for (let i = 0; i < givenSigBytes.length; i++) {
      if (givenSigBytes[i] !== expectedSigBytes[i]) {
        return { ok: false as const, reason: "sig_mismatch" };
      }
    }

    return { ok: true as const, issuedAt };
  } catch {
    return { ok: false as const, reason: "error" };
  }
}
