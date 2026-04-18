# Senior Album Frontend - 설치 및 실행 가이드

## 프로젝트 구조

```
senior-album/src/frontend/
├── index.html                          # HTML 진입점
├── package.json                        # 의존성 정의
├── README.md                           # 프로젝트 문서
├── SETUP_GUIDE.md                      # 설치 가이드 (현재 파일)
├── tailwind.config.js                  # Tailwind CSS 설정
├── postcss.config.js                   # PostCSS 설정
├── tsconfig.json                       # TypeScript 설정
├── tsconfig.node.json                  # Vite TypeScript 설정
├── vite.config.ts                      # Vite 빌드 설정
├── .gitignore                          # Git 제외 파일
│
└── src/
    ├── main.tsx                        # React 진입점
    ├── App.tsx                         # 라우터 설정
    ├── index.css                       # 전역 스타일
    │
    ├── types/
    │   └── index.ts                    # TypeScript 타입 정의
    │
    ├── utils/
    │   ├── api.ts                      # Axios 인스턴스 및 API 클라이언트
    │   └── mockData.ts                 # 목 데이터 (UI 테스트용)
    │
    ├── context/
    │   └── AuthContext.tsx             # 인증 상태 관리
    │
    ├── pages/
    │   ├── LoginPage.tsx               # 로그인 페이지
    │   ├── DashboardPage.tsx           # 시설 직원 대시보드
    │   ├── ResidentsPage.tsx           # 입소자 관리
    │   ├── PhotosPage.tsx              # 사진 관리 및 업로드
    │   ├── GuardianGalleryPage.tsx     # 보호자용 갤러리
    │   └── ProtectedRoute.tsx          # 라우트 보호 컴포넌트
    │
    └── components/
        ├── Layout.tsx                  # 사이드바 + 헤더 레이아웃
        ├── StatsCard.tsx               # 통계 카드 컴포넌트
        ├── PhotoGrid.tsx               # 사진 그리드 컴포넌트
        └── PhotoUploader.tsx           # 드래그앤드롭 업로더
```

## 사전 요구사항

- Node.js 16.0 이상
- npm 또는 yarn
- 텍스트 에디터 (VS Code 권장)

## 설치 단계

### 1단계: 의존성 설치

```bash
cd D:\claude-workspace\senior-album\src\frontend

# npm 사용
npm install

# 또는 yarn 사용
yarn install
```

### 2단계: 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

## 사용 가능한 명령어

```bash
# 개발 서버 실행 (Hot Module Replacement 활성화)
npm run dev

# 프로덕션 빌드 생성
npm run build

# 빌드된 결과 로컬에서 미리보기
npm run preview

# ESLint 검사 (선택사항)
npm run lint
```

## 환경 설정

프로젝트 루트에 `.env.local` 파일 생성 (선택사항):

```
VITE_API_URL=http://localhost:8000/api
```

코드에서 사용:
```typescript
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
```

## 데모 로그인

로그인 페이지에서 제공하는 데모 버튼으로 즉시 테스트 가능:

- **직원 데모**: 시설 관리자 대시보드 접근
- **보호자 데모**: 보호자 갤러리 페이지 접근

## 주요 기능

### 시설 직원용 (Staff)

1. **로그인** (`/login`)
   - 이메일/비밀번호 인증
   - 역할 선택 (직원/보호자)

2. **대시보드** (`/dashboard`)
   - 통계 카드 (오늘 업로드, 총 입소자, 분류율 등)
   - 최근 업로드 사진 미리보기
   - 사진 업로드 버튼

3. **입소자 관리** (`/residents`)
   - 입소자 목록 조회
   - 입소자 등록/수정/삭제
   - 기준 사진 등록 (얼굴 인식용)

4. **사진 관리** (`/photos`)
   - 다중 사진 드래그앤드롭 업로드
   - 분류 상태별 필터
   - 입소자별 필터
   - 날짜별 그룹핑 표시

### 보호자용 (Guardian)

1. **갤러리** (`/guardian`)
   - 자신의 부모님 사진만 표시
   - 따뜻한 감정적 UI (파스텔톤)
   - 즐겨찾기 하트
   - 사진 공유 및 다운로드 기능

## 라우팅 구조

