# Senior Album - 프로젝트 요약

## 개요

Senior Album은 요양원에서 촬영한 사진을 AI(InsightFace/ArcFace)로 자동 분류하여 보호자에게 해당 어르신 사진만 안전하게 공유하는 B2B SaaS 플랫폼입니다.

## 아키텍처

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐
│   React SPA     │────▶│  FastAPI 백엔드   │────▶│  PostgreSQL  │
│  (Vite, TS)     │     │  (uvicorn)       │     └──────────────┘
│  :5173          │     │  :8000           │
└─────────────────┘     │                  │────▶┌──────────────┐
                        │                  │     │  MinIO (S3)  │
                        │                  │────▶│  :9000       │
                        │                  │     └──────────────┘
                        │                  │────▶┌──────────────┐
                        │                  │     │  OpenSearch   │
                        │                  │────▶│  :9200       │
                        │                  │     └──────────────┘
                        │                  │────▶┌──────────────┐
                        └─────────────────┘     │  Redis       │
                                                │  :6379       │
                                                └──────────────┘
```

## 사용자 역할

| 역할 | 설명 | 주요 기능 |
|------|------|-----------|
| Staff (Admin) | 시설 관리자 | 시설 생성, 전체 관리, 보호자 승인 |
| Staff | 시설 직원 | 사진 업로드, 입소자 관리, 사진 공개 |
| Guardian | 보호자 | 공개된 내 어르신 사진 조회, 좋아요, 공유 |

## 핵심 워크플로우

### 1. 사진 업로드 → AI 분류
1. 직원이 사진 업로드 (`POST /photos/upload`)
2. 백그라운드 워커가 InsightFace로 얼굴 감지
3. OpenSearch에서 등록된 얼굴 임베딩과 cosine similarity 매칭
4. 매칭된 입소자와 사진 연결 (PhotoResident 다대다)

### 2. 사진 공개 → 보호자 조회
1. 직원이 사진을 공개로 전환 (`POST /photos/{id}/publish`)
2. PhotoAuditLog에 감사 이력 기록
3. 보호자가 갤러리에서 공개된 사진만 조회 (`GET /guardians/me/photos`)

### 3. 보호자 연결
1. 직원이 보호자를 입소자에 초대 (`POST /invitations`)
2. 보호자가 초대 수락 (`POST /invitations/{id}/accept`)
3. Guardian 테이블에 resident_id 연결

## 데이터 모델 (주요)

### User
- `id` (UUID), `email`, `name`, `password_hash`, `role` (staff/guardian), `is_admin`, `facility_id`, `provider` (kakao/null)

### Facility
- `id` (UUID), `name`, `address`, `phone`, `code` (FAC-XXXXXX)

### Resident
- `id` (UUID), `facility_id`, `name`, `date_of_birth`, `admission_date`, `status` (active/inactive)

### Photo
- `id` (UUID), `facility_id`, `file_name`, `file_path`, `storage_type` (minio/local)
- `is_public` (공개 여부), `published_by`, `published_at`
- `processing_status` (pending/completed/failed), `upload_source`, `uploaded_by`

### PhotoResident (다대다)
- `photo_id`, `resident_id`, `confidence` (매칭 신뢰도)

### PhotoLike
- `photo_id`, `user_id`

### PhotoShare
- `photo_id`, `share_token` (32자), `expires_at` (72시간)

### PhotoAuditLog
- `photo_id`, `action` (publish/unpublish/upload/delete), `performed_by`, `detail`

### Guardian
- `user_id`, `resident_id`, `facility_id`, `relationship_type`, `is_approved`

### Invitation
- `resident_id`, `phone`, `relationship_type`, `status` (pending/accepted/rejected)

## 보안 기능

| 기능 | 설명 |
|------|------|
| JWT 인증 | 자체 발급, 7일 만료, 자동 갱신 |
| 카카오 OAuth | 소셜 로그인 지원 |
| Rate Limiting | Redis 기반 로그인 5회/15분 제한 (인메모리 fallback) |
| 시설 격리 | JWT facility_id 검증으로 타 시설 데이터 접근 차단 |
| 감사 로그 | 사진 공개/비공개 이력 추적 |
| 공유 링크 만료 | 72시간 후 자동 만료 + presigned URL |
| CORS | 허용된 도메인만 API 접근 |

## 외부 서비스 및 Fallback

| 서비스 | 용도 | 없을 때 |
|--------|------|---------|
| PostgreSQL | 메인 DB | 필수 (fallback 없음) |
| Redis | Rate Limiting, 캐시 | 인메모리 dict fallback |
| MinIO | 사진 저장 | 로컬 `./uploads` 디렉토리 |
| OpenSearch | 얼굴 벡터 검색 | 얼굴 검색 비활성화 |
| InsightFace | 얼굴 인식 | 얼굴 인식 비활성화 |

## 프론트엔드 페이지 목록

| 페이지 | 경로 | 접근 |
|--------|------|------|
| 로그인 | `/login` | 공개 |
| 회원가입 | `/register` | 공개 |
| 카카오 콜백 | `/auth/kakao/callback` | 공개 |
| 역할 선택 | `/select-role` | 공개 |
| 공유 사진 | `/shared/:token` | 공개 |
| 대시보드 | `/dashboard` | Staff |
| 입소자 관리 | `/residents` | Staff |
| 사진 관리 | `/photos` | Staff |
| 보호자 관리 | `/guardian-manage` | Staff |
| 보호자 갤러리 | `/guardian` | Guardian |
| 보호자 마이페이지 | `/guardian/mypage` | Guardian |

## 환경변수

백엔드 `.env` 주요 설정:

```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/senior_album
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-secret-key
MINIO_ENDPOINT=localhost:9000
MINIO_BUCKET=senior-album-photos
FACE_SIMILARITY_THRESHOLD=0.6
LOGIN_MAX_ATTEMPTS=5
SHARE_LINK_EXPIRE_HOURS=72
DDL_AUTO=create
FRONTEND_URL=http://localhost:5173
API_BASE_URL=http://localhost:8000
KAKAO_CLIENT_ID=...
```

프론트엔드 `.env.local` (선택):
```
VITE_API_URL=http://localhost:8000
```

## 실행 방법

```bash
# 백엔드
cd src/backend
cp .env.example .env
pip install -r requirements.txt
python -m uvicorn app.main:app --reload

# 프론트엔드
cd src/frontend
npm install
npm run dev
```

## 라이선스

MIT License
