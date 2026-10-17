export type VideoVerdict = 'REAL' | 'FAKE' | 'UNKNOWN';

export interface VideoFrame {
  frame_index: number;
  time_sec: number | null;
  status: string;           // 'ok', 'no_face', 'read_fail'
  face_detected: boolean;
  bbox: number[] | null;
  margin: number | null;
  verdict: 'REAL' | 'FAKE' | null;
  crop_jpeg_base64?: string;
}

export interface TimingMs {
  decode_detect_crop: number;
  model: number;
  total: number;
}

export interface VideoPredictResponse {
  api_version: string;
  model: string;
  n_seeds: number;
  device: string;
  video: string;
  n_frames_total: number;
  fps: number;
  n_frames_sampled: number;
  n_frames_used: number;
  threshold: number;
  verdict: VideoVerdict;
  video_margin: number | null;
  seed_margins: number[] | null;
  fake_score_display: number | null;
  frames: VideoFrame[];
  warnings: string[];
  timing_ms: TimingMs;
}

export interface AnalysisState {
  status: 'idle' | 'uploading' | 'done' | 'error';
  result: VideoPredictResponse | null;
  error: string | null;
  elapsedMs: number | null;   // 브라우저 측정 HTTP 왕복 시간
}

