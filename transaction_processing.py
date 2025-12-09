from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from models import Transaction, PortfolioHolding, User
from database import SessionLocal
from sqlalchemy import text

class TransactionService:
    def execute_trade(self, trade_data: Dict) -> Dict:
        """
        Process buy/sell orders with validation and atomic updates
        """
        db = SessionLocal()
        try:
            # Start transaction
            db.begin()
            
            # Validate trade
            validation_result = self._validate_trade(trade_data)
            if not validation_result['valid']:
                return {'success': False, 'error': validation_result['error']}
            
            user_id = trade_data['user_id']
            symbol = trade_data['symbol']
            quantity = Decimal(str(trade_data['quantity']))
            order_type = trade_data['type']  # 'BUY' or 'SELL'
            price = Decimal(str(trade_data['price']))
            
            # Get user and stock
            user = db.query(User).get(user_id)
            stock = db.query(Stock).filter(Stock.symbol == symbol).first()
            
            # Calculate total amount
            total_amount = (quantity * price).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
            if order_type == 'BUY':
                # Check sufficient funds
                if user.cash_balance < total_amount:
                    return {'success': False, 'error': 'Insufficient funds'}
                
                # Deduct cash
                user.cash_balance -= total_amount
                
                # Update or create portfolio holding
                holding = db.query(PortfolioHolding).filter(
                    PortfolioHolding.user_id == user_id,
                    PortfolioHolding.stock_id == stock.id
                ).first()
                
                if holding:
                    # Calculate new average cost
                    new_total_quantity = holding.quantity + quantity
                    new_total_cost = (holding.average_cost * holding.quantity) + total_amount
                    holding.average_cost = new_total_cost / new_total_quantity
                    holding.quantity = new_total_quantity
                else:
                    holding = PortfolioHolding(
                        user_id=user_id,
                        stock_id=stock.id,
                        quantity=quantity,
                        average_cost=price
                    )
                    db.add(holding)
                    
            elif order_type == 'SELL':
                # Check sufficient shares
                holding = db.query(PortfolioHolding).filter(
                    PortfolioHolding.user_id == user_id,
                    PortfolioHolding.stock_id == stock.id
                ).first()
                
                if not holding or holding.quantity < quantity:
                    return {'success': False, 'error': 'Insufficient shares'}
                
                # Add cash
                user.cash_balance += total_amount
                
                # Update holding
                holding.quantity -= quantity
                if holding.quantity == 0:
                    db.delete(holding)
            
            # Create transaction record
            transaction = Transaction(
                user_id=user_id,
                stock_id=stock.id,
                type=order_type,
                quantity=quantity,
                price_per_share=price,
                total_amount=total_amount,
                status='COMPLETED',
                executed_at=datetime.utcnow()
            )
            db.add(transaction)
            
            # Update stock volume
            stock.volume_today += int(quantity)
            
            # Commit all changes
            db.commit()
            
            # Update portfolio cache
            self._update_portfolio_cache(user_id)
            
            return {
                'success': True,
                'transaction_id': transaction.id,
                'new_cash_balance': float(user.cash_balance),
                'executed_at': transaction.executed_at
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Trade execution failed: {str(e)}")
            return {'success': False, 'error': 'Transaction failed'}
        finally:
            db.close()
    
    def _validate_trade(self, trade_data: Dict) -> Dict:
        """Validate trade parameters"""
        # Check market hours
        if not self._is_market_open():
            return {'valid': False, 'error': 'Market is closed'}
        
        # Validate quantity
        if trade_data['quantity'] <= 0:
            return {'valid': False, 'error': 'Invalid quantity'}
        
        # Validate price
        current_price = self._get_current_price(trade_data['symbol'])
        price_limit = current_price * Decimal('1.1')  # 10% limit for example
        
        if Decimal(str(trade_data['price'])) > price_limit:
            return {'valid': False, 'error': 'Price exceeds limit'}
        
        return {'valid': True}
