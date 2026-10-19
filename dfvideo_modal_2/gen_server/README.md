# Fact-Trace AI — 딥페이크 영상 생성 서버 (FaceFusion GPU Backend)

본 백엔드는 발표 시연용 **방문객 얼굴 딥페이크 합성 전용 서버**입니다.
탐지 플랫폼(Fact-Trace AI)과는 독립적으로 운영되며, 11월 글로벌호스트 NVIDIA RTX 4090 GPU 서버에서 FaceFusion CLI를 통해 3~5초 원본 영상과 실시간 인스왑 합성을 수행합니다.

---

## 1. 서버 인프라 및 환경

- **GPU**: NVIDIA GeForce RTX 4090 (24GB VRAM)
- **OS**: Ubuntu 22.04 LTS 또는 Windows Server
- **파이프라인 엔진**: FaceFusion (CLI Headless Run)
- **웹 프레임워크**: Python 3.10+ / FastAPI / Uvicorn
- **보안 & 도메인**: HTTPS 필수 (Cloudflare Tunnel 또는 Let's Encrypt SSL)

---

## 2. API 규격 요약

| 메서드 | 엔드포인트 | 요청 파라미터 | 응답 | 설명 |
|---|---|---|---|---|
| `GET` | `/templates` | 없음 | `200 [ {id, title, duration_sec, ...} ]` | 시연용 3~5초 원본 템플릿 목록 |
| `POST` | `/jobs` | multipart: `photo`(file), `template_id`(form) | `202 { "job_id": "..." }` | 합성 작업 큐 등록 |
| `GET` | `/jobs/{id}` | 없음 | `200 { "status": "queued\|processing\|done\|error", "progress": 0~100 }` | 작업 진행 상태 폴링 (2초 간격) |
| `GET` | `/jobs/{id}/result` | 없음 | `200` (video/mp4 바이너리 스트림) | 완성된 합성 MP4 다운로드 |
| `DELETE` | `/jobs/{id}` | 없음 | `204 No Content` | 서버 사진 및 결과 파일 즉각 삭제 |

### 오류 코드 표준
- `FACE_NOT_FOUND`: 업로드된 사진에서 사람 얼굴 검출 실패
- `MULTIPLE_FACES`: 2인 이상 얼굴 검출 시
- `SERVER_BUSY`: GPU 동시 작업 제한 도달 (기본 2건)
- `INTERNAL`: FaceFusion 내부 처리 오류

---

## 3. 실행 방법

### 1) 가상환경 설정 및 패키지 설치
```bash
cd dfvideo_modal_2/gen_server
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2) 개발 / 모의(Mock) 모드 실행 (GPU 미탑재 로컬)
GPU나 FaceFusion이 없어도 점진적 진행률(0→100%, 약 8초) 및 샘플 MP4 다운로드까지 전체 파이프라인이 정상 동작합니다.
```bash
python server.py
# 또는
uvicorn server:app --host 0.0.0.0 --port 8002 --reload
```

### 3) 11월 글로벌호스트 RTX 4090 실제 GPU 연동 실행
```bash
export USE_REAL_GPU=true
export FACEFUSION_PATH=/path/to/facefusion/facefusion.py
export MAX_CONCURRENT_JOBS=2
uvicorn server:app --host 0.0.0.0 --port 8002
```

### 4) HTTPS 연결 (Cloudflare Tunnel 권장)
Vercel에 배포된 프론트엔드가 HTTPS 환경이므로, 생성 서버도 반드시 HTTPS로 노출되어야 브라우저 Mixed Content 차단이 발생하지 않습니다.
```bash
# Cloudflare Tunnel 실행 예시
cloudflared tunnel --url http://localhost:8002
# 할당된 https://xxxx.trycloudflare.com 도메인을 Vercel 환경변수 VITE_GEN_API_BASE 에 입력
```

---

## 4. 프론트엔드 연동 환경변수 (Vercel)

Vercel 대시보드 **Settings → Environment Variables**:
- `VITE_GEN_MOCK`: `false`
- `VITE_GEN_API_BASE`: `https://your-gpu-server-domain.com` (또는 Cloudflare Tunnel 주소)
- `VITE_DETECT_URL`: `/video`

