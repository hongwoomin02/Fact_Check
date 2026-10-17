import type { VideoPredictResponse } from '../types/video';
import FrameGallery from './FrameGallery';

interface Props {
  result: VideoPredictResponse;
  elapsedMs: number;
}

export default function VideoAnalysisResult({ result, elapsedMs }: Props) {
  const verdictTextMap: Record<string, { label: string; desc: string; className: string }> = {
    REAL: {
      label: '진본 영상 (REAL)',
      desc: '얼굴 조작(딥페이크) 특징이 감지되지 않았습니다.',
      className: 'verdict-badge--real',
    },
    FAKE: {
      label: '조작 의심 영상 (FAKE)',
      desc: '얼굴 영역에서 딥페이크 합성 패턴이 감지되었습니다.',
      className: 'verdict-badge--fake',
    },
    UNKNOWN: {
      label: '판정 불가 (UNKNOWN)',
      desc: '얼굴이 감지되지 않았거나 프레임 분석 데이터가 부족합니다.',
      className: 'verdict-badge--unknown',
    },
  };

  const verdictInfo = verdictTextMap[result.verdict] || verdictTextMap.UNKNOWN;

  return (
    <div className="analysis-result">
      {/* 1. 상단 종합 판정 배너 */}
      <div className={`verdict-banner ${verdictInfo.className}`}>
        <div className="verdict-banner-header">
          <span className="verdict-status-title">분석 결과</span>
          <h2 className="verdict-main-title">{verdictInfo.label}</h2>
        </div>
        <p className="verdict-sub-desc">{verdictInfo.desc}</p>
      </div>

      {/* 2. 핵심 수치 요약 카드 그리드 */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">영상 판정 점수 (Margin)</span>
          <span className="metric-value">
            {result.video_margin !== null ? result.video_margin.toFixed(4) : '-'}
          </span>
          <span className="metric-hint">
            기준치 0.0 (0 미만: FAKE, 0 이상: REAL)
            <br />
            ※ 단순 백분율 확률이 아닌 앙상블 로짓 마진 값입니다.
          </span>
        </div>

        <div className="metric-card">
          <span className="metric-label">얼굴 분석 프레임</span>
          <span className="metric-value">
            {result.n_frames_used} / {result.n_frames_sampled} 프레임
          </span>
          <span className="metric-hint">
            전체 {result.n_frames_total} 프레임 중 10프레임 균등 추출
          </span>
        </div>

        <div className="metric-card">
          <span className="metric-label">소요 시간 비교</span>
          <div className="time-comparison">
            <div>
              <span className="time-sub-label">서버 내부 연산:</span>
              <strong className="time-sub-val">{result.timing_ms.total.toLocaleString()} ms</strong>
            </div>
            <div>
              <span className="time-sub-label">브라우저 전체 왕복:</span>
              <strong className="time-sub-val">{elapsedMs.toLocaleString()} ms</strong>
            </div>
          </div>
          <span className="metric-hint">
            브라우저 시간은 영상 업로드 + 네트워크 왕복이 포함되어 서버 시간보다 깁니다.
          </span>
        </div>

        <div className="metric-card">
          <span className="metric-label">탐지 모델 정보</span>
          <span className="metric-value">
            {result.model} ({result.n_seeds}개 시드 앙상블)
          </span>
          <span className="metric-hint">
            디바이스: {result.device} · API v{result.api_version}
          </span>
        </div>
      </div>

      {/* 3. 경고 메시지 섹션 */}
      {result.warnings && result.warnings.length > 0 && (
        <div className="warnings-box">
          <h4 className="warnings-title">⚠️ 안내 및 유의사항</h4>
          <ul className="warnings-list">
            {result.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. 프레임별 상세 검토 갤러리 */}
      <FrameGallery frames={result.frames} />
    </div>
  );
}

