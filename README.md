# Senior Album Frontend

Senior Album 시설 관리자 대시보드 및 보호자 갤러리 웹 애플리케이션입니다.

## 기술 스택

- React 18
- TypeScript
- React Router
- Axios
- TanStack React Query
- Tailwind CSS
- Lucide React Icons
- Vite

## 프로젝트 구조

```
src/
├── pages/
│   ├── LoginPage.tsx           # 로그인 페이지
│   ├── DashboardPage.tsx       # 시설 직원 대시보드
│   ├── ResidentsPage.tsx       # 입소자 관리
│   ├── PhotosPage.tsx          # 사진 관리
│   ├── GuardianGalleryPage.tsx # 보호자 갤러리
│   └── ProtectedRoute.tsx      # 라우트 보호
├── components/
│   ├── Layout.tsx              # 사이드바 레이아웃
│   ├── StatsCard.tsx           # 통계 카드
│   ├── PhotoGrid.tsx           # 사진 그리드
│   └── PhotoUploader.tsx       # 드래그앤드롭 업로더
├── context/
│   └── AuthContext.tsx         # 인증 상태 관리
├── utils/
│   ├── api.ts                  # Axios 인스턴스 및 API 클라이언트
│   └── mockData.ts             # 목업 데이터
├── types/
│   └── index.ts                # TypeScript 타입 정의
├── App.tsx                     # 라우터 설정
├── main.tsx                    # 진입점
└── index.css                   # 전역 스타일
```

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드된 결과 미리보기
npm run preview
```

## 주요 기능

### 시설 직원용 (Staff)

1. **대시보드**
   - 오늘 업로드된 사진, 총 입소자, 분류 완료율 통계
   - 최근 업로드 사진 미리보기
   - 사진 업로드 기능

2. **입소자 관리**
   - 입소자 목록 조회
   - 입소자 등록/수정/삭제
   - 기준 사진 등록 (얼굴 임베딩용)

3. **사진 관리**
   - 드래그앤드롭 다중 사진 업로드
   - 사진 필터 (분류 상태, 입소자별)
   - 날짜별 그룹핑
   - 분류 결과 표시

### 보호자용 (Guardian)

1. **감정적인 갤러리 UI**
   - 따뜻한 톤의 색상 (크림, 브라운)
   - 자신의 부모님 사진만 표시
   - 날짜별 정렬

2. **상호작용 기능**
   - 즐겨찾기 하트
   - 사진 다운로드
   - 사진 공유

## 디자인 시스템

### 색상

- **주요**: #1B4F72 (네이비)
- **보조**: #2E75B6 (블루)
- **보호자**: #F8F0E3 (크림), #D4A373 (브라운)

### 컴포넌트 스타일

- 라운드 카드 (border-radius: 8px+)
- 부드러운 그림자 (shadow-soft)
- 호버 효과 및 트랜지션

## API 연동

Axios 인스턴스(`apiClient`)를 사용하여 백엔드 API와 통신합니다.

### 예제

```typescript
import { apiClient } from '@/utils/api';

// 로그인
const response = await apiClient.login(email, password);

// 사진 업로드
const formData = new FormData();
formData.append('file', file);
await apiClient.uploadPhoto(facilityId, formData);
```

## 인증

- localStorage에 토큰 저장
- 요청 인터셉터에서 자동으로 Authorization 헤더 추가
- 401 응답 시 자동으로 로그인 페이지로 리다이렉트

## 데모 로그인

UI 테스트를 위해 데모 로그인 버튼 제공:

- 직원 데모: staff@example.com
- 보호자 데모: guardian@example.com

## 환경 변수

```
REACT_APP_API_URL=http://localhost:8000/api
```

## 라이선스

© 2024 Senior Album. All rights reserved.
