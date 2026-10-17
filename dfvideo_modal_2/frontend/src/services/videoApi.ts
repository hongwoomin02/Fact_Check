import type { VideoPredictResponse } from '../types/video';

const API_TIMEOUT_MS = 180_000;

export interface PredictResult {
  result: VideoPredictResponse;
  elapsedMs: number;
}

export async function predictVideo(
  file: File,
  signal?: AbortSignal
): Promise<PredictResult> {
  const baseUrl = (import.meta.env.VITE_VIDEO_API_BASE_URL || '/api/video').replace(/\/$/, '');
  const url = `${baseUrl}/predict?return_frames=true`;

  const formData = new FormData();
  formData.append('file', file);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  const t0 = performance.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    const elapsedMs = Math.round(performance.now() - t0);
    clearTimeout(timeoutId);

    if (!response.ok) {
      let message = `서버 오류 (HTTP ${response.status})`;
      try {
        const body = await response.json();
        if (body.detail) {
          // 서버 내부 임시 파일 경로(/tmp/...) 숨기기
          const sanitized = String(body.detail).replace(/\/tmp\/[^\s'"]+/g, '(영상 파일)');
          message = sanitized;
        }
      } catch {
        // JSON 파싱 실패 시 기본 메시지 유지
      }

      if (response.status === 400) {
        throw new Error(`영상 파일을 열 수 없거나 처리할 수 없습니다. 형식이나 파일 손상 여부를 확인해 주세요. (${message})`);
      }
      throw new Error(message);
    }

    const result: VideoPredictResponse = await response.json();
    return { result, elapsedMs };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (signal?.aborted) {
        throw new Error('사용자에 의해 분석 요청이 취소되었습니다. (참고: 이미 서버에 전달된 작업은 서버에서 계속 실행될 수 있습니다)');
      }
      throw new Error('요청 시간이 초과되었습니다 (180초). 영상 길이가 길거나 서버 Cold Start 상태일 수 있습니다. 잠시 후 다시 시도해 주세요.');
    }
    if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
      throw new Error('API 서버에 연결할 수 없습니다. 네트워크 연결 또는 Modal API 프록시 설정을 확인해 주세요.');
    }
    throw err;
  }
}

