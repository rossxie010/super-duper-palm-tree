from decimal import Decimal
from typing import Dict, List
from database import SessionLocal
from models import User, PortfolioHolding, Transaction

class PortfolioService:
    def calculate_portfolio_value(self, user_id: int) -> Dict:
        """
        Calculate real-time portfolio valuation with performance metrics
        """
        db = SessionLocal()
        try:
            # Get all holdings for user
            holdings = db.query(PortfolioHolding).filter(
                PortfolioHolding.user_id == user_id
            ).all()
            
            total_value = Decimal('0')
            total_cost_basis = Decimal('0')
            holdings_data = []
            
            for holding in holdings:
                # Get current price
                current_price = holding.stock.current_price
                market_value = current_price * holding.quantity
                cost_basis = holding.average_cost * holding.quantity
                
                # Calculate metrics
                unrealized_gain = market_value - cost_basis
                gain_percentage = (unrealized_gain / cost_basis * 100) if cost_basis > 0 else 0
                
                holding_data = {
                    'symbol': holding.stock.symbol,
                    'quantity': float(holding.quantity),
                    'avg_cost': float(holding.average_cost),
                    'current_price': float(current_price),
                    'market_value': float(market_value),
                    'unrealized_gain': float(unrealized_gain),
                    'gain_percentage': float(gain_percentage),
                    'weight': 0  # To be calculated later
                }
                
                total_value += market_value
                total_cost_basis += cost_basis
                holdings_data.append(holding_data)
            
            # Calculate portfolio weights
            for h in holdings_data:
                h['weight'] = (h['market_value'] / float(total_value) * 100) if total_value > 0 else 0
            
            # Get cash balance
            user = db.query(User).get(user_id)
            
            return {
                'total_portfolio_value': float(total_value + user.cash_balance),
                'equity_value': float(total_value),
                'cash_balance': float(user.cash_balance),
                'total_cost_basis': float(total_cost_basis),
                'total_unrealized_gain': float(total_value - total_cost_basis),
                'holdings': holdings_data,
                'sector_allocation': self._calculate_sector_allocation(holdings),
                'last_updated': datetime.utcnow()
            }
            
        finally:
            db.close()
    
    def _calculate_sector_allocation(self, holdings: List[PortfolioHolding]) -> Dict:
        """Calculate sector distribution in portfolio"""
        sector_allocation = {}
        for holding in holdings:
            sector = holding.stock.sector
            value = holding.quantity * holding.stock.current_price
            sector_allocation[sector] = sector_allocation.get(sector, 0) + float(value)
        return sector_allocation
