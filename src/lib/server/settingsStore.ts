// src/lib/server/settingsStore.ts
import bcrypt from "bcryptjs";
import { readSheetObjects, updateRowByKey, appendRows } from "@/lib/server/googleSheets";

const SETTINGS_SHEET = "Settings";
const KEY_COL = "key";

/**
 * readSheetObjects가 제네릭을 안 받는 타입이라 <T> 없이 호출하고,
 * 결과는 실제 런타임이 "객체 배열"이라고 가정하고 캐스팅해서 사용.
 *
 * 만약 readSheetObjects가 실제로 객체가 아니라면(값 배열이라면),
 * 아래 getSetting 구현을 값 배열 기반으로 바꿔야 함(그 경우 에러/증상 알려줘).
 */
type SettingsRow = {
  key?: string;
  value?: string;
  updated_at?: string;
};

async function readSettingsRows(): Promise<SettingsRow[]> {
  const rows = (await readSheetObjects(SETTINGS_SHEET)) as unknown as SettingsRow[];
  return Array.isArray(rows) ? rows : [];
}

export async function getSetting(key: string): Promise<string | null> {
  const rows = await readSettingsRows();
  const found = rows.find((r) => String(r.key ?? "").trim() === key);
  if (!found) return null;
  const v = String(found.value ?? "").trim();
  return v.length ? v : "";
}

export async function upsertSetting(key: string, value: string) {
  const rows = await readSettingsRows();
  const found = rows.find((r) => String(r.key ?? "").trim() === key);

  const now = new Date().toISOString();

  if (found) {
    // updateRowByKey는 너희가 이미 쓰던 방식 그대로: patch object
    await updateRowByKey(SETTINGS_SHEET, KEY_COL, key, {
      value,
      updated_at: now,
    });
    return;
  }

  /**
   * appendRows는 (string|number|null)[][] 타입을 기대하는 걸로 보이므로
   * 객체가 아니라 "값 배열"로 한 행을 추가한다.
   *
   * Settings 시트 컬럼 순서가 아래와 같아야 함:
   * A: key, B: value, C: updated_at
   */
  await appendRows(SETTINGS_SHEET, [[key, value, now]]);
}

export async function getAdminPasswordHash() {
  return await getSetting("admin_password_hash");
}

export async function verifyAdminPassword(plain: string) {
  const hash = await getAdminPasswordHash();
  if (!hash) return { ok: false as const, reason: "not_initialized" as const };
  const ok = await bcrypt.compare(plain, hash);
  return { ok: ok as boolean };
}

export async function setAdminPassword(plain: string) {
  const hash = await bcrypt.hash(plain, 10);
  await upsertSetting("admin_password_hash", hash);
}
