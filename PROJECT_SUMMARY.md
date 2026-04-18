# Senior Album Frontend - 프로젝트 요약

## 개요

Senior Album은 요양원에서 찍은 사진을 AI로 자동 분류하여 보호자에게 공유하는 B2B SaaS의 React 웹 애플리케이션입니다.

**프로젝트 경로**: `D:\claude-workspace\senior-album\src\frontend\`

## 생성된 파일 목록 (24개)

### 설정 파일 (9개)
1. `package.json` - npm 의존성 (React, React Router, Axios, TanStack Query, Tailwind CSS, Lucide)
2. `tsconfig.json` - TypeScript 컴파일러 설정
3. `tsconfig.node.json` - Vite 설정 TypeScript
4. `vite.config.ts` - Vite 번들러 설정 (포트 5173, 프록시)
5. `tailwind.config.js` - Tailwind CSS 색상 및 확장
6. `postcss.config.js` - PostCSS 플러그인 설정
7. `index.html` - HTML 진입점
8. `.gitignore` - Git 제외 파일
9. `README.md` - 프로젝트 문서

### 가이드 문서 (2개)
10. `SETUP_GUIDE.md` - 상세 설치 및 실행 가이드
11. `PROJECT_SUMMARY.md` - 프로젝트 요약 (현재 파일)

### React 핵심 파일 (3개)
12. `src/main.tsx` - React 진입점
13. `src/App.tsx` - 라우터 설정 및 메인 앱
14. `src/index.css` - 전역 스타일 (Tailwind 포함)

### TypeScript 타입 & 유틸 (2개)
15. `src/types/index.ts` - User, Resident, Photo, Guardian, StatsData 타입
16. `src/utils/api.ts` - Axios 클라이언트, API 메서드, 인터셉터

### 목 데이터 (1개)
17. `src/utils/mockData.ts` - 테스트용 샘플 데이터

### 상태 관리 (1개)
18. `src/context/AuthContext.tsx` - 인증 상태 관리 Context

### 페이지 컴포넌트 (6개)
19. `src/pages/LoginPage.tsx` - 로그인 페이지 (이메일/비밀번호, 역할 선택, 데모 로그인)
20. `src/pages/DashboardPage.tsx` - 시설 직원 대시보드 (통계, 최근 사진, 업로드)
21. `src/pages/ResidentsPage.tsx` - 입소자 관리 (목록, CRUD, 기준 사진 등록)
22. `src/pages/PhotosPage.tsx` - 사진 관리 (업로드, 필터, 날짜별 그룹핑)
23. `src/pages/GuardianGalleryPage.tsx` - 보호자 갤러리 (따뜻한 UI, 즐겨찾기)
24. `src/pages/ProtectedRoute.tsx` - 라우트 보호 컴포넌트

### UI 컴포넌트 (4개)
25. `src/components/Layout.tsx` - 사이드바 + 헤더 레이아웃
26. `src/components/StatsCard.tsx` - 통계 카드
27. `src/components/PhotoGrid.tsx` - 사진 그리드 (모달 포함)
28. `src/components/PhotoUploader.tsx` - 드래그앤드롭 업로더

## 주요 특징

### 라우팅
```
/login        → 로그인 (공개)
/dashboard    → 시설 직원 대시보드 (staff 전용)
/residents    → 입소자 관리 (staff 전용)
/photos       → 사진 관리 (staff 전용)
/guardian     → 보호자 갤러리 (guardian 전용)
```

### 인증 시스템
- localStorage 기반 토큰 저장
- Axios 인터셉터로 자동 Authorization 헤더 추가
- 401 응답 자동 처리
- ProtectedRoute로 역할 기반 접근 제어

### UI/UX
- **직원용**: 모던 네이비/블루 컬러 스키마
- **보호자용**: 따뜻한 크림/브라운 감정적 UI
- Tailwind CSS 반응형 디자인
- Lucide React 아이콘
- 부드러운 그림자 및 호버 효과

### 핵심 기능

#### 시설 직원용
1. **로그인**: 이메일/비밀번호 인증, 역할 선택
2. **대시보드**: 통계 카드, 최근 사진, 업로드 버튼
3. **입소자 관리**: CRUD, 기준 사진 등록 모달
4. **사진 관리**: 
   - 드래그앤드롭 다중 업로드
   - 분류/미분류 필터
   - 입소자별 필터
   - 날짜별 그룹핑
   - 사진 모달 뷰

#### 보호자용
1. **갤러리**:
   - 자신의 부모님 사진만 표시
   - 날짜별 정렬
   - 즐겨찾기 하트
   - 공유/다운로드 버튼
   - 따뜻한 감정적 UI

## 의존성

### 주요 라이브러리
- `react@18.2.0` - UI 라이브러리
- `react-router-dom@6.20.0` - 라우팅
- `axios@1.6.2` - HTTP 클라이언트
- `@tanstack/react-query@5.25.0` - 데이터 페칭
- `tailwindcss@3.3.6` - CSS 프레임워크
- `lucide-react@0.292.0` - 아이콘

### 개발 도구
- `typescript@5.2.2` - 타입스크립트
- `vite@5.0.8` - 번들러
- `@vitejs/plugin-react@4.2.1` - React 플러그인

## 색상 팔레트

### 직원용
- 주요: #1B4F72 (네이비)
- 보조: #2E75B6 (블루)

### 보호자용
- 크림: #F8F0E3
- 브라운: #D4A373

## 데이터 모델

### User
```typescript
{
  id: string;
  email: string;
  name: string;
  role: 'staff' | 'guardian';
  facilityId?: string;
}
```

### Resident
```typescript
{
  id: string;
  facilityId: string;
  name: string;
  dateOfBirth: string;
  admissionDate: string;
  status: 'active' | 'inactive';
  guardianId?: string;
}
```

### Photo
```typescript
{
  id: string;
  facilityId: string;
  fileName: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  residentIds: string[];
  residentNames: string[];
  classified: boolean;
  thumbnail?: string;
}
```

## API 클라이언트

### 기본 사용법
```typescript
import { apiClient } from '@/utils/api';

