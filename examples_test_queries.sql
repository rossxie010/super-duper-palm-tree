-History 3 Highest(per stock) Price Peaks(per share)
SELECT
    temp.stock_id AS 'stock_id'
    temp.stock_symbol AS 'stock_symbol'
    temp.stock_price AS 'stock_price'
FROM
    (
        SELECT
            Stock_Price_History.stock_id AS 'stock_id',
            Stocks.symbol AS 'stock_symbol',
            Stock_Price_History AS 'stock_price'
            DENSE_RANK() OVER(PARTITION BY STOCKS.symbol ORDER BY Stock_Price_History.price DESC) AS 'peaks'
        FROM
            Stock_Price_History JOIN STOCKS USING (stock_id)
    ) AS temp
WHERE
    peaks < 4;


--Running Net Quantity
SELECT
    transaction_id,
    stock_id,
    type,
    quantity,
    transaction_date,
    SUM(
        CASE 
            WHEN type = 'BUY' THEN quantity
            WHEN type = 'SELL' THEN -quantity
        END
    ) OVER (
        PARTITION BY stock_id 
        ORDER BY transaction_date, transaction_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW 
    ) AS running_net_quantity
FROM 
    Transactions
ORDER BY 
    stock_id, transaction_date, transaction_id;

--Running Cash Balance with Market-to-Market Valuation Description: Generate a daily timeline for a portfolio that shows:
--The running cash balance (starting cash + sum of all cash inflows from SELLs and outflows from BUYs actions up to that date)

WITH buy_transactions AS (
    SELECT 
        ticker,
        SUM(quantity * price) as total_cost,
        SUM(quantity) as total_quantity,
        -- Calculate weighted average buy price
        SUM(quantity * price) / NULLIF(SUM(quantity), 0) as weighted_avg_buy_price
    FROM transactions
    WHERE action = 'BUY'
    GROUP BY ticker
),
current_holdings AS (
    SELECT 
        bt.ticker,
        bt.total_quantity as current_quantity,
        bt.weighted_avg_buy_price,
        -- Get current price (most recent transaction price or market price)
        COALESCE(
            (SELECT price 
             FROM transactions t2 
             WHERE t2.ticker = bt.ticker 
             ORDER BY trade_date DESC 
             LIMIT 1),
            (SELECT close_price 
             FROM stock_prices sp 
             WHERE sp.ticker = bt.ticker 
             ORDER BY price_date DESC 
             LIMIT 1)
        ) as current_price
    FROM buy_transactions bt
    WHERE bt.total_quantity > 0  -- Only stocks currently held
),
recent_buys AS (
    -- Find stocks with BUY transactions in last 30 days
    SELECT DISTINCT ticker
    FROM transactions
    WHERE action = 'BUY'
    AND trade_date >= CURRENT_DATE - INTERVAL '30 days'
),
candidates AS (
    SELECT 
        ch.ticker,
        ch.current_quantity,
        ch.weighted_avg_buy_price,
        ch.current_price,
        -- Calculate unrealized loss (negative value indicates loss)
        (ch.current_price - ch.weighted_avg_buy_price) * ch.current_quantity as unrealized_loss,
        -- Loss percentage
        ROUND((ch.current_price - ch.weighted_avg_buy_price) / ch.weighted_avg_buy_price * 100, 2) as loss_percentage
    FROM current_holdings ch
    WHERE (ch.current_price - ch.weighted_avg_buy_price) < 0  -- Only stocks with losses
    AND ch.ticker NOT IN (SELECT ticker FROM recent_buys)  -- Exclude wash sale candidates
    AND ch.current_quantity > 0  -- Only current holdings
)
SELECT 
    ticker,
    current_quantity,
    weighted_avg_buy_price,
    current_price,
    unrealized_loss,
    loss_percentage,
    -- Calculate loss magnitude for ranking
    ABS(unrealized_loss) as loss_magnitude
FROM candidates
ORDER BY loss_magnitude DESC  -- Highest losses first
LIMIT 5;

--Optimal Tax-Loss Harvesting Candidates
--Find the top 5 stocks in a portfolio with the highest unrealized losses that do not have any BUY transactions in the last 30 days (to avoid triggering a wash sale). Calculate the unrealized loss as (current_price - weighted_avg_buy_price) * current_quantity.

WITH current_holdings AS (
    SELECT 
        ticker,
        SUM(CASE WHEN action = 'BUY' THEN quantity ELSE 0 END) 
            - SUM(CASE WHEN action = 'SELL' THEN quantity ELSE 0 END) as current_quantity,
        SUM(CASE WHEN action = 'BUY' THEN quantity * price ELSE 0 END) 
            / NULLIF(SUM(CASE WHEN action = 'BUY' THEN quantity ELSE 0 END), 0) as avg_buy_price,
        MAX(CASE WHEN action IN ('BUY', 'SELL') THEN price END) as latest_price
    FROM transactions
    GROUP BY ticker
    HAVING SUM(CASE WHEN action = 'BUY' THEN quantity ELSE 0 END) 
         - SUM(CASE WHEN action = 'SELL' THEN quantity ELSE 0 END) > 0
),
wash_sale_check AS (
    SELECT DISTINCT ticker
    FROM transactions
    WHERE action = 'BUY'
    AND trade_date >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT 
    ch.ticker,
    ch.current_quantity,
    ch.avg_buy_price,
    ch.latest_price as current_price,
    (ch.latest_price - ch.avg_buy_price) * ch.current_quantity as unrealized_loss
FROM current_holdings ch
LEFT JOIN wash_sale_check wsc ON ch.ticker = wsc.ticker
WHERE wsc.ticker IS NULL 
AND (ch.latest_price - ch.avg_buy_price) < 0
ORDER BY unrealized_loss ASC 
LIMIT 5;
