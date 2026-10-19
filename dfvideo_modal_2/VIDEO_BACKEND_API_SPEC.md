# Fact-Trace AI — 영상 백엔드 통합 API 명세서 및 구현 현황

본 문서는 **Fact-Trace AI**의 영상 관련 백엔드 시스템 전체에 대한 상세 API 규격서 및 현재 구현 현황 가이드입니다.  
본 프로젝트의 영상 시스템은 캡스톤 본과제인 **[1. 영상 탐지 플랫폼]**과 발표장 방문객 체험용 **[2. 영상 생성 플랫폼]**이 물리적으로 분리되어 운영됩니다.

---

## 1. 시스템 전체 아키텍처 및 분리 구조

```mermaid
flowchart TD
    subgraph Client ["프론트엔드 (React + Vite / Vercel 배포)"]
        UI_Home["메인 홈 (/)"]
        UI_Detect["영상 딥페이크 탐지 (/video)"]
        UI_Gen["시연용 생성 스튜디오 (/demo/generate)"]
    end

    subgraph Detect_Backend ["A. 영상 탐지 백엔드 (Modal 클라우드)"]
        Modal_API["Modal T4 GPU 서버\n(https://goyeas52--dfvideo-web.us-east.modal.run)"]
        Model_V6["CLIP / ConvNeXt 앙상블 신경망 (v6)\nRetinaFace 얼굴 검출"]
    end

    subgraph Gen_Backend ["B. 영상 생성 백엔드 (글로벌호스트)"]
        FastAPI_Server["FastAPI 생성 서버 (port 8002)\n(dfvideo_modal_2/gen_server)"]
        FaceFusion_GPU["NVIDIA RTX 4090 GPU\nFaceFusion Headless CLI"]
    end

    UI_Detect -->|POST /predict| Modal_API
    Modal_API --> Model_V6

    UI_Gen -->|POST /jobs, GET /jobs/{id}| FastAPI_Server
    FastAPI_Server --> FaceFusion_GPU

    UI_Gen -.->|합성 MP4 다운로드 후 탐지 검증| UI_Detect
```

---

## 2. 영상 합성(생성) 단계 현재 구현 현황

### Q. 얼굴 사진을 찍고 올리면 영상이 합성되는 단계는 구현되었는가?
> **답변: "화면 UI 및 다운로드 흐름은 100% 구현 완료되었으며, 실제 AI 모델 연산은 11월 GPU 서버 연동 시 실행"됩니다.**

1. **프론트엔드 시연 흐름 (100% 완료 ✅)**
   - 웹캠 사진 촬영(또는 파일 선택) → 3~5초 템플릿 선택 → 합성 시작 → 실시간 진행률(0% → 100%) 바 → 완료 영상 브라우저 재생 → `demo_synthetic_YYYYMMDD_HHmm.mp4` Blob 다운로드까지 **지금 로컬 화면에서 전체 시연 흐름을 즉시 체험**할 수 있습니다.
2. **현재 로컬 환경 동작 원리 (모의 / Mock 모드)**
   - 사람 얼굴을 영상에 딥러닝으로 합성(Face Swap)하는 연산은 **수 GB 크기의 가중치 모델과 고성능 외장 GPU(RTX 4090)**를 요구합니다.
   - 따라서 현재 개발 환경에서는 화면 흐름과 다운로드가 끊김 없이 시연되도록 **약 8~10초간 실제 AI 연산 시간처럼 점진적으로 진행률이 올라간 후, 준비된 고화질 결과 MP4를 반환하는 시뮬레이션 모드**로 작동합니다.
3. **실제 AI 딥페이크 모델 합성 시점**
   - **11월 글로벌호스트 RTX 4090 서버**가 열리면, 구축된 백엔드 서버(`server.py`)의 `USE_REAL_GPU=true` 플래그를 활성화하여 방문객 본인 얼굴을 3~5초 원본 영상에 프레임별로 인스왑한 새 동영상을 생성합니다.

---

## 3. [백엔드 A] 발표 시연용 FaceFusion 영상 생성 API

