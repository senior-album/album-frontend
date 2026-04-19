# Senior Album Frontend - 설치 및 실행 가이드

## 사전 요구사항

- Node.js 18+ (권장) 또는 16+
- npm 또는 yarn
- 백엔드 API 서버 실행 중 (`http://localhost:8000`)

## 설치 및 실행

### 1. 의존성 설치

```bash
cd src/frontend
npm install
```

### 2. 환경 변수 (선택)

프로젝트 루트에 `.env.local` 파일 생성:

```
VITE_API_URL=http://localhost:8000
```

설정하지 않으면 기본값 `http://localhost:8000` 사용.

### 3. 개발 서버 실행

```bash
npm run dev
# http://localhost:5173 접속
```

### 4. 프로덕션 빌드

```bash
npm run build        # dist/ 폴더에 최적화된 정적 파일 생성
npm run preview      # 빌드 결과 로컬 미리보기
```

## 사용 가능한 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 (HMR 지원, 포트 5173) |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 로컬 프리뷰 |
| `npm run lint` | ESLint 검사 |
| `npx tsc --noEmit` | TypeScript 타입 체크 |

## 프로젝트 구조

```
src/
├── App.tsx                         # 전체 라우터 설정
├── main.tsx                        # React 진입점
├── index.css                       # Tailwind + 전역 스타일
├── types/index.ts                  # TypeScript 타입
├── utils/
│   ├── api.ts                      # Axios 클라이언트 (JWT 자동 갱신)
│   └── mockData.ts                 # 샘플 데이터
├── context/AuthContext.tsx          # 인증 상태 Context
├── pages/
│   ├── LoginPage.tsx               # 이메일/비밀번호 + 카카오 로그인
│   ├── RegisterPage.tsx            # 3종 회원가입
│   ├── KakaoCallbackPage.tsx       # 카카오 OAuth 콜백
│   ├── SelectRolePage.tsx          # 카카오 가입 후 역할 선택
│   ├── DashboardPage.tsx           # 직원 대시보드
│   ├── ResidentsPage.tsx           # 입소자 관리
│   ├── PhotosPage.tsx              # 사진 관리
│   ├── GuardianGalleryPage.tsx     # 보호자 갤러리
│   ├── GuardianMyPage.tsx          # 보호자 마이페이지
│   ├── GuardianManagePage.tsx      # 보호자 승인 관리 (직원)
│   ├── SharedPhotoPage.tsx         # 공유 사진 뷰
│   └── ProtectedRoute.tsx          # 역할 기반 접근 제어
└── components/
    ├── Layout.tsx                  # 사이드바 + 헤더
    ├── StatsCard.tsx               # 통계 카드
    ├── PhotoGrid.tsx               # 사진 그리드 + 모달
    └── PhotoUploader.tsx           # 드래그앤드롭 업로더
```

## 라우팅

| 경로 | 페이지 | 접근 |
|------|--------|------|
| `/login` | 로그인 | 공개 |
| `/register` | 회원가입 | 공개 |
| `/auth/kakao/callback` | 카카오 콜백 | 공개 |
| `/select-role` | 역할 선택 | 공개 |
| `/shared/:token` | 공유 사진 | 공개 |
| `/dashboard` | 대시보드 | Staff |
| `/residents` | 입소자 관리 | Staff |
| `/photos` | 사진 관리 | Staff |
| `/guardian-manage` | 보호자 관리 | Staff |
| `/guardian` | 보호자 갤러리 | Guardian |
| `/guardian/mypage` | 보호자 마이페이지 | Guardian |

## 인증 흐름

### 이메일/비밀번호 로그인
1. `/login`에서 이메일 + 비밀번호 입력
2. `POST /auth/login` → `accessToken` + `user` + `facility` 수신
3. `localStorage`에 저장 후 역할에 따라 대시보드 또는 갤러리로 이동

### 카카오 로그인
1. `/login`에서 카카오 버튼 클릭
2. 카카오 인증 페이지로 이동
3. 인증 후 `/auth/kakao/callback`으로 리다이렉트
4. 신규 가입자는 `/select-role`에서 역할 선택

### 토큰 갱신
- API 호출 시 401 응답 → 자동으로 `POST /auth/refresh` 시도
- 성공하면 새 토큰으로 원래 요청 재시도
- 실패하면 `localStorage` 클리어 후 `/login`으로 이동

## 백엔드 연동

API 클라이언트는 `src/utils/api.ts`의 `apiClient` 인스턴스를 사용합니다:

```typescript
import { apiClient } from '@/utils/api';

await apiClient.login(email, password);
await apiClient.getFacilityPhotos(facilityId);
await apiClient.uploadPhoto(facilityId, formData);
await apiClient.getGuardianPhotos();
```

## 문제 해결

### 포트 충돌
```bash
npm run dev -- --port 3000
```

### 의존성 문제
```bash
rm -rf node_modules package-lock.json
npm install
```

### 백엔드 연결 실패
- 백엔드 서버가 `http://localhost:8000`에서 실행 중인지 확인
- CORS 설정에 `http://localhost:5173`이 포함되어 있는지 확인

## 라이선스

MIT License
