# Signal engine
The Android wrapper now contains a live Binance kline signal engine. It reads the selected symbol/timeframe through a JS bridge and calculates 8 technical strategy votes, then returns LONG/SHORT/WAIT with live price, TP1, TP2 and SL.

The existing popup.html is intentionally left unchanged.
