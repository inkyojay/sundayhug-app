# 🔐 썬데이허그 회원 인증 시스템

## 1. 인증 방식: Supabase Auth

기존 `warranty_members` 테이블 대신 **Supabase Auth**를 사용합니다.

```
사용자 → Supabase Auth (auth.users 테이블) → user_id로 모든 데이터 연결
```

### 장점
- 이메일/비밀번호 인증 기본 제공
- 소셜 로그인 (카카오, 구글 등) 쉽게 연동
- 세션 관리 자동화
- 보안 강화 (JWT 토큰 기반)

---

## 2. 회원가입 플로우

```
1. 고객이 이메일/비밀번호 입력
2. Supabase Auth가 auth.users에 계정 생성
3. user_id (UUID) 자동 발급
4. 이 user_id로 다른 테이블들과 연결
```

### 코드 예시

```typescript
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "password123",
});

// data.user.id = 자동 생성된 UUID
```

---

## 3. 로그인 플로우

### 이메일/비밀번호 로그인

```
1. 이메일/비밀번호 입력
2. Supabase Auth가 세션 발급
3. 세션에 user_id 포함
4. 로그인 상태 유지
```

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "password123",
});
```

### 카카오 소셜 로그인

```
1. 카카오 인증
2. Supabase Auth가 자동으로 auth.users에 계정 생성/연결
3. 동일한 user_id 발급
```

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: "kakao",
  options: {
    redirectTo: `${window.location.origin}/customer/auth/callback`,
  },
});
```

---

## 4. 데이터 연결 구조

```
auth.users (Supabase Auth)
    └── user_id (UUID)
           │
           ├── warranties (보증서)
           │      └── user_id = auth.users.id
           │
           ├── as_requests (A/S 신청)
           │      └── user_id = auth.users.id
           │
           ├── sleep_analyses (수면 분석)
           │      └── user_id = auth.users.id
           │
           ├── baby_profiles (아기 프로필)
           │      └── user_id = auth.users.id
           │
           └── chat_sessions (AI 상담)
                  └── user_id = auth.users.id
```

### ERD 다이어그램

```
┌─────────────────────┐
│    auth.users       │
│  (Supabase Auth)    │
├─────────────────────┤
│ id (UUID) ──────────┼──────────────────────────────────────┐
│ email               │                                      │
│ created_at          │                                      │
└─────────────────────┘                                      │
                                                             │
    ┌────────────────────────────────────────────────────────┤
    │                    │                    │              │
    ▼                    ▼                    ▼              ▼
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│warranties│      │as_requests│     │sleep_    │      │baby_     │
│          │      │          │      │analyses  │      │profiles  │
├──────────┤      ├──────────┤      ├──────────┤      ├──────────┤
│user_id   │      │user_id   │      │user_id   │      │user_id   │
│...       │      │...       │      │...       │      │...       │
└──────────┘      └──────────┘      └──────────┘      └──────────┘
```

---

## 5. 세션 확인 방법

### 로그인한 사용자 정보 가져오기

```typescript
const { data: { user } } = await supabase.auth.getUser();

// user 객체 구조
{
  id: "550e8400-e29b-41d4-a716-446655440000",  // UUID
  email: "user@example.com",
  created_at: "2024-01-01T00:00:00Z",
  // ...
}
```

### user_id로 데이터 조회

```typescript
const userId = user?.id;

// 이 userId로 해당 사용자의 데이터만 조회
const { data } = await supabase
  .from("warranties")
  .select("*")
  .eq("user_id", userId);
```

### 로그아웃

```typescript
await supabase.auth.signOut();
```

---

## 6. 보안: Row Level Security (RLS)

각 테이블에 RLS 정책이 설정되어 있어서, 로그인한 사용자는 **자기 데이터만** 볼 수 있습니다.

### RLS 정책 예시

```sql
-- warranties 테이블 RLS
CREATE POLICY "Users can view their own warranties"
ON warranties FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own warranties"
ON warranties FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### 보안 특징

| 기능 | 설명 |
|------|------|
| **데이터 격리** | 사용자는 자신의 데이터만 접근 가능 |
| **JWT 토큰** | 모든 요청에 암호화된 토큰 포함 |
| **세션 만료** | 일정 시간 후 자동 로그아웃 |
| **비밀번호 해싱** | bcrypt로 안전하게 저장 |

---

## 7. 환경 설정

### 필요한 환경변수 (.env)

```env
# Supabase 연결 정보
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# 사이트 URL (OAuth 콜백용)
SITE_URL=http://localhost:3000  # 로컬
# SITE_URL=https://app.sundayhug.com  # 프로덕션
```

### Supabase 대시보드 설정

1. **Authentication > Providers > Kakao** 활성화
2. **Authentication > URL Configuration**에서 Redirect URLs 설정:
   - `http://localhost:3000/**` (로컬 개발용)
   - `https://app.sundayhug.com/**` (프로덕션용)

---

## 8. 주요 파일 위치

| 파일 | 설명 |
|------|------|
| `app/features/customer/screens/login.tsx` | 고객 로그인 페이지 |
| `app/features/customer/screens/register.tsx` | 고객 회원가입 페이지 |
| `app/features/customer/screens/auth/callback.tsx` | OAuth 콜백 처리 |
| `app/core/lib/supa-client.ts` | Supabase 클라이언트 설정 |
| `app/core/layouts/customer.layout.tsx` | 고객 레이아웃 (세션 체크) |

---

## 9. 문제 해결

### 로그인이 안 될 때

1. `.env` 파일에 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 확인
2. Supabase 대시보드에서 해당 이메일 계정 존재 여부 확인
3. 브라우저 개발자 도구 > Network 탭에서 에러 확인

### 소셜 로그인이 안 될 때

1. Supabase > Authentication > Providers에서 해당 Provider 활성화 확인
2. Redirect URLs에 현재 도메인 추가 확인
3. 카카오 개발자 콘솔에서 앱 설정 확인

### 세션이 유지되지 않을 때

1. 쿠키 차단 여부 확인
2. `SITE_URL` 환경변수 확인
3. HTTPS 사용 여부 확인 (프로덕션)

---

## 10. 참고 링크

- [Supabase Auth 공식 문서](https://supabase.com/docs/guides/auth)
- [Supabase RLS 가이드](https://supabase.com/docs/guides/auth/row-level-security)
- [카카오 로그인 연동](https://supabase.com/docs/guides/auth/social-login/auth-kakao)



