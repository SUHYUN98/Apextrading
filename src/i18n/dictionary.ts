import type { Lang } from '@/i18n/types';

// EN must mirror KR's shape; the type annotation on `en` enforces that every key exists in both.
const ko = {
  locale: 'ko-KR',
  nav: { chart: '차트 분석', surge: '거래량 급등', scanner: '신호 스캐너' },
  languageToggle: '언어 전환',
  format: {
    krwPrice: (text: string) => `${text}원`,
    tradingValue: (eok: number) => `${eok.toLocaleString('ko-KR')}억 원`,
  },
  surge: {
    title: '거래량 급등 스크리너',
    subtitle: '직전 캔들 대비 거래량이 급증한 종목과 코인, 그리고 주도 섹터를 한눈에 찾아보세요',
    status: {
      loading: '연결 중...',
      live: '🟢 Live API Connected',
      simulated: '⚡ Live Simulation Active (CORS-Safe)',
      error: '연결 오류 · 표시할 데이터 없음',
    },
    guide: {
      toggle: '사용법 및 가이드',
      overviewTitle: '개요',
      overview:
        '단기간에 거래량이 급증한 종목과 코인을 찾아, 시장을 주도하는 섹터와 모멘텀 자산을 빠르게 파악하는 도구입니다. 거래량은 가격보다 먼저 움직이는 경우가 많아 관심이 몰리기 시작한 자산을 일찍 발견하는 데 도움이 됩니다.',
      filtersTitle: '필터 사용법',
      filters: [
        {
          name: '상대 거래량 (RVOL)',
          body: 'RVOL은 현재 거래량을 직전 20캔들 평균과 비교한 배율입니다. 3.2x라면 현재 봉의 거래량이 평균의 3.2배라는 뜻이며, 기본값 2.5x 이상은 평소보다 뚜렷하게 활발한 자산만 보여줍니다.',
        },
        {
          name: '최소 거래대금 (유동성)',
          body: '거래대금이 작은 자산은 호가가 얇아 적은 자금으로도 가격이 크게 튀고, 금방 되돌아가는 함정(휩쏘)에 걸리기 쉽습니다. 50억 원 이상처럼 기준을 정해 두면 실제 자금이 많이 오가는 자산에 집중할 수 있습니다.',
        },
        {
          name: '등락률 범위',
          body: '이미 급락 중인 자산(투매)이나 과도하게 오른 자산(고점 추격 위험)을 걸러냅니다. 기본 범위인 -20% ~ +50%는 급락 자산과 과열 자산을 함께 걸러내면서도 상승 초입과 반등 흐름을 넓게 보여줍니다. 슬라이더는 -100% ~ +100%까지 0.5% 단위로 조정할 수 있습니다.',
        },
      ],
      tipsTitle: '활용 팁',
      tips: [
        '검색창에 티커나 이름을 입력하면 전체 자산에서 원하는 종목이나 코인을 바로 찾을 수 있습니다.',
        '상위 노출 개수를 5 또는 10으로 좁히고 RVOL 순으로 보면 지금 가장 강하게 움직이는 주도 자산이 드러납니다.',
        '섹터 배지를 눌러 거래량이 어느 섹터에 몰리는지 확인하고, 같은 섹터 자산들이 함께 움직이는지 살펴보세요.',
        '필터를 여러 개 동시에 조이면 결과가 빠르게 줄어듭니다. 결과가 너무 적다면 한 가지 조건부터 풀어 보세요.',
        '이 화면의 시세와 거래량은 공개 시장 데이터를 기반으로 하며 지연될 수 있습니다. 실제 투자 판단 전에는 차트와 공시 등 다른 정보를 함께 확인하세요.',
      ],
    },
    controls: {
      panelTitle: '필터 설정',
      reset: '필터 초기화 (Reset)',
      search: {
        label: '통합 검색',
        placeholder: '종목명, 티커, 코인명 검색 (예: BTC, 삼성, Tesla)',
        clear: '검색어 지우기',
        results: (count: number) => `검색 결과 ${count}개`,
      },
      timeframe: {
        label: '타임프레임',
        options: { '15m': '15분봉', '1h': '1시간봉', '4h': '4시간봉', '1D': '1일봉' },
      },
      rvol: {
        label: '상대 거래량 (RVOL)',
        tooltip: '직전 20캔들 평균 대비 거래량 배율',
        atLeast: (text: string) => `${text} 이상`,
      },
      liquidity: {
        label: '최소 거래대금',
        all: '전체',
        atLeast: (text: string) => `${text} 이상`,
        presets: [
          { value: 10, label: '전체' },
          { value: 50, label: '50억+' },
          { value: 100, label: '100억+' },
          { value: 300, label: '300억+' },
          { value: 500, label: '500억+' },
        ],
      },
      change: {
        label: '등락률 범위',
        lowThumb: '등락률 하한',
        highThumb: '등락률 상한',
      },
    },
    sectorBar: {
      title: '섹터별 거래량 집중도',
      all: '전체',
      total: (count: number) => `총 ${count}종목`,
      badge: (count: number, avgRvol: string) => `${count}종목 · 평균 RVOL ${avgRvol}x`,
      empty: '조건에 맞는 섹터가 없습니다',
    },
    assetClass: { stock: '주식', crypto: '코인' },
    market: {
      label: '시장 선택',
      tabs: { stock: '주식 시장 (Stocks)', crypto: '암호화폐 시장 (Crypto)' },
      ranking: { stock: '주식 급등 랭킹', crypto: '코인 급등 랭킹' },
    },
    sectors: {
      semi: 'AI/반도체',
      battery: '2차전지',
      bio: '바이오',
      platform: '플랫폼/인터넷',
      auto: '자동차/모빌리티',
      cryptoMajor: '메이저 코인',
      cryptoAlt: '알트코인/밈',
    },
    table: {
      shown: (count: number) => `${count}개 표시`,
      topN: {
        label: '상위 노출',
        option: (n: number) => `상위 ${n}개`,
      },
      columns: {
        rank: '순위',
        name: '종목명 / 티커',
        sector: '섹터',
        price: '현재가 및 변동률(%)',
        tradingValue: '거래대금',
        rvol: '상대 거래량 (RVOL)',
        volumeChange: '직전 봉 대비 거래량 증가율(%)',
      },
      empty: '조건에 맞는 자산이 없습니다',
      emptyHint: '필터 범위를 넓히거나 초기화해 보세요',
    },
  },
};

