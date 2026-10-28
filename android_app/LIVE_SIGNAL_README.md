Live Binance signal:
- Existing popup.html is not modified.
- SignalBridge reads the selected symbol/timeframe and fetches public Binance kline data.
- 8 technical votes are calculated.
- Result is always LONG or SHORT, with live price, TP1, TP2 and SL.
- A click-to-scan timer/UI hookup should call window.GAiRequestSignal(symbol, interval) after the popup's 10-second scan.
- No Binance API key is required for public market data.
