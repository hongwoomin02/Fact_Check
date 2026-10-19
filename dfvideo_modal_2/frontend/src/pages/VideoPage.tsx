import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import VideoUploader from '../components/VideoUploader';
import VideoAnalysisResult from '../components/VideoAnalysisResult';
import type { AnalysisState } from '../types/video';
import { predictVideo } from '../services/videoApi';

const INITIAL_STATE: AnalysisState = {
  status: 'idle',
  result: null,
  error: null,
  elapsedMs: null,
};

export default function VideoPage() {
  const location = useLocation();
  const autoLoadFile = (location.state as { autoLoadFile?: File })?.autoLoadFile || null;
  const [state, setState] = useState<AnalysisState>(INITIAL_STATE);

  const handleReset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const handleAnalyze = useCallback(async (file: File, signal: AbortSignal) => {
    setState({
      status: 'uploading',
      result: null,
      error: null,
      elapsedMs: null,
    });

    try {
      const { result, elapsedMs } = await predictVideo(file, signal);
      setState({
        status: 'done',
        result,
        error: null,
        elapsedMs,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setState({
        status: 'error',
        result: null,
        error: errorMessage,
        elapsedMs: null,
      });
    }
  }, []);

  return (
    <div className="page-container video-page">
      <div className="page-header">
        <h1 className="page-title">🎬 영상 딥페이크 탐지</h1>
        <p className="page-description">
          영상을 업로드하면 AI가 10개 프레임에서 얼굴 영역을 추출하고,
          v6 앙상블 신경망을 통해 딥페이크 여부(REAL / FAKE)를 정밀 분석합니다.
        </p>
      </div>

      {/* 영상 업로드 컴포넌트 */}
      <VideoUploader
        onAnalyze={handleAnalyze}
        isAnalyzing={state.status === 'uploading'}
        onReset={handleReset}
        initialFile={autoLoadFile}
      />

      {/* 오류 메시지 박스 */}
      {state.status === 'error' && state.error && (
        <div className="error-alert-box">
          <div className="error-alert-header">
            <span className="error-icon">❌</span>
            <strong>분석 실패 안내</strong>
          </div>
          <p className="error-alert-message">{state.error}</p>
          <div className="error-alert-help">
            <p>※ 권장 해결 방법:</p>
            <ul>
              <li>파일 확장자가 MP4, MOV, WEBM 등 일반 동영상 포맷인지 확인해 주세요.</li>
              <li>파일이 손상되지 않았는지 다른 재생기로 확인해 주세요.</li>
              <li>서버 Cold Start 상태인 경우 처음 1회는 다소 시간이 걸릴 수 있습니다. 잠시 후 다시 시도해 주세요.</li>
            </ul>
          </div>
        </div>
      )}

      {/* 분석 결과 컴포넌트 */}
      {state.status === 'done' && state.result && state.elapsedMs !== null && (
        <VideoAnalysisResult result={state.result} elapsedMs={state.elapsedMs} />
      )}
    </div>
  );
}

