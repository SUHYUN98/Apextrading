import type { LocalizedText } from '@/i18n/types';
import type { SectorId } from '@/types/surge';

export interface StockListing {
  symbol: string;
  name: LocalizedText;
  sector: SectorId;
}

// Yahoo suffixes: .KS = KOSPI, .KQ = KOSDAQ
export const STOCK_UNIVERSE: StockListing[] = [
  { symbol: '005930.KS', name: { KR: '삼성전자', EN: 'Samsung Electronics' }, sector: 'semi' },
  { symbol: '000660.KS', name: { KR: 'SK하이닉스', EN: 'SK Hynix' }, sector: 'semi' },
  { symbol: '042700.KS', name: { KR: '한미반도체', EN: 'Hanmi Semiconductor' }, sector: 'semi' },
  { symbol: '247540.KQ', name: { KR: '에코프로비엠', EN: 'EcoPro BM' }, sector: 'battery' },
  { symbol: '003670.KS', name: { KR: '포스코퓨처엠', EN: 'POSCO Future M' }, sector: 'battery' },
  { symbol: '066970.KQ', name: { KR: '엘앤에프', EN: 'L&F' }, sector: 'battery' },
  { symbol: '068270.KS', name: { KR: '셀트리온', EN: 'Celltrion' }, sector: 'bio' },
  { symbol: '196170.KQ', name: { KR: '알테오젠', EN: 'Alteogen' }, sector: 'bio' },
  { symbol: '028300.KQ', name: { KR: '에이치엘비', EN: 'HLB' }, sector: 'bio' },
  { symbol: '035420.KS', name: { KR: '네이버', EN: 'NAVER' }, sector: 'platform' },
  { symbol: '035720.KS', name: { KR: '카카오', EN: 'Kakao' }, sector: 'platform' },
  { symbol: '259960.KS', name: { KR: '크래프톤', EN: 'Krafton' }, sector: 'platform' },
  { symbol: '005380.KS', name: { KR: '현대차', EN: 'Hyundai Motor' }, sector: 'auto' },
  { symbol: '000270.KS', name: { KR: '기아', EN: 'Kia' }, sector: 'auto' },
  { symbol: 'NVDA', name: { KR: '엔비디아', EN: 'NVIDIA' }, sector: 'semi' },
  { symbol: 'AMD', name: { KR: 'AMD', EN: 'AMD' }, sector: 'semi' },
  { symbol: 'AVGO', name: { KR: '브로드컴', EN: 'Broadcom' }, sector: 'semi' },
  { symbol: 'AAPL', name: { KR: '애플', EN: 'Apple' }, sector: 'platform' },
  { symbol: 'MSFT', name: { KR: '마이크로소프트', EN: 'Microsoft' }, sector: 'platform' },
  { symbol: 'META', name: { KR: '메타', EN: 'Meta' }, sector: 'platform' },
  { symbol: 'PLTR', name: { KR: '팔란티어', EN: 'Palantir' }, sector: 'platform' },
  { symbol: 'TSLA', name: { KR: '테슬라', EN: 'Tesla' }, sector: 'auto' },
  { symbol: 'RIVN', name: { KR: '리비안', EN: 'Rivian' }, sector: 'auto' },
  { symbol: 'MRNA', name: { KR: '모더나', EN: 'Moderna' }, sector: 'bio' },
  { symbol: 'LLY', name: { KR: '일라이릴리', EN: 'Eli Lilly' }, sector: 'bio' },
];

export const CRYPTO_TOP_N = 50;

export const MAJOR_CRYPTO_BASES = new Set(['BTC', 'ETH', 'SOL', 'XRP', 'BNB']);

// Known coin names; other coins display their ticker in both languages
export const CRYPTO_NAMES: Record<string, LocalizedText> = {
  BTC: { KR: '비트코인', EN: 'Bitcoin' },
  ETH: { KR: '이더리움', EN: 'Ethereum' },
  SOL: { KR: '솔라나', EN: 'Solana' },
  XRP: { KR: '리플', EN: 'XRP' },
  BNB: { KR: '바이낸스코인', EN: 'BNB' },
  DOGE: { KR: '도지코인', EN: 'Dogecoin' },
  PEPE: { KR: '페페', EN: 'Pepe' },
  WIF: { KR: '도그위프햇', EN: 'dogwifhat' },
  AVAX: { KR: '아발란체', EN: 'Avalanche' },
  LINK: { KR: '체인링크', EN: 'Chainlink' },
  ARB: { KR: '아비트럼', EN: 'Arbitrum' },
  SUI: { KR: '수이', EN: 'Sui' },
  INJ: { KR: '인젝티브', EN: 'Injective' },
  RNDR: { KR: '렌더', EN: 'Render' },
  ADA: { KR: '카르다노', EN: 'Cardano' },
  TRX: { KR: '트론', EN: 'TRON' },
  TON: { KR: '톤코인', EN: 'Toncoin' },
  NEAR: { KR: '니어프로토콜', EN: 'NEAR Protocol' },
  APT: { KR: '앱토스', EN: 'Aptos' },
  OP: { KR: '옵티미즘', EN: 'Optimism' },
};
