export type CalendarMemoRow = {
  memo_id: string;
  date: string; // YYYY-MM-DD
  meeting_type: string;
  assignee: string;
  gym_name: string;
  max_people: string;
  updated_at: string;
  is_deleted: string; // "TRUE" | "FALSE"
};

export type MonthMemoMap = Record<string, CalendarMemoRow[]>;