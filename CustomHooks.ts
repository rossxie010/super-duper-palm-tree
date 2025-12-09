// hooks/usePortfolio.ts
import { useState, useEffect, useCallback } from 'react';
import { Portfolio, Holding, Transaction } from '../types';
import api from '../services/api';

export const usePortfolio = (portfolioId?: number) => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolios = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getUserPortfolios();
      setPortfolios(data);
      if (data.length > 0 && !selectedPortfolio) {
        setSelectedPortfolio(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolios');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPortfolio]);

  const fetchPortfolioDetails = useCallback(async (id: number) => {
    setIsLoading(true);
    try {
      const [holdingsData, transactionsData] = await Promise.all([
        api.getPortfolioHoldings(id),
        api.getPortfolioTransactions(id)
      ]);
      setHoldings(holdingsData);
      setTransactions(transactionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio details');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPortfolio = async (name: string, description?: string) => {
    setIsLoading(true);
    try {
      const newPortfolio = await api.createPortfolio(name, description);
      setPortfolios(prev => [...prev, newPortfolio]);
      return newPortfolio;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create portfolio');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const executeTrade = async (
    stockId: number,
    type: 'BUY' | 'SELL',
    quantity: number,
    price: number,
    fee: number = 0
  ) => {
    if (!selectedPortfolio) throw new Error('No portfolio selected');
    
    setIsLoading(true);
    try {
      const transaction = await api.executeTransaction(
        selectedPortfolio.portfolio_id,
        stockId,
        type,
        quantity,
        price,
        fee
      );
      setTransactions(prev => [transaction, ...prev]);
      // Refresh holdings after transaction
      await fetchPortfolioDetails(selectedPortfolio.portfolio_id);
      return transaction;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute trade');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  useEffect(() => {
    if (portfolioId) {
      fetchPortfolioDetails(portfolioId);
    }
  }, [portfolioId, fetchPortfolioDetails]);

  return {
    portfolios,
    selectedPortfolio,
    setSelectedPortfolio,
    holdings,
    transactions,
    isLoading,
    error,
    createPortfolio,
    executeTrade,
    refreshPortfolios: fetchPortfolios,
    refreshPortfolioDetails: fetchPortfolioDetails
  };
};