- **서버 구현 파일**: [`dfvideo_modal_2/gen_server/server.py`](file:///c:/Users/user/Fact_Check/dfvideo_modal_2/gen_server/server.py)
- **로컬 실행 포트**: `http://localhost:8002`
- **11월 배포 환경**: 글로벌호스트 NVIDIA RTX 4090 + Cloudflare Tunnel (HTTPS)
- **CORS 설정**: Vercel 배포 도메인 및 `http://localhost:5173` 전면 허용 (`*`)

### 1) 원본 템플릿 목록 조회
- **메서드 & 경로**: `GET /templates`
- **설명**: 방문객 얼굴을 합성할 미리 준비된 3~5초 원본 영상 목록을 반환합니다.
- **Request**: 없음
- **Response**: `200 OK`
```json
[
  {
    "id": "tpl_news",
    "title": "뉴스 앵커 보도 (권장)",
    "duration_sec": 3.2,
    "thumbnail_url": "/templates/thumb_news.svg",
    "preview_url": "/templates-static/tpl_news.mp4",
    "description": "정면 얼굴과 안정적인 스튜디오 조명"
  },
  {
    "id": "tpl_interview",
    "title": "단독 인터뷰 클립",
    "duration_sec": 4.0,
    "thumbnail_url": "/templates/thumb_interview.svg",
    "preview_url": "/templates-static/tpl_interview.mp4",
    "description": "자연스러운 표정 및 눈 깜빡임 변화"
  },
  {
    "id": "tpl_vlog",
    "title": "일상 브이로그",
    "duration_sec": 4.8,
    "thumbnail_url": "/templates/thumb_vlog.svg",
    "preview_url": "/templates-static/tpl_vlog.mp4",
    "description": "실전 환경 야외 조명 및 핸드헬드 무빙"
  },
  {
    "id": "tpl_speech",
    "title": "강연 및 발표 모션",
    "duration_sec": 3.5,
    "thumbnail_url": "/templates/thumb_speech.svg",
    "preview_url": "/templates-static/tpl_speech.mp4",
    "description": "역동적인 고개 움직임과 입모양 변화"
  }
]
```

---

### 2) 딥페이크 합성 작업 생성
- **메서드 & 경로**: `POST /jobs`
- **설명**: 얼굴 사진과 템플릿 ID를 서버로 전송하여 백그라운드 합성 작업을 대기열에 등록합니다.
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  | 필드명 | 타입 | 필수 여부 | 설명 |
  |---|---|---|---|
  | `photo` | File (Binary) | 필수 | 방문객 얼굴 이미지 (JPEG/PNG, 최대 10MB) |
  | `template_id` | String | 필수 | 선택한 템플릿 ID (예: `"tpl_news"`) |
- **Response**: `202 Accepted`
```json
{
  "job_id": "job_e004248660b6"
}
```
- **Error Responses**:
  - `400 Bad Request` (유효하지 않은 파일):
    ```json
    { "error_code": "INVALID_IMAGE", "message": "이미지 파일만 업로드할 수 있습니다." }
    ```
  - `503 Service Unavailable` (GPU 대기열 초과):
    ```json
    { "error_code": "SERVER_BUSY", "message": "현재 GPU 합성 대기열이 가득 찼습니다. 잠시 후 다시 시도해 주세요." }
    ```

---

### 3) 합성 진행 상태 폴링
- **메서드 & 경로**: `GET /jobs/{id}`
- **설명**: 2초 간격으로 작업 진행률(0~100) 및 상태를 조회합니다. 5분 초과 시 프론트엔드에서 타임아웃 처리합니다.
- **Response**: `200 OK`
  - **대기/진행 중**:
    ```json
    {
      "status": "processing",
      "progress": 60
    }
    ```
  - **합성 완료 (`done`)**:
    ```json
    {
      "status": "done",
      "progress": 100,
      "result_url": "/jobs/job_e004248660b6/result"
    }
    ```
  - **얼굴 인식 실패 에러 (`error`)**:
    ```json
    {
      "status": "error",
      "error_code": "FACE_NOT_FOUND",
      "message": "사진에서 얼굴을 인식하지 못했습니다. 정면을 바라보고 다시 촬영해 주세요."
    }
    ```

---

### 4) 결과 딥페이크 MP4 다운로드
- **메서드 & 경로**: `GET /jobs/{id}/result`
- **설명**: 합성 완료된 고화질 MP4 영상을 브라우저로 스트리밍 또는 Blob 다운로드합니다.
- **Response**: `200 OK` (Binary `video/mp4`)
  - `Content-Type`: `video/mp4`
  - `Content-Disposition`: `attachment; filename="demo_synthetic_YYYYMMDD_HHmm.mp4"`
  - `Accept-Ranges`: `bytes`

---

### 5) 개인정보 및 임시 파일 영구 파기
- **메서드 & 경로**: `DELETE /jobs/{id}`
- **설명**: 시연 완료 또는 [처음부터 다시] 클릭 시 서버 디스크의 사진과 합성 결과 비디오를 즉시 영구 삭제합니다.
- **Response**: `204 No Content`

---

### 오류 코드 표준
| 에러 코드 | 원인 | 사용자 안내 문구 |
|---|---|---|
| `FACE_NOT_FOUND` | 사진에서 사람 얼굴 검출 실패 | 사진에서 얼굴을 인식하지 못했습니다. 정면을 똑바로 바라보고 다시 촬영해 주세요. |
| `MULTIPLE_FACES` | 사진에 2명 이상의 얼굴 감지 | 사진에서 2명 이상의 얼굴이 감지되었습니다. 혼자서 다시 촬영해 주세요. |
| `SERVER_BUSY` | GPU 합성 동시 작업 한도(2건) 초과 | 현재 GPU 합성 대기열이 가득 찼습니다. 잠시 후 다시 시도해 주세요. |
| `TIMEOUT` | 합성 처리 시간 5분 초과 | 합성 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요. |
| `INTERNAL` | FaceFusion 엔진 내부 오류 | 합성 서버 내부 처리 중 오류가 발생했습니다. 다시 시도해 주세요. |

---

## 4. [백엔드 B] Fact-Trace AI 영상 탐지 API

- **운영 인프라**: Modal Cloud Serverless GPU (NVIDIA T4)
- **서버 실제 엔드포인트**: `https://goyeas52--dfvideo-web.us-east.modal.run`
- **프론트엔드 프록시 주소**: `/api/video` (Vite dev proxy 및 프로덕션 환경 연동)
- **배포 설정 코드**: [`dfvideo_modal_2/modal_app.py`](file:///c:/Users/user/Fact_Check/dfvideo_modal_2/modal_app.py)

---

### 1) 탐지 서버 헬스체크
- **메서드 & 경로**: `GET /health`
- **Request**: 없음
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "model": "v6",
  "n_seeds": 3,
  "device": "cuda:0",
  "api_version": "0.2.1"
}
```

---

### 2) 영상 딥페이크 정밀 탐지 (Core Prediction)
- **메서드 & 경로**: `POST /predict?return_frames=true`
- **Content-Type**: `multipart/form-data`
- **Query Parameter**: `return_frames=true` (프레임별 얼굴 크롭 base64 이미지 포함 여부)
- **Request Body**:
  | 필드명 | 타입 | 필수 여부 | 설명 |
  |---|---|---|---|
  | `file` | File (Binary) | 필수 | 검증 대상 동영상 파일 (MP4, AVI, MOV, WEBM) |

- **Response**: `200 OK`
```json
{
  "api_version": "0.2.1",
  "model": "v6",
  "n_seeds": 3,
  "device": "cuda:0",
  "video": "demo_synthetic_sample.mp4",
  "n_frames_total": 96,
  "fps": 30.0,
  "n_frames_sampled": 10,
  "n_frames_used": 10,
  "threshold": 0.0,
  "verdict": "FAKE",
  "video_margin": -1.8421,
  "seed_margins": [-1.782, -1.905, -1.839],
  "fake_score_display": 98.4,
  "timing_ms": {
    "decode_detect_crop": 820,
    "model": 1450,
    "total": 2270
  },
  "warnings": [],
  "frames": [
    {
      "frame_index": 0,
      "time_sec": 0.0,
      "status": "ok",
      "face_detected": true,
      "bbox": [120, 85, 340, 310],
      "margin": -2.105,
      "verdict": "FAKE",
      "crop_jpeg_base64": "/9j/4AAQSkZJRgABAQ..."
    },
    {
      "frame_index": 10,
      "time_sec": 0.33,
      "status": "ok",
      "face_detected": true,
      "bbox": [122, 84, 342, 312],
      "margin": -1.954,
      "verdict": "FAKE",
      "crop_jpeg_base64": "/9j/4AAQSkZJRgABAQ..."
    }
  ]
}
```

---

### 탐지 핵심 지표 해석 가이드
1. **`verdict` (최종 판정)**:
   - `REAL`: 진본 영상 (합성 흔적 없음)
   - `FAKE`: 조작 의심 영상 (딥페이크 검출)
   - `UNKNOWN`: 영상 내 얼굴 미검출 등 판정 불가
2. **`video_margin` (결정 마진 점수)**:
   - **판정 기준 임계값(Threshold): `0.0`**
   - **0 미만 (음수)**: `FAKE` (음수 절댓값이 클수록 합성 확신도 높음)
   - **0 이상 (양수)**: `REAL` (양수 값이 클수록 진본 확신도 높음)
3. **`timing_ms` (추론 소요 시간)**:
   - `decode_detect_crop`: 비디오 디코딩 및 RetinaFace 얼굴 검출 시간
   - `model`: CLIP / ConvNeXt 앙상블 신경망 3개 시드 추론 시간
   - `total`: 서버 내부 순수 처리 시간 (브라우저 네트워크 RTT와 별개)
4. **`frames[].crop_jpeg_base64`**:
   - 모델이 실제로 분석한 프레임별 얼굴 크롭 이미지를 Base64 형태로 제공하여, 프론트엔드 검토 갤러리에서 시각적 확인 가능

---

## 5. 환경변수 설정 레퍼런스

### 프론트엔드 환경변수 (`.env.local` 및 Vercel)
```ini
# [영상 탐지] Modal 클라우드 배포 주소
MODAL_VIDEO_API_ORIGIN=https://goyeas52--dfvideo-web.us-east.modal.run
VITE_VIDEO_API_BASE_URL=/api/video

# [시연용 딥페이크 생성] 11월 GPU 서버 연동 전 (현재 Mock 모드)
VITE_GEN_MOCK=true
VITE_GEN_API_BASE=
VITE_DETECT_URL=/video

# [시연용 딥페이크 생성] 11월 GPU 서버 오픈 후 (실제 GPU 연동 시)
# VITE_GEN_MOCK=false
# VITE_GEN_API_BASE=https://your-facefusion-server.com
# VITE_DETECT_URL=/video
```

### 생성 서버 백엔드 환경변수 (`dfvideo_modal_2/gen_server`)
```ini
PORT=8002
MAX_CONCURRENT_JOBS=2
USE_REAL_GPU=false        # 11월 4090 서버에서는 true
FACEFUSION_PATH=facefusion.py
```

