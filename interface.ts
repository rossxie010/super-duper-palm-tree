// types.ts
export interface User {
  user_id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface Stock {
  stock_id: number;
  symbol: string;
  company_name: string;
  exchange: string;
  currency: string;
  current_price?: number;
  price_change?: number;
  price_change_percentage?: number;
}

export interface Portfolio {
  portfolio_id: number;
  user_id: number;
  name: string;
  description?: string;
  created_at: string;
  total_value: number;
  total_gain: number;
  holdings: Holding[];
}

export interface Holding {
  stock_id: number;
  symbol: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  total_invested: number;
  current_value: number;
  gain_loss: number;
  gain_loss_percentage: number;
}

export interface Transaction {
  transaction_id: number;
  portfolio_id: number;
  stock_id: number;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  fee: number;
  total_amount: number;
  transaction_date: string;
  stock_symbol?: string;
  company_name?: string;
}

export interface Watchlist {
  watchlist_id: number;
  user_id: number;
  name: string;
  items: WatchlistItem[];
}

export interface WatchlistItem {
  item_id: number;
  watchlist_id: number;
  stock_id: number;
  added_date: string;
  stock?: Stock;
}

export interface StockPriceHistory {
  price_id: number;
  stock_id: number;
  price: number;
  timestamp: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface DashboardStats {
  total_portfolio_value: number;
  total_gain_loss: number;
  daily_gain_loss: number;
  top_holdings: Holding[];
  recent_transactions: Transaction[];
}
