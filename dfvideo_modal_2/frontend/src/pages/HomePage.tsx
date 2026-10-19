import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="page-container home-page">
      <section className="hero-section">
        <span className="hero-badge">AI 팩트체크 통합 솔루션</span>
        <h1 className="hero-title">허위 정보와 딥페이크로부터<br />진실을 보호합니다</h1>
        <p className="hero-subtitle">
          최첨단 멀티모달 AI 탐지 기술을 활용하여 영상의 얼굴 조작 여부와
          텍스트 허위 정보 사실관계를 신속하고 정확하게 분석합니다.
        </p>
      </section>

      <section className="service-cards-section">
        <h2 className="section-title">분석 서비스 선택</h2>
        <div className="cards-grid">
          {/* 카드 1: 영상 탐지 */}
          <div
            className="feature-card feature-card--video"
            onClick={() => navigate('/video')}
            role="button"
            tabIndex={0}
          >
            <div className="card-top-row">
              <span className="card-icon">🎬</span>
              <span className="badge badge--active">서비스 중</span>
            </div>
            <h3 className="card-title">영상 딥페이크 탐지</h3>
            <p className="card-desc">
              동영상을 업로드하면 초고속 RetinaFace 얼굴 검출과 CLIP/ConvNeXt 기반 앙상블 신경망을 통해 얼굴 합성 및 조작 여부를 프레임별로 정밀 판정합니다.
            </p>
            <div className="card-footer">
              <span className="btn-link">영상 탐지 시작하기 →</span>
            </div>
          </div>

          {/* 카드 2: 텍스트 팩트체크 */}
          <div
            className="feature-card feature-card--text"
            onClick={() => navigate('/text')}
            role="button"
            tabIndex={0}
          >
            <div className="card-top-row">
              <span className="card-icon">📰</span>
              <span className="badge badge--active">서비스 중</span>
            </div>
            <h3 className="card-title">텍스트 팩트체크</h3>
            <p className="card-desc">
              기사, 소셜 미디어 게시글, 메신저 루머 텍스트를 입력하면 신뢰할 수 있는 출처 데이터베이스와 대조하여 진위 여부를 교차 검증합니다.
            </p>
            <div className="card-footer">
              <span className="btn-link">텍스트 탐지 시작하기 →</span>
            </div>
          </div>
        </div>
      </section>

      <section className="info-banner-section">
        <div className="info-banner">
          <h4>💡 딥페이크 탐지 모델 안내</h4>
          <p>
            현재 영상 탐지 모듈은 Modal 클라우드 GPU(T4) 기반의 고성능 v6 모델(3개 시드 앙상블)로 배포되어 서비스되고 있습니다.
          </p>
        </div>
      </section>
    </div>
  );
}

