# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # 개발 서버 실행 (localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 실행
```

테스트 프레임워크 없음. UI 동작은 개발 서버에서 직접 확인.

---

## 프로젝트 개요

크림슨블루 클라이밍 크루의 출석 관리 웹앱 (PWA). **DB 없음 — Google Sheets가 유일한 데이터 저장소**.

- **스택**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Radix UI (Dialog/Select), Sonner (toast), `googleapis`, `bcryptjs`
- **배포 대상**: 모바일 우선 PWA. iOS 홈화면 추가 지원.

---

## 인증 구조 (두 가지 시스템)

### 1. 운영진 인증 (관리자)
- `/login`에서 비밀번호 입력 → `POST /api/auth/login`
- 비밀번호는 bcrypt 해시로 **Google Sheets `Settings` 시트**에 저장 (`admin_password_hash` 키)
- `ADMIN_PASSWORD` 환경변수는 최초 1회 부트스트랩용 (시트에 해시가 없을 때만 사용)
- 인증 성공 시 HMAC-SHA256 세션 토큰을 `cb_session` HttpOnly 쿠키에 저장 (7일 TTL)
- **미들웨어** (`src/middleware.ts`)가 `/login`, `/my/**`, 정적 파일 외 모든 경로를 차단

### 2. 크루원 자기 조회 (비로그인)
- `/my` 페이지에서 이름 + 휴대폰 뒤 4자리 입력 → `POST /api/my/auth`
- `AdminConfig` 시트의 `my_attendance_enabled` 키로 기능 ON/OFF 제어
- 인증 성공 시 10분짜리 JWT-like 토큰을 **`sessionStorage`** 에 저장 → `/my/view`로 이동
- 토큰 검증은 `HMAC-SHA256`, 시크릿은 `MY_AUTH_SECRET`

---

## Google Sheets 구조

모든 서버 데이터 접근은 `src/lib/server/googleSheets.ts`를 경유한다.

| 시트 이름 | 주요 컬럼 | 용도 |
|---|---|---|
| `Members` | member_id, name, role, is_active, school, gender, birth_year, phone_number, region, level, join_date, last_updated_at, comment | 회원 마스터 |
| `AttendanceHistory` | attendance_id, session_id, date, meeting_type, gym_name, writer, member_id, name, preregistered, attendance_type, **score**, created_at, note | 출석 기록 (행 단위 append) |
| `ScoreRule` | role, preregistered, attendance_type, score | 출석 점수 룩업 테이블 |
| `Settings` | key, value, updated_at | 운영 설정 (admin_password_hash 등) |
| `AdminConfig` | key, value, note | 크루원 조회 기능 ON/OFF 등 |
| `CalendarMemo` | memo_id, date, meeting_type, assignee, gym_name, max_people, updated_at, is_deleted | 캘린더 일정 (소프트 삭제) |
| `MemberInfoHistory` | history_id, changed_at, changed_by, member_id, change_kind, item, before_json, after_json | 회원정보 변경 이력 |
| `GymList` | gym_name, branch_name | 암장 목록 |

**컬럼 순서가 코드와 1:1로 맞아야 한다.** `appendRows`로 신규 행 추가 시 하드코딩된 배열 순서로 삽입하므로, 시트 컬럼 순서 변경 시 관련 서비스 파일도 함께 수정해야 한다.

---

## 환경변수

```
AUTH_SECRET                       # 운영진 세션 토큰 HMAC 시크릿
ADMIN_PASSWORD                    # 최초 부트스트랩용 비밀번호 (운영 중 제거 권장)
MY_AUTH_SECRET                    # 크루원 자기 조회 토큰 HMAC 시크릿
GOOGLE_SERVICE_ACCOUNT_EMAIL      # Google 서비스 계정 이메일
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY # 개행은 \\n으로 이스케이프된 상태로 저장
GOOGLE_SHEETS_ID                  # 스프레드시트 ID
```

---

## 주요 모듈 흐름

```
Page (Client)
  └─ fetch("/api/...")
       └─ Route Handler (src/app/api/**/route.ts)
            └─ Service (src/lib/server/*Service.ts)
                 └─ googleSheets.ts  ──►  Google Sheets API
```

- **`googleSheets.ts`**: `readSheetObjects`, `updateRowByKey`, `upsertRowByCompositeKey`, `appendRows`, `nowKSTString` 등 공통 유틸. **모든 시간은 KST(UTC+9)**로 저장.
- **`attendanceService.ts`**: 출석 등록 시 Members + ScoreRule 시트를 참조해 score를 자동 계산 후 AttendanceHistory에 append.
- **`memberManageService.ts`**: 회원 등급/상태 변경 및 신규 등록. 작성자가 `운영진`인지 시트에서 매번 검증.
- **`settingsStore.ts`**: Settings 시트를 key-value 스토어로 사용. 비밀번호 해시 저장/검증.
- **`calendarMemoService.ts`**: CalendarMemo 시트 CRUD. 삭제는 `is_deleted: "TRUE"` 소프트 삭제.

---

## 페이지 구조

```
/                     홈 (캘린더 + 일정 메모)
/attendance           출석 탭
  /register           출석 등록 폼 (운영진 전용)
  /overview           출석 현황 (세션별/회원별)
/members              회원 목록 (역할 필터)
  /lookup             회원 검색
  /manage             회원정보 관리 (등급변경/개인정보수정/신입등록)
/more                 더보기
/login                운영진 로그인 (공개)
/my                   크루원 자기 조회 로그인 (공개, BottomNav 숨김)
  /view               개인 출석 현황
```

BottomNav는 `/my` 경로에서 자동으로 숨겨진다.

---

## API 응답 규칙

대부분의 API는 `{ ok: true, data: ... }` / `{ ok: false, message: "..." }` 형태를 사용한다.  
`src/lib/useApi.ts`의 `useApi` 훅은 `json?.success`를 확인하는데, 실제 API는 `ok`를 반환하므로 **이 훅은 최신 API에서 동작하지 않는다**. 새 클라이언트 코드는 직접 `fetch`를 쓰는 패턴을 따른다.

---

## 출석 점수 시스템

출석 등록 시 `ScoreRule` 시트에서 `(role, preregistered, attendance_type)` 조합으로 점수를 룩업한다.  
룩업 실패 시 출석 저장 자체가 400 에러로 실패한다. 새 역할/조합 추가 시 ScoreRule 시트에 행을 먼저 추가해야 한다.

크루원 자기 조회의 점수 기준:
- 정회원/운영진: **분기별 3점 이상**
- 준회원: **반기별 4점 이상**

---

## 주의 사항 및 기술 부채

- **성능**: 모든 API가 매 요청마다 시트 전체를 읽음. 페이지네이션 없음. 데이터가 많아질수록 느려짐.
- **동명이인**: `memberByName` 맵은 동명이인 시 마지막 값으로 덮어씀. 현재 정책상 동명이인 없다고 가정.
- **신규 회원 중복 체크**: 이름 기준으로만 중복 방지.
- **`ADMIN_PASSWORD`**: 부트스트랩 후 제거 또는 변경 권장.
- **`useApi` 훅 불일치**: `src/lib/useApi.ts`는 `json.success`를 체크하지만 API는 `json.ok`를 반환함. 현재는 새 코드에서 직접 fetch를 사용하는 방식으로 우회됨.
- **시트 컬럼 순서 하드코딩**: `appendRows` 호출부에서 배열 인덱스로 컬럼을 지정함. 시트 컬럼 순서 변경 시 반드시 코드도 함께 수정해야 함.
