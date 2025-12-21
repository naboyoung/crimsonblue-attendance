import type { BadgeVariant } from "@/components/ui/Badge";

export type MeetingType = "정기모임" | "대관행사" | "기타";
export type RoleType = "운영진" | "정회원" | "준회원" | "휴면" | "탈퇴";

export function meetingTypeToVariant(type?: string): BadgeVariant {
  const t = (type ?? "").trim();
  switch (t as MeetingType) {
    case "정기모임":
      return "meeting_regular";
    case "대관행사":
      return "meeting_rental";
    case "기타":
      return "meeting_other";
    default:
      return "muted";
  }
}

export function roleToVariant(role?: string): BadgeVariant {
  const r = (role ?? "").trim();
  switch (r as RoleType) {
    case "운영진":
      return "role_admin";
    case "정회원":
      return "role_regular";
    case "준회원":
      return "role_associate";
    case "휴면":
      return "role_dormant";
    case "탈퇴":
      return "role_withdrawn";
    default:
      return "muted";
  }
}
