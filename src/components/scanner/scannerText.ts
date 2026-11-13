import type { LocalizedText } from '@/i18n/types';
import type { ExchangeId } from '@/services/scanner/types';
import type { ScannerSkipReason } from '@/types/scanner';

export const SCANNER_TEXT = {
  title: { KR: '신호 스캐너', EN: 'Signal Scanner' },
  subtitle: {
    KR: '바이낸스와 바이비트 USDT 무기한 선물에서 급변동, 추세전환, 추세지속 신호를 찾습니다. 완료된 캔들만 사용합니다.',
    EN: 'Finds volatility breakouts, trend reversals and trend continuations across Binance and Bybit USDT perpetuals. Only completed candles are used.',
  },
  scanNow: { KR: '지금 스캔', EN: 'Scan now' },
  scanning: { KR: '스캔 중...', EN: 'Scanning...' },
  scanningBody: { KR: '거래소에서 캔들 데이터를 가져오는 중입니다.', EN: 'Fetching candle data from the exchanges.' },
  updatedAt: { KR: '마지막 스캔', EN: 'Last scan' },
  autoRefresh: { KR: '1분마다 자동 갱신', EN: 'Auto-refreshes every minute' },
  settings: { KR: '탐지 설정', EN: 'Detection settings' },
  settingsApply: { KR: '적용 후 스캔', EN: 'Apply and scan' },
  timeframe: { KR: '타임프레임', EN: 'Timeframe' },
  scanned: { KR: '스캔한 종목', EN: 'Scanned' },
  signals: { KR: '발견한 신호', EN: 'Signals' },
  excluded: { KR: '제외된 종목', EN: 'Excluded' },
  excludedBreakdown: { KR: '제외 사유', EN: 'Exclusion reasons' },
  filterKind: { KR: '탐지 유형', EN: 'Type' },
  filterExchange: { KR: '거래소', EN: 'Exchange' },
  filterDirection: { KR: '방향', EN: 'Direction' },
  all: { KR: '전체', EN: 'All' },
  volatility: { KR: '급변동', EN: 'Volatility' },
  reversal: { KR: '추세전환', EN: 'Reversal' },
  continuation: { KR: '추세지속', EN: 'Continuation' },
  volatilityHint: {
    KR: '압축 후 거래량을 동반한 20봉 고점·저점 돌파',
    EN: 'Breakout of the 20-bar range after compression, with volume',
  },
  reversalHint: {
    KR: '다이버전스와 구조 이탈로 추세 방향이 바뀌는 자리',
    EN: 'Divergence and structure break suggesting the trend is turning',
  },
  continuationHint: {
    KR: '정렬된 추세에서 눌림 후 재진입하는 자리',
    EN: 'Aligned trend with a pullback and recovery',
  },
  long: { KR: '롱', EN: 'Long' },
  short: { KR: '숏', EN: 'Short' },
  undetermined: { KR: '방향 미확정', EN: 'Undetermined' },
  score: { KR: '점수', EN: 'Score' },
  signalCandle: { KR: '신호 캔들', EN: 'Signal candle' },
  price: { KR: '현재가', EN: 'Price' },
  readings: { KR: '주요 지표', EN: 'Key indicators' },
  evidence: { KR: '신호 근거', EN: 'Why it triggered' },
  noEvidence: { KR: '뚜렷한 근거 항목이 없습니다', EN: 'No strong evidence items' },
  invalidation: { KR: '무효화 조건', EN: 'Invalidation' },
  openChart: { KR: '차트 열기', EN: 'Open chart' },
  signalList: { KR: '신호 목록', EN: 'Signal list' },
  emptyTitle: { KR: '조건에 맞는 신호가 없습니다', EN: 'No signals match right now' },
  emptyBody: {
    KR: '필터를 바꾸거나 설정의 기준 점수를 낮춰 보세요.',
    EN: 'Try changing the filters or lowering a score cutoff in settings.',
  },
  errorTitle: { KR: '스캔을 완료하지 못했습니다', EN: 'The scan could not finish' },
  errorBody: {
    KR: '인터넷 연결과 거래소 상태를 확인한 뒤 다시 스캔해 주세요.',
    EN: 'Check your connection and the exchange status, then scan again.',
  },
  exchangeError: {
    KR: '시장 목록을 불러오지 못해 이 거래소는 제외되었습니다',
    EN: 'Market list could not be loaded, so this exchange was skipped',
  },
} satisfies Record<string, LocalizedText>;

export type ScannerTextKey = keyof typeof SCANNER_TEXT;

export const EXCHANGE_NAME: Record<ExchangeId, string> = { binance: 'Binance', bybit: 'Bybit' };

export const SKIP_REASON_TEXT: Record<ScannerSkipReason, LocalizedText> = {
  'low-volume': { KR: '24시간 거래대금 미달', EN: 'Below 24h volume' },
  'unknown-spread': { KR: '호가 스프레드 확인 불가', EN: 'Spread unavailable' },
  'wide-spread': { KR: '호가 스프레드 초과', EN: 'Spread too wide' },
  'unknown-listing': { KR: '상장일 확인 불가', EN: 'Listing date unknown' },
  'new-listing': { KR: '상장 기간 부족', EN: 'Listed too recently' },
  'fetch-failed': { KR: '캔들 데이터 수신 실패', EN: 'Candle fetch failed' },
  'data-issue': { KR: '데이터 이상으로 신호 보류', EN: 'Held due to data issues' },
  'short-history': { KR: '완료 캔들 부족', EN: 'Not enough completed candles' },
};
