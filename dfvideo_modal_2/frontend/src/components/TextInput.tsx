import { useEffect, useRef, useState } from 'react';

const SAMPLES = [
  ['T2 관련 자료 있음', '특히 제품 불량률은 컨설팅 전 대비 61% 감소(5.7%→2.2%)하는 성과를 거두었으며, 이러한 개선 성과를 인정받아 2025년 일터혁신 우수기업으로 선정되었다.'],
  ['T1 범위 밖 기관', '사업유형은 사회복지 5,663개(27%), 기타 4,782개(22%), 학술·장학 4,459개 (21%), 교육 3,110개(15%), 예술문화 2,152개(10%), 의료 1,152개(5%)임'],
  ['T3 수집 누락', '쿠팡 183개, 네이버 100개, G마켓 105개, 11번가 147개 이 중 17.9%(96개)는 할인행사 종료 다음 날에도 같은 가격이 유지됐고, 2.2%(12개)는 가격이 하락했다.'],
  ['T4 수집창 밖', '이 중 83.5%(353만여 개소)가 1차 정비를 완료(’26.5.22. 기준)해 지난해(’25.6월말 기준 84.9%)보다 빗물받이 정비에 속도를 내고 있다.'],
] as const;

type TextInputProps = {
  onAnalyze: (text: string) => void;
  isAnalyzing: boolean;
  onReset: () => void;
};

export default function TextInput({ onAnalyze, isAnalyzing, onReset }: TextInputProps) {
  const [value, setValue] = useState('');
  const [active, setActive] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const maxHeight = 85;
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [value]);

  const reset = () => {
    setValue('');
    setActive(null);
    onReset();
  };

  const analyze = () => {
    const text = value.trim();
    if (text && !isAnalyzing) onAnalyze(text);
  };

  return (
    <div className="text-input-panel">
      <label htmlFor="text-claim">검토 문장 입력</label>
      <div className="text-input-row">
        <div className="text-field-wrap">
          <textarea
            ref={textareaRef}
            id="text-claim"
            value={value}
            rows={1}
            onChange={(e) => {
              setValue(e.target.value);
              setActive(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                analyze();
              }
            }}
            placeholder="검토할 기사 문장을 입력하세요"
            aria-describedby="text-input-help"
          />
          {value && (
            <button className="text-clear" type="button" onClick={reset} aria-label="입력 및 검색 결과 초기화">
              ×
            </button>
          )}
        </div>
        <button className="btn btn-primary" disabled={!value.trim() || isAnalyzing} onClick={analyze}>
          {isAnalyzing ? '자료 찾는 중…' : '관련 자료 찾기'}
        </button>
      </div>
      <p className="text-input-help" id="text-input-help">Enter로 검색하고 Shift+Enter로 줄바꿈할 수 있습니다.</p>
      <p className="text-hint">자동으로 사실·거짓을 판정하지 않습니다. 입력한 내용과 대조해 볼 수 있는 공식자료를 찾아 보여줍니다.</p>
      <div className="text-samples">
        {SAMPLES.map((sample, i) => (
          <button
            type="button"
            key={sample[0]}
            className={active === i ? 'active' : ''}
            onClick={() => {
              const text = sample[1];
              setValue(text);
              setActive(i);
  
              if (!isAnalyzing) {
                onAnalyze(text);
              }
            }}
          >
            {sample[0]}
          </button>
        ))}
      </div>
    </div>
  );
}
