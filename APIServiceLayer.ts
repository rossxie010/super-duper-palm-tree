// services/api.ts
import { Stock, Portfolio, Transaction, Watchlist, Holding } from '../types';

class ApiService {
  private baseUrl: string;
  private token: string | null;

  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || '/api';
    this.token = localStorage.getItem('token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'API request failed');
    }
    return response.json();
  }

  // Stock Methods
  async searchStocks(query: string): Promise<Stock[]> {
    const response = await fetch(`${this.baseUrl}/stocks/search?q=${query}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<Stock[]>(response);
  }

  async getStockDetails(symbol: string): Promise<Stock> {
    const response = await fetch(`${this.baseUrl}/stocks/${symbol}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<Stock>(response);
  }

  async getStockPriceHistory(stockId: number, period: string): Promise<any[]> {
    const response = await fetch(
      `${this.baseUrl}/stocks/${stockId}/history?period=${period}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<any[]>(response);
  }

  // Portfolio Methods
  async getUserPortfolios(): Promise<Portfolio[]> {
    const response = await fetch(`${this.baseUrl}/portfolios`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<Portfolio[]>(response);
  }

  async createPortfolio(name: string, description?: string): Promise<Portfolio> {
    const response = await fetch(`${this.baseUrl}/portfolios`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, description })
    });
    return this.handleResponse<Portfolio>(response);
  }

  async getPortfolioHoldings(portfolioId: number): Promise<Holding[]> {
    const response = await fetch(`${this.baseUrl}/portfolios/${portfolioId}/holdings`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<Holding[]>(response);
  }

  // Transaction Methods
  async executeTransaction(
    portfolioId: number,
    stockId: number,
    type: 'BUY' | 'SELL',
    quantity: number,
    price: number,
    fee: number = 0
  ): Promise<Transaction> {
    const response = await fetch(`${this.baseUrl}/transactions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        portfolio_id: portfolioId,
        stock_id: stockId,
        type,
        quantity,
        price,
        fee
      })
    });
    return this.handleResponse<Transaction>(response);
  }

  async getPortfolioTransactions(portfolioId: number): Promise<Transaction[]> {
    const response = await fetch(`${this.baseUrl}/portfolios/${portfolioId}/transactions`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<Transaction[]>(response);
  }

  // Watchlist Methods
  async getUserWatchlists(): Promise<Watchlist[]> {
    const response = await fetch(`${this.baseUrl}/watchlists`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<Watchlist[]>(response);
  }

  async createWatchlist(name: string): Promise<Watchlist> {
    const response = await fetch(`${this.baseUrl}/watchlists`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name })
    });
    return this.handleResponse<Watchlist>(response);
  }

  async addToWatchlist(watchlistId: number, stockId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/watchlists/${watchlistId}/items`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ stock_id: stockId })
    });
    return this.handleResponse<void>(response);
  }

  async removeFromWatchlist(watchlistId: number, stockId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/watchlists/${watchlistId}/items/${stockId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return this.handleResponse<void>(response);
  }

  // Dashboard Methods
  async getDashboardStats(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/dashboard/stats`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<any>(response);
  }
}

export default new ApiService();
