# Senior Album Frontend

요양원 사진 AI 분류 및 공유 플랫폼 Senior Album의 React 웹 애플리케이션입니다. 시설 직원용 관리 대시보드와 보호자용 갤러리를 제공합니다.

## 기술 스택

- React 18 + TypeScript
- React Router 6 (SPA 라우팅)
- Axios (API 통신, 인터셉터로 JWT 자동 관리)
- TanStack React Query (서버 상태 관리)
- Tailwind CSS (유틸리티 CSS)
- Lucide React (아이콘)
- Vite 5 (번들러)

## 프로젝트 구조

```
src/
├── App.tsx                         # 라우터 설정
├── main.tsx                        # React 진입점
├── index.css                       # 전역 스타일 (Tailwind)
│
├── types/
│   └── index.ts                    # TypeScript 타입 정의
│
├── utils/
│   ├── api.ts                      # ApiClient (Axios 인스턴스, JWT 갱신 인터셉터)
│   └── mockData.ts                 # UI 테스트용 샘플 데이터
│
├── context/
│   └── AuthContext.tsx              # 인증 상태 관리 (Context API)
│
├── pages/
│   ├── LoginPage.tsx               # 이메일/비밀번호 + 카카오 로그인
│   ├── RegisterPage.tsx            # 회원가입 (관리자/직원/보호자)
│   ├── KakaoCallbackPage.tsx       # 카카오 OAuth 콜백 처리
│   ├── SelectRolePage.tsx          # 카카오 가입 후 역할 선택
│   ├── DashboardPage.tsx           # 시설 직원 대시보드
│   ├── ResidentsPage.tsx           # 입소자 관리 (CRUD, 기준 사진)
│   ├── PhotosPage.tsx              # 사진 관리 (업로드, 공개/비공개, 필터)
│   ├── GuardianGalleryPage.tsx     # 보호자 갤러리 (내 어르신 사진)
│   ├── GuardianMyPage.tsx          # 보호자 마이페이지
│   ├── GuardianManagePage.tsx      # 보호자 관리 (직원용 — 승인/거절)
│   ├── SharedPhotoPage.tsx         # 공유 링크로 접근하는 사진 뷰
│   └── ProtectedRoute.tsx          # 역할 기반 라우트 보호
│
├── components/
│   ├── Layout.tsx                  # 사이드바 + 헤더 레이아웃
│   ├── StatsCard.tsx               # 통계 카드
│   ├── PhotoGrid.tsx               # 사진 그리드 + 모달 뷰
│   └── PhotoUploader.tsx           # 드래그앤드롭 다중 업로더
│
└── __tests__/
    └── RegisterPage.test.tsx       # 회원가입 테스트
```

## 설치 및 실행

```bash
cd src/frontend
npm install
npm run dev          # http://localhost:5173
npm run build        # 프로덕션 빌드 → dist/
```

## 환경 변수

`.env.local` 파일 (선택):
```
VITE_API_URL=http://localhost:8000
```

설정하지 않으면 기본값 `http://localhost:8000` 사용.

## 라우팅

```
공개 라우트:
  /login                → 로그인
  /register             → 회원가입
  /auth/kakao/callback  → 카카오 OAuth 콜백
  /select-role          → 카카오 가입 후 역할 선택
  /shared/:token        → 공유 사진 보기

Staff 전용:
  /dashboard            → 시설 대시보드
  /residents            → 입소자 관리
  /photos               → 사진 관리
  /guardian-manage       → 보호자 승인 관리

Guardian 전용:
  /guardian              → 보호자 갤러리
  /guardian/mypage       → 보호자 마이페이지
```

## 인증 시스템

- `localStorage`에 `accessToken`, `user`, `facility` 저장
- Axios request 인터셉터에서 `Authorization: Bearer <token>` 자동 추가
- 401 응답 시 `/auth/refresh`로 토큰 갱신 시도
- 갱신 실패 시 localStorage 클리어 후 `/login`으로 리다이렉트
- `ProtectedRoute`에서 역할(staff/guardian) 기반 접근 제어

## 주요 기능

### 시설 직원용 (Staff)

- **대시보드**: 오늘 업로드, 총 입소자, 분류율 통계, 최근 사진 미리보기
- **입소자 관리**: 등록/수정, 기준 사진 등록 (얼굴 인식용), 얼굴 목록 관리
- **사진 관리**: 드래그앤드롭 다중 업로드, 입소자별/상태별 필터, 날짜별 그룹핑, 공개/비공개 토글, 일괄 공개, 공유 링크 생성
- **보호자 관리**: 대기 중인 보호자 승인/거절, 전체 보호자 목록

### 보호자용 (Guardian)

- **갤러리**: 공개된 내 어르신 사진만 표시, 시설/입소자별 필터, 좋아요, 공유, 다운로드
- **마이페이지**: 프로필 수정, 알림 설정, 초대 수락/거절

## API 클라이언트 (`api.ts`)

```typescript
import { apiClient } from '@/utils/api';

// 인증
apiClient.login(email, password)
apiClient.registerAdmin(data)
apiClient.registerStaff(data)
apiClient.registerGuardian(data)
apiClient.getMe()

// 카카오
apiClient.getKakaoLoginUrl()
apiClient.kakaoCallback(code)
apiClient.setRoleAfterKakao(data)

// 시설
apiClient.getFacility(id)
apiClient.getFacilityStats(facilityId)
apiClient.getFacilityResidents(facilityId)
apiClient.getFacilityPhotos(facilityId)

// 입소자
apiClient.createResident(data)
apiClient.registerResidentFace(residentId, formData)
apiClient.getResidentFaces(residentId)
apiClient.deleteResidentFace(residentId, docId)

// 사진
apiClient.uploadPhoto(facilityId, formData)
apiClient.toggleLike(photoId)
apiClient.createShareLink(photoId)
apiClient.getSharedPhoto(shareToken)
apiClient.togglePublish(photoId)
apiClient.bulkPublish(photoIds, isPublic)

// 보호자
apiClient.getGuardianPhotos()
apiClient.getGuardianResidents()
apiClient.getGuardianStatus()
apiClient.getGuardianProfile()
apiClient.updateGuardianProfile(data)
apiClient.updateGuardianNotificationSettings(enabled)

// 보호자 관리 (직원용)
apiClient.getPendingGuardians(facilityId)
apiClient.getAllGuardians(facilityId)
apiClient.approveGuardian(guardianId, approved, rejectReason?)

// 초대
apiClient.createInvitation(data)
apiClient.getMyInvitations()
apiClient.acceptInvitation(invitationId)
apiClient.rejectInvitation(invitationId)
apiClient.getFacilityInvitations(facilityId)
```

## 디자인

- **직원용**: 네이비(#1B4F72) / 블루(#2E75B6) 프로페셔널 톤
- **보호자용**: 크림(#F8F0E3) / 브라운(#D4A373) 따뜻한 감정적 톤
- 반응형 레이아웃, 라운드 카드, 부드러운 그림자, 호버 트랜지션

## 라이선스

MIT License
