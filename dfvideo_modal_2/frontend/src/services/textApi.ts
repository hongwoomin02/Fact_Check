import { CLAIM_KINDS, type ClaimComponents, type NormalizedTextResult, type TextEvidence, type TextPredictResponse } from '../types/text';

const API_TIMEOUT_MS = 60_000;
const NUM = /\d{1,3}(?:,\d{3})+\s*(?:만|억|조)?\s*(?:원|명|개|건|가구|대|톤|달러|불)?|\d+(?:\.\d+)?\s*(?:억|조|만)\s*(?:원|명|개|가구|달러|불)?|\d+(?:\.\d+)?\s*[%％](?:\s*p)?|\d+(?:\.\d+)?\s*(?:명|개|건|가구|곳|개소|배|점|차례|회|종|ha|㎡|㎞|km|mg|도)/g;
const PER = /['’]?\d{2,4}\s*년\s*\d{1,2}\s*월(?:\s*\d{1,2}\s*일)?|\d{4}\s*년(?:도)?|['’]\d{2}\s*\.\s*\d{1,2}(?:\s*\.\s*\d{1,2})?|\d{1,2}\s*월\s*\d{1,2}\s*일|제?\s*\d\s*분기|상반기|하반기/g;
const TGT = /[「『"“']([^」』"”']{2,30})[」』"”']|([가-힣A-Za-z0-9·\-]{2,20}(?:제도|사업|센터|위원회|기금|법|협약|지원금|계획|정책|서비스))/g;
const uniq = (a: string[]) => [...new Set(a.map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean))];
const nz = (s: string) => String(s).normalize('NFKC').replace(/[\s,]/g, '');

function extractComponents(claim: string): ClaimComponents {
  const targets: string[] = []; let m: RegExpExecArray | null; TGT.lastIndex = 0;
  while ((m = TGT.exec(claim))) targets.push(m[1] || m[2]);
  return { 수치: uniq(claim.match(NUM) || []).slice(0, 8), 기간: uniq(claim.match(PER) || []).slice(0, 5), 대상: uniq(targets).slice(0, 5) };
}
function decodeEntities(text: string) { const el = document.createElement('textarea'); el.innerHTML = text; return el.value; }
function cleanSourceText(raw = '') {
  let text = String(raw).replace(/\\(?=<\/?[a-zA-Z])/g, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr)>/gi, '\n').replace(/<\/t[dh]>/gi, ' ').replace(/<t[dh][^>]*>/gi, '').replace(/<[^>]*>/g, '');
  text = decodeEntities(text); if (/&(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);/.test(text)) text = decodeEntities(text);
  return text.replace(/\\+/g, '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function compare(comps: ClaimComponents, chunk: string) {
  const hay = nz(chunk); const matched = {} as ClaimComponents; const missing = {} as ClaimComponents; let hit = 0; let total = 0;
  for (const k of CLAIM_KINDS) { const items = comps[k] || []; matched[k] = items.filter(x => nz(x) && hay.includes(nz(x))); missing[k] = items.filter(x => !matched[k].includes(x)); hit += matched[k].length; total += items.length; }
  return { matched, missing, hit, total };
}
function basisOf(src?: string) { const map: Record<string,string> = { regex:'원문 본문에서 추출', content_regex:'원문 본문에서 추출', unverified:'날짜 출처 항목 미확인', generic:'크롤링 시점 (신뢰 낮음)' }; return map[String(src || '').toLowerCase()] || src || '출처 미확인'; }
function normalize(j: TextPredictResponse, claim: string): NormalizedTextResult {
  const comps = j.claim_components || extractComponents(claim); const seen = new Set<string>();
  const evidence = (j.evidence || []).map((e,i) => ({...e, rank:e.rank ?? i+1})).filter(e => { const url=(e.url||'').trim().toLowerCase(); const key=url ? `url:${url}` : `doc:${(e.source||'').trim().toLowerCase()}|${(e.title||'').trim().toLowerCase()}`; if(seen.has(key)) return false; seen.add(key); return true; }).map((e: TextEvidence) => { const display_text=cleanSourceText(e.chunk_text || e.display_text || ''); const c=(!e.matched || !e.coverage) ? compare(comps,display_text) : null; return {...e, display_text, matched:e.matched || c?.matched, missing:e.missing || c?.missing, coverage:e.coverage || (c ? {hit:c.hit,total:c.total}:undefined), date_basis:e.date_basis || basisOf(e.date_source)}; });
  evidence.sort((a,b)=>(b.coverage?.hit ?? 0)-(a.coverage?.hit ?? 0) || (a.rank ?? 0)-(b.rank ?? 0));
  return { status:j.status || j.result || 'insufficient_material', claim, comps, evidence, scope:j.scope, research:j.research, message:j.message };
}
export async function analyzeText(sentence: string, signal?: AbortSignal) {
  const base=(import.meta.env.VITE_TEXT_API_BASE_URL || '/api/text').replace(/\/$/,''); const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),API_TIMEOUT_MS); signal?.addEventListener('abort',()=>controller.abort(),{once:true});
  try { const response=await fetch(`${base}/predict`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sentence}),signal:controller.signal}); const body:TextPredictResponse=await response.json(); if(!response.ok || body.error) throw new Error(body.error || `서버 오류 (HTTP ${response.status})`); return normalize(body,sentence); }
  catch(err){ if(err instanceof DOMException && err.name==='AbortError') throw new Error(signal?.aborted ? '분석 요청이 취소되었습니다.' : '요청 시간이 초과되었습니다 (60초).'); if(err instanceof TypeError) throw new Error('텍스트 API 서버에 연결할 수 없습니다. 프록시 또는 서버 설정을 확인해 주세요.'); throw err; } finally { clearTimeout(timeout); }
}