```
/                 → /login (자동 리다이렉트)
/login            → 로그인 페이지
/dashboard        → 시설 직원 대시보드 (staff만)
/residents        → 입소자 관리 (staff만)
/photos           → 사진 관리 (staff만)
/guardian         → 보호자 갤러리 (guardian만)
```

## API 연동

Axios 클라이언트 사용:

```typescript
import { apiClient } from '@/utils/api';

// 로그인
await apiClient.login(email, password);

// 시설 정보 조회
await apiClient.getFacility(facilityId);

// 입소자 목록
await apiClient.getFacilityResidents(facilityId);

// 사진 업로드
const formData = new FormData();
formData.append('file', file);
await apiClient.uploadPhoto(facilityId, formData);
```

### 인증 토큰 관리

- 로그인 시 토큰 자동 저장 (localStorage)
- 모든 요청에 자동으로 Authorization 헤더 추가
- 401 응답 시 자동으로 로그인 페이지로 리다이렉트

## 스타일 및 디자인

### 색상 팔레트

- **주요 (Primary)**: #1B4F72 (네이비)
- **보조 (Secondary)**: #2E75B6 (밝은 블루)
- **보호자 크림**: #F8F0E3
- **보호자 브라운**: #D4A373

### UI 특징

- Tailwind CSS 유틸리티 클래스 사용
- 라운드 카드 (border-radius)
- 부드러운 그림자 효과
- 호버 상태 및 트랜지션 애니메이션
- 반응형 그리드 레이아웃

## 목 데이터

`src/utils/mockData.ts`에 샘플 데이터 포함:

- `mockFacility` - 시설 정보
- `mockResidents` - 입소자 목록
- `mockPhotos` - 사진 데이터
- `mockStatsData` - 통계 데이터
- `mockGuardian` - 보호자 정보
- `mockGuardianPhotos` - 보호자용 사진

## 컴포넌트 사용 예제

### StatsCard 사용

```tsx
<StatsCard
  icon={Image}
  label="오늘 업로드"
  value={5}
  subtext="총 245개 사진"
  color="blue"
/>
```

### PhotoGrid 사용

```tsx
<PhotoGrid
  photos={photos}
  showClassification={true}
  groupByDate={true}
  onPhotoClick={handlePhotoClick}
/>
```

### PhotoUploader 사용

```tsx
<PhotoUploader
  onUpload={async (files) => {
    console.log('Uploading:', files);
  }}
  isLoading={false}
/>
```

## 개발 팁

1. **DevTools 사용**
   - React Developer Tools 확장프로그램 설치
   - 컴포넌트 상태 및 props 검사 가능

2. **Mock 데이터 수정**
   - `src/utils/mockData.ts`에서 목 데이터 수정
   - 자동 리로드로 즉시 반영

3. **라우팅 테스트**
   - 데모 로그인으로 다양한 역할 테스트
   - URL 직접 이동 시 ProtectedRoute로 보호됨

4. **스타일 개발**
   - Tailwind CSS 클래스 직접 사용
   - VS Code Tailwind CSS IntelliSense 확장 권장

## 백엔드 API 연동

현재 목 데이터로 작동하며, 실제 API 연동을 위해:

1. 백엔드 서버 URL 설정 (vite.config.ts의 proxy 설정)
2. `src/utils/api.ts`의 API_BASE_URL 확인
3. 각 페이지에서 apiClient 메서드 호출

예:
```typescript
// DashboardPage에서 실제 API 사용
const { data } = await apiClient.getFacilityPhotos(facilityId);
```

## 빌드 및 배포

### 프로덕션 빌드

```bash
npm run build
```

생성 파일:
- `dist/` 디렉토리에 최적화된 정적 파일

### 배포

```bash
# 빌드된 dist 폴더를 웹 서버에 업로드
npm run build
# dist 폴더의 내용을 배포 대상에 복사
```

## 문제 해결

### 포트 이미 사용 중

```bash
# 다른 포트 사용
npm run dev -- --port 3000
```

### 의존성 문제

```bash
# node_modules 재설치
rm -rf node_modules package-lock.json
npm install
```

### TypeScript 오류

```bash
# 타입 체크
npx tsc --noEmit
```

## 추가 학습 자료

- [React 공식 문서](https://react.dev)
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [React Router 가이드](https://reactrouter.com)
- [Axios 문서](https://axios-http.com)

## 라이선스

© 2024 Senior Album. All rights reserved.