// 로그인
await apiClient.login(email, password);

// 시설 조회
await apiClient.getFacility(facilityId);

// 입소자 목록
await apiClient.getFacilityResidents(facilityId);

// 사진 업로드
const formData = new FormData();
formData.append('file', file);
await apiClient.uploadPhoto(facilityId, formData);

// 보호자 사진 조회
await apiClient.getGuardianPhotos();
```

## 목 데이터

UI 테스트를 위해 다음 목 데이터 포함:
- `mockFacility` - 서울 행복 요양원
- `mockResidents` - 5명의 샘플 입소자
- `mockPhotos` - 5개의 샘플 사진
- `mockStatsData` - 통계 데이터
- `mockGuardianPhotos` - 보호자용 사진

## 초기 설정

### 1. 의존성 설치
```bash
cd D:\claude-workspace\senior-album\src\frontend
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
# http://localhost:5173 접속
```

### 3. 데모 로그인
로그인 페이지에서 "데모로 둘러보기" 버튼으로 즉시 테스트 가능

## 프로덕션 빌드

```bash
npm run build
# dist/ 폴더에 최적화된 정적 파일 생성
```

## 개발 팁

1. **Mock 데이터 수정**: `src/utils/mockData.ts` 편집 → 자동 리로드
2. **TypeScript 체크**: `npx tsc --noEmit`
3. **Tailwind 클래스**: IntelliSense 확장 설치 권장
4. **라우트 테스트**: ProtectedRoute로 인증 확인
5. **API 연동**: apiClient 메서드 호출로 실제 API 사용 가능

## 파일 크기 및 성능

- 목 데이터 포함 완전한 UI 구현
- 번들 크기 최적화 (Vite)
- 이미지 최적화 (thumbnail 지원)
- 무한 스크롤 준비 (필요시 추가 가능)

## 앞으로 구현할 수 있는 기능

1. **React Query 통합**: 서버 상태 관리
2. **무한 스크롤**: 사진 그리드 페이징
3. **이미지 압축**: 업로드 전 최적화
4. **실시간 알림**: WebSocket 통합
5. **PDF 내보내기**: 사진 정리본
6. **고급 필터**: 날짜 범위, 여러 입소자
7. **사진 편집**: 크롭, 필터 적용
8. **댓글/메모**: 사진별 보호자 메모

## 문제 해결

### 포트 충돌
```bash
npm run dev -- --port 3000
```

### 의존성 오류
```bash
rm -rf node_modules package-lock.json
npm install
```

### TypeScript 오류
```bash
npx tsc --noEmit
```

## 라이선스

© 2024 Senior Album. All rights reserved.

## 다음 단계

1. `SETUP_GUIDE.md` 참고하여 개발 환경 구성
2. `npm install` 및 `npm run dev` 실행
3. 로그인 페이지에서 데모 로그인으로 UI 확인
4. 각 페이지의 목 데이터 상호작용 테스트
5. 필요시 백엔드 API 연동
