/// <reference types="vite/client" />

interface TradingViewWidget {
  new (config: TradingViewWidgetConfig): TradingViewWidgetInstance;
}

interface TradingViewWidgetInstance {
  remove: () => void;
}

interface TradingViewWidgetConfig {
  container_id: string;
  autosize: boolean;
  symbol: string;
  interval: string;
  timezone: string;
  theme: 'light' | 'dark';
  style: string;
  locale: string;
  toolbar_bg: string;
  enable_publishing: boolean;
  allow_symbol_change: boolean;
  hide_side_toolbar: boolean;
  hide_top_toolbar: boolean;
  withdateranges: boolean;
  details: boolean;
  hotlist: boolean;
  calendar: boolean;
  studies: string[];
  show_popup_button: boolean;
  backgroundColor: string;
  gridColor: string;
  support_host: string;
}

interface Window {
  TradingView?: {
    widget: TradingViewWidget;
  };
}
