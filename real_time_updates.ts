// components/Dashboard/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useWatchlist } from '../../hooks/useWatchlist';
import api from '../../services/api';
import PortfolioSummary from './PortfolioSummary';
import HoldingsTable from './HoldingsTable';
import WatchlistPanel from './WatchlistPanel';
import TransactionForm from './TransactionForm';
import StockSearch from './StockSearch';

const Dashboard: React.FC = () => {
  const { authState } = useAuth();
  const { portfolios, holdings, transactions, isLoading } = usePortfolio();
  const { watchlists } = useWatchlist();
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [selectedStock, setSelectedStock] = useState<any>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const stats = await api.getDashboardStats();
      setDashboardStats(stats);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  const handleStockSelect = (stock: any) => {
    setSelectedStock(stock);
  };

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Welcome back, {authState.user?.username}!</h1>
        {dashboardStats && (
          <div className="quick-stats">
            <div className="stat-card">
              <h3>Total Portfolio Value</h3>
              <p className="stat-value">${dashboardStats.total_portfolio_value.toLocaleString()}</p>
            </div>
            <div className="stat-card">
              <h3>Total Gain/Loss</h3>
              <p className={`stat-value ${dashboardStats.total_gain_loss >= 0 ? 'positive' : 'negative'}`}>
                ${dashboardStats.total_gain_loss.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </header>

      <div className="dashboard-grid">
        <div className="main-content">
          <PortfolioSummary 
            portfolios={portfolios}
            holdings={holdings}
          />
          
          <HoldingsTable 
            holdings={holdings}
            onSelectStock={handleStockSelect}
          />

          {selectedStock && (
            <TransactionForm 
              stock={selectedStock}
              onTradeComplete={() => {
                setSelectedStock(null);
                // Refresh data
                fetchDashboardStats();
              }}
            />
          )}
        </div>

        <div className="sidebar">
          <StockSearch onSelectStock={handleStockSelect} />
          
          <WatchlistPanel 
            watchlists={watchlists}
            onSelectStock={handleStockSelect}
          />

          <div className="recent-transactions">
            <h3>Recent Transactions</h3>
            {transactions.slice(0, 5).map(transaction => (
              <div key={transaction.transaction_id} className="transaction-item">
                <span className={`transaction-type ${transaction.type.toLowerCase()}`}>
                  {transaction.type}
                </span>
                <span className="transaction-symbol">{transaction.stock_symbol}</span>
                <span className="transaction-quantity">{transaction.quantity} shares</span>
                <span className="transaction-amount">
                  ${transaction.total_amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