const en: typeof ko = {
  locale: 'en-US',
  nav: { chart: 'Chart Analysis', surge: 'Volume Surge', scanner: 'Signal Scanner' },
  languageToggle: 'Switch language',
  format: {
    krwPrice: (text: string) => `₩${text}`,
    tradingValue: (eok: number) => `${(eok / 100).toFixed(2)}B KRW`,
  },
  surge: {
    title: 'Volume Surge Screener',
    subtitle: 'Spot stocks and coins whose volume is spiking versus the previous candle, and the sectors leading the move.',
    status: {
      loading: 'Connecting...',
      live: '🟢 Live API Connected',
      simulated: '⚡ Live Simulation Active (CORS-Safe)',
      error: 'Connection error · no data to show',
    },
    guide: {
      toggle: 'User Guide',
      overviewTitle: 'Overview',
      overview:
        'This screener finds stocks and coins whose volume has surged over a short window, helping you identify leading sectors and momentum assets quickly. Volume often moves before price, so it helps you spot assets that are attracting attention early.',
      filtersTitle: 'How to use the filters',
      filters: [
        {
          name: 'Relative Volume (RVOL)',
          body: 'RVOL compares current volume with the average of the previous 20 candles. An RVOL of 3.2x means the current candle is trading 3.2 times its recent average. The 2.5x default shows only assets that are clearly more active than usual.',
        },
        {
          name: 'Minimum Trading Value (Liquidity)',
          body: 'Assets with small trading value have thin order books, so a little money can move the price sharply and then reverse quickly, creating whipsaw traps. Setting a floor such as 5B KRW keeps you focused on assets where real money is changing hands.',
        },
        {
          name: 'Price Change Range',
          body: 'Filters out assets in a dump (forced selling) or already overextended after a big spike, where chasing carries high risk. The default -20% to +50% range keeps sharp dumps and overheated spikes out while still showing early trend moves. The slider covers -100% to +100% in 0.5% steps.',
        },
      ],
      tipsTitle: 'Trading tips',
      tips: [
        'Type a ticker or name in the search bar to jump straight to a specific stock or coin across the full list.',
        'Narrow the list to Top 5 or Top 10 and sort by RVOL to see which leaders are moving hardest right now.',
        'Tap a sector badge to see where volume is concentrating, then check whether the other assets in that sector move together.',
        'Stacking several tight filters shrinks results fast. If you see too few matches, loosen one condition at a time.',
        'Prices and volumes come from public market feeds and may be delayed. Check charts, news, and filings before making any real trading decision.',
      ],
    },
    controls: {
      panelTitle: 'Filter settings',
      reset: 'Reset filters',
      search: {
        label: 'Global search',
        placeholder: 'Search name, ticker, or coin (e.g. BTC, Samsung, Tesla)',
        clear: 'Clear search',
        results: (count: number) => `${count} results`,
      },
      timeframe: {
        label: 'Timeframe',
        options: { '15m': '15m', '1h': '1h', '4h': '4h', '1D': '1D' },
      },
      rvol: {
        label: 'Relative Volume (RVOL)',
        tooltip: 'Volume vs. previous 20-candle average',
        atLeast: (text: string) => `${text}+`,
      },
      liquidity: {
        label: 'Minimum trading value',
        all: 'All',
        atLeast: (text: string) => `${text}+`,
        presets: [
          { value: 10, label: 'All' },
          { value: 50, label: '0.5B+' },
          { value: 100, label: '1B+' },
          { value: 300, label: '3B+' },
          { value: 500, label: '5B+' },
        ],
      },
      change: {
        label: 'Price change range',
        lowThumb: 'Price change minimum',
        highThumb: 'Price change maximum',
      },
    },
    sectorBar: {
      title: 'Sector volume concentration',
      all: 'All',
      total: (count: number) => `${count} total`,
      badge: (count: number, avgRvol: string) => `${count} assets · Avg RVOL ${avgRvol}x`,
      empty: 'No sectors match these filters',
    },
    assetClass: { stock: 'Stock', crypto: 'Crypto' },
    market: {
      label: 'Select market',
      tabs: { stock: 'Stocks', crypto: 'Crypto' },
      ranking: { stock: 'Stock volume surge ranking', crypto: 'Crypto volume surge ranking' },
    },
    sectors: {
      semi: 'AI/Semiconductors',
      battery: 'Batteries',
      bio: 'Biotech',
      platform: 'Platforms/Internet',
      auto: 'Autos/Mobility',
      cryptoMajor: 'Major Crypto',
      cryptoAlt: 'Altcoins & Memes',
    },
    table: {
      shown: (count: number) => `${count} shown`,
      topN: {
        label: 'Show top',
        option: (n: number) => `Top ${n}`,
      },
      columns: {
        rank: 'Rank',
        name: 'Name / Ticker',
        sector: 'Sector',
        price: 'Price & change (%)',
        tradingValue: 'Trading value',
        rvol: 'Relative volume (RVOL)',
        volumeChange: 'Volume change vs. prev. candle (%)',
      },
      empty: 'No assets match these filters',
      emptyHint: 'Widen the filter ranges or reset them.',
    },
  },
};

export const DICTIONARY: Record<Lang, typeof ko> = { KR: ko, EN: en };
