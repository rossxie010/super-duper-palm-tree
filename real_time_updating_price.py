import asyncio
from datetime import datetime
from database import SessionLocal
from models import Stock, StockPriceHistory
from external_apis import fetch_live_prices

class StockPriceService:
    async def update_stock_prices(self):
        """
        Background service to fetch and update stock prices
        Runs every 5 minutes or via WebSocket stream
        """
        db = SessionLocal()
        try:
            # Fetch active stocks
            stocks = db.query(Stock).filter(Stock.is_active == True).all()
            stock_symbols = [s.symbol for s in stocks]
            
            # Fetch latest prices from external API
            live_prices = await fetch_live_prices(stock_symbols)
            
            # Update database in batch transaction
            for symbol, price_data in live_prices.items():
                stock = next((s for s in stocks if s.symbol == symbol), None)
                if stock:
                    # Update current price
                    stock.current_price = price_data['price']
                    stock.price_updated_at = datetime.utcnow()
                    stock.percent_change = price_data.get('change_percent', 0)
                    
                    # Record in price history
                    price_history = StockPriceHistory(
                        stock_id=stock.id,
                        price=price_data['price'],
                        volume=price_data.get('volume', 0),
                        recorded_at=datetime.utcnow()
                    )
                    db.add(price_history)
            
            db.commit()
        
            await self._check_price_alerts(live_prices)
            
        except Exception as e:
            db.rollback()
            logger.error(f"Price update failed: {str(e)}")
        finally:
            db.close()
    
    async def _check_price_alerts(self, live_prices):
        """Check if any price alerts have been triggered"""
        # Logic to check user price alerts
        pass
