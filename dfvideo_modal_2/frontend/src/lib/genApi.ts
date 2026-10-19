import type { TemplateVideo, JobCreateResponse, JobStatusResponse, GenErrorCode } from '../types/gen';

// Vite 및 Next.js 환경변수 접두사 모두 호환 지원
const API_BASE = (
  import.meta.env.VITE_GEN_API_BASE ||
  import.meta.env.NEXT_PUBLIC_GEN_API_BASE ||
  ''
).replace(/\/$/, '');

const IS_MOCK_ENV =
  import.meta.env.VITE_GEN_MOCK === 'true' ||
  import.meta.env.NEXT_PUBLIC_GEN_MOCK === 'true' ||
  !API_BASE;

export const DETECT_URL =
  import.meta.env.VITE_DETECT_URL ||
  import.meta.env.NEXT_PUBLIC_DETECT_URL ||
  '/video';

// Mock 작업 시뮬레이션용 인메모리 저장소
interface MockJobData {
  createdAt: number;
  templateId: string;
  photoBlob: Blob;
  error?: GenErrorCode;
}
const mockJobs = new Map<string, MockJobData>();

/**
 * 1. 템플릿 영상 목록 조회
 */
export async function fetchTemplates(signal?: AbortSignal): Promise<TemplateVideo[]> {
  if (IS_MOCK_ENV) {
    const res = await fetch('/templates/templates.json', { signal });
    if (!res.ok) throw new Error('템플릿 목록을 불러올 수 없습니다.');
    return res.json();
  }

  const res = await fetch(`${API_BASE}/templates`, { signal });
  if (!res.ok) throw new Error(`템플릿 조회 오류 (HTTP ${res.status})`);
  return res.json();
}

/**
 * 2. 딥페이크 합성 작업 생성 (POST /jobs)
 */
export async function createJob(
  photoBlob: Blob,
  templateId: string,
  mockErrorOverride?: GenErrorCode | null,
  signal?: AbortSignal
): Promise<JobCreateResponse> {
  if (IS_MOCK_ENV) {
    const jobId = `mock_job_${Date.now()}`;
    mockJobs.set(jobId, {
      createdAt: Date.now(),
      templateId,
      photoBlob,
      error: mockErrorOverride || undefined,
    });
    return { job_id: jobId };
  }

  const formData = new FormData();
  formData.append('photo', photoBlob, 'photo.jpg');
  formData.append('template_id', templateId);

  const res = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    body: formData,
    signal,
  });

  if (!res.ok) {
    let errorCode: GenErrorCode = 'INTERNAL';
    let message = `서버 오류 (HTTP ${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson.error_code) errorCode = errJson.error_code;
      if (errJson.message) message = errJson.message;
    } catch { /* JSON parse fallback */ }
    const err = new Error(message) as Error & { code?: string };
    err.code = errorCode;
    throw err;
  }

  return res.json();
}

/**
 * 3. 작업 상태 폴링 (GET /jobs/{id})
 */
export async function getJobStatus(
  jobId: string,
  signal?: AbortSignal
): Promise<JobStatusResponse> {
  if (IS_MOCK_ENV) {
    const job = mockJobs.get(jobId);
    if (!job) {
      return { status: 'error', error_code: 'INTERNAL', message: '작업을 찾을 수 없습니다.' };
    }

    if (job.error) {
      return {
        status: 'error',
        error_code: job.error,
        message: getErrorMessageByCode(job.error),
      };
    }

    const elapsed = (Date.now() - job.createdAt) / 1000;

    // 0~2초: queued, 2~10초: processing (0~100%), 10초 이후: done
    if (elapsed < 2) {
      return { status: 'queued', progress: 0 };
    } else if (elapsed < 10) {
      const progress = Math.min(99, Math.round(((elapsed - 2) / 8) * 100));
      return { status: 'processing', progress };
    } else {
      return {
        status: 'done',
        progress: 100,
        result_url: '/mock/result.mp4',
      };
    }
  }

  const res = await fetch(`${API_BASE}/jobs/${jobId}`, { signal });
  if (!res.ok) {
    throw new Error(`상태 조회 실패 (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * 4. 결과 MP4 Blob 다운로드 (Cross-Origin 지원)
 */
export async function downloadResultBlob(
  resultUrl: string,
  signal?: AbortSignal
): Promise<Blob> {
  const res = await fetch(resultUrl, { signal });
  if (!res.ok) throw new Error('결과 영상을 다운로드할 수 없습니다.');
  return res.blob();
}

/**
 * 5. 작업 및 서버 데이터 삭제 (DELETE /jobs/{id})
 */
export async function deleteJob(jobId: string): Promise<void> {
  if (IS_MOCK_ENV) {
    mockJobs.delete(jobId);
    return;
  }

  try {
    await fetch(`${API_BASE}/jobs/${jobId}`, {
      method: 'DELETE',
    });
  } catch {
    // 삭제 요청 실패는 사용자 흐름을 막지 않음
  }
}

/**
 * 에러 코드별 한국어 친화 문구 반환
 */
export function getErrorMessageByCode(code?: string): string {
  switch (code) {
    case 'FACE_NOT_FOUND':
      return '사진에서 얼굴을 인식하지 못했습니다. 정면을 똑바로 바라보고 다시 촬영해 주세요.';
    case 'MULTIPLE_FACES':
      return '사진에서 2명 이상의 얼굴이 감지되었습니다. 혼자서 다시 촬영해 주세요.';
    case 'SERVER_BUSY':
      return '현재 GPU 합성 대기열이 가득 찼습니다. 잠시 후 다시 시도해 주세요.';
    case 'TIMEOUT':
      return '합성 시간이 오래 걸리고 있습니다 (5분 초과). 잠시 후 다시 시도해 주세요.';
    case 'INTERNAL':
    default:
      return '합성 서버 내부 처리 중 오류가 발생했습니다. 다시 시도해 주세요.';
  }
}

