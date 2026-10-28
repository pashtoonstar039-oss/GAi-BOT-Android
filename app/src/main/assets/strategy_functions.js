function label(i){return i==='1M'?'1M':String(i||'').toUpperCase();}

function avg(values){
  const xs=values.filter(Number.isFinite);
  return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
}

function candleBody(c){return Math.abs(c.close-c.open);}

function candleRange(c){return Math.max(0,c.high-c.low);}

function bodyRatio(c){const r=candleRange(c);return r?candleBody(c)/r:0;}

function getSwingPoints(a,window=2){
  const highs=[],lows=[];
  for(let i=window;i<a.length-window;i++){
    const c=a[i];
    let hi=true,lo=true;
    for(let j=1;j<=window;j++){
      if(c.high<=a[i-j].high||c.high<=a[i+j].high)hi=false;
      if(c.low>=a[i-j].low||c.low>=a[i+j].low)lo=false;
    }
    if(hi)highs.push({index:i,price:c.high});
    if(lo)lows.push({index:i,price:c.low});
  }
  return {highs,lows};
}

function detectMarketStructure(a){
  const {highs,lows}=getSwingPoints(a,2);
  const h=highs.slice(-3),l=lows.slice(-3);
  if(h.length>=2&&l.length>=2){
    const bullish=h.at(-1).price>h.at(-2).price && l.at(-1).price>l.at(-2).price;
    const bearish=h.at(-1).price<h.at(-2).price && l.at(-1).price<l.at(-2).price;
    return {bull:bullish,bear:bearish,highs:h,lows:l};
  }
  const recent=a.slice(-12),mid=a.slice(-24,-12);
  const r=avg(recent.map(x=>x.close)),m=avg(mid.map(x=>x.close));
  return {bull:r>m,bear:r<m,highs:h,lows:l};
}

function detectLiquiditySweep8(a,lookback=20){
  if(a.length<lookback+2)return {bull:false,bear:false,level:null};
  const last=a.at(-1), prior=a.slice(-(lookback+1),-1);
  const hi=Math.max(...prior.map(x=>x.high)),lo=Math.min(...prior.map(x=>x.low));
  return {bull:last.low<lo&&last.close>lo,bear:last.high>hi&&last.close<hi,level:last.low<lo?lo:last.high>hi?hi:null};
}

function detectPriceAction(a){
  if(a.length<3)return {bull:false,bear:false,label:'NONE'};
  const c=a.at(-1),p=a.at(-2),range=candleRange(c),body=candleBody(c);
  const lower=Math.min(c.open,c.close)-c.low,upper=c.high-Math.max(c.open,c.close);
  const bullEngulf=c.close>c.open&&p.close<p.open&&c.open<=p.close&&c.close>=p.open;
  const bearEngulf=c.close<c.open&&p.close>p.open&&c.open>=p.close&&c.close<=p.open;
  const hammer=c.close>=c.open&&lower>=Math.max(body*1.5,range*.35)&&upper<=range*.25;
  const shoot=c.close<=c.open&&upper>=Math.max(body*1.5,range*.35)&&lower<=range*.25;
  const strongBull=c.close>c.open&&bodyRatio(c)>=.6&&c.close>=c.low+range*.7;
  const strongBear=c.close<c.open&&bodyRatio(c)>=.6&&c.close<=c.low+range*.3;
  return {bull:bullEngulf||hammer||strongBull,bear:bearEngulf||shoot||strongBear,label:bullEngulf?'Bullish Engulfing':bearEngulf?'Bearish Engulfing':hammer?'Bullish Rejection':shoot?'Bearish Rejection':strongBull?'Strong Bullish Candle':strongBear?'Strong Bearish Candle':'NONE'};
}

function detectVolumeConfirmation(a,lookback=20){
  if(a.length<lookback+2)return {bull:false,bear:false,ratio:0};
  const last=a.at(-1),base=avg(a.slice(-(lookback+1),-1).map(x=>Number(x.volume)));
  const ratio=base?Number(last.volume)/base:0;
  const strong=ratio>=1.05;
  return {bull:strong&&last.close>last.open,bear:strong&&last.close<last.open,ratio};
}

function detectSupportResistance(a,atrValue){
  const {highs,lows}=getSwingPoints(a,2),last=a.at(-1),tol=Math.max(atrValue*.45,last.close*.0008);
  const supports=lows.map(x=>x.price).filter(p=>p<=last.high+tol).sort((x,y)=>Math.abs(last.close-x)-Math.abs(last.close-y));
  const resistances=highs.map(x=>x.price).filter(p=>p>=last.low-tol).sort((x,y)=>Math.abs(last.close-x)-Math.abs(last.close-y));
  const support=supports[0],resistance=resistances[0];
  const bull=Number.isFinite(support)&&Math.abs(last.low-support)<=tol&&last.close>support;
  const bear=Number.isFinite(resistance)&&Math.abs(last.high-resistance)<=tol&&last.close<resistance;
  return {bull,bear,support:bull?support:null,resistance:bear?resistance:null};
}

function detectOrderBlock(a,atrValue){
  const last=a.at(-1),look=a.slice(Math.max(0,a.length-14),-1),tol=Math.max(atrValue*.35,last.close*.0007);
  let bull=null,bear=null;
  for(let i=look.length-1;i>=0;i--){
    const c=look[i];
    if(!bull&&c.close<c.open){
      const after=look.slice(i+1).concat([last]).slice(0,3);
      if(after.some(x=>x.close>c.high&&candleBody(x)>=candleBody(c)*1.2)) bull={low:Math.min(c.open,c.close),high:Math.max(c.open,c.close)};
    }
    if(!bear&&c.close>c.open){
      const after=look.slice(i+1).concat([last]).slice(0,3);
      if(after.some(x=>x.close<c.low&&candleBody(x)>=candleBody(c)*1.2)) bear={low:Math.min(c.open,c.close),high:Math.max(c.open,c.close)};
    }
  }
  const inZone=z=>z&&last.low<=z.high+tol&&last.high>=z.low-tol;
  return {bull:inZone(bull),bear:inZone(bear),bullZone:bull,bearZone:bear};
}

function detectFVG(a,atrValue){
  if(a.length<3)return {bull:false,bear:false,bullZone:null,bearZone:null};
  const last=a.at(-1),tol=Math.max(atrValue*.35,last.close*.0007);
  let bullZone=null,bearZone=null;
  for(let i=a.length-3;i>=Math.max(0,a.length-12);i--){
    const x=a[i],z=a[i+2];
    if(!bullZone&&x.high<z.low)bullZone={low:x.high,high:z.low};
    if(!bearZone&&x.low>z.high)bearZone={low:z.high,high:x.low};
  }
  const inZone=z=>z&&last.low<=z.high+tol&&last.high>=z.low-tol;
  return {bull:inZone(bullZone),bear:inZone(bearZone),bullZone,bearZone};
}

function detectBreakoutRetest(a,lookback=15){
  if(a.length<lookback+3)return {bull:false,bear:false};
  const last=a.at(-1),prev=a.at(-2),prior=a.slice(-(lookback+2),-2);
  const hi=Math.max(...prior.map(x=>x.high)),lo=Math.min(...prior.map(x=>x.low));
  const bull=(prev.close<=hi&&last.close>hi)||(last.low<=hi&&last.close>hi&&prev.close>hi);
  const bear=(prev.close>=lo&&last.close<lo)||(last.high>=lo&&last.close<lo&&prev.close<lo);
  return {bull,bear,high:hi,low:lo};
}

function makeSignal(startPrice,samples){
  // Always analyze at least the latest 100 candles from the chart-selected
  // symbol/timeframe. The live forming candle is included as an extra candle.
  const all=[...history]; if(live)all.push(live);
  const closedCount=history.length;
  if(closedCount<100)return makeFallbackSignal(startPrice,samples,live);
  const analysis=all.slice(-101);
  const atrValue=atr(analysis,14);
  if(!atrValue)return makeFallbackSignal(startPrice,samples,live);

  // Eight strategies are evaluated on the same 100+ candle analysis window
  // and their directional evidence is combined into one final signal.
  const ms=detectMarketStructure(analysis),sweep=detectLiquiditySweep8(analysis),pa=detectPriceAction(analysis),vol=detectVolumeConfirmation(analysis),sr=detectSupportResistance(analysis,atrValue),ob=detectOrderBlock(analysis,atrValue),fvg=detectFVG(analysis,atrValue),br=detectBreakoutRetest(analysis);
  const bullZone=ob.bull||fvg.bull||sr.bull, bearZone=ob.bear||fvg.bear||sr.bear;
  const coreBull=ms.bull&&pa.bull&&vol.bull&&bullZone;
  const coreBear=ms.bear&&pa.bear&&vol.bear&&bearZone;
  const bullScore=(ms.bull?2:0)+(sweep.bull?1:0)+(pa.bull?2:0)+(vol.bull?2:0)+(sr.bull?1:0)+(ob.bull?1:0)+(fvg.bull?1:0)+(br.bull?1:0);
  const bearScore=(ms.bear?2:0)+(sweep.bear?1:0)+(pa.bear?2:0)+(vol.bear?2:0)+(sr.bear?1:0)+(ob.bear?1:0)+(fvg.bear?1:0)+(br.bear?1:0);
  // Final 8-strategy engine: every 5s scan evaluates all eight strategies.
  // Core signal gate follows the requested rule; Liquidity Sweep and Breakout + Retest
  // remain explicit confirmations and are included in the final strategy state.
  let direction;
  if(coreBull&&!coreBear) direction='UP';
  else if(coreBear&&!coreBull) direction='DOWN';
  else direction=bullScore>=bearScore?'UP':'DOWN';
  const score=direction==='UP'?bullScore:bearScore;
  const core=direction==='UP'?coreBull:coreBear;
  const strategyConfirmations=direction==='UP'
    ? [ms.bull,sweep.bull,pa.bull,vol.bull,sr.bull,ob.bull,fvg.bull,br.bull].filter(Boolean).length
    : [ms.bear,sweep.bear,pa.bear,vol.bear,sr.bear,ob.bear,fvg.bear,br.bear].filter(Boolean).length;
  const confidence=Math.min(96,Math.max(55,Math.round(55+(score/12)*41+(core?7:0))));
  const entry=analysis.at(-1).close,risk=Math.max(atrValue,entry*.001);
  const evidence=[
    ms.bull&&direction==='UP'?'Market Structure bullish':ms.bear&&direction==='DOWN'?'Market Structure bearish':null,
    sweep.bull&&direction==='UP'?'Liquidity Sweep bullish':sweep.bear&&direction==='DOWN'?'Liquidity Sweep bearish':null,
    pa.bull&&direction==='UP'?`Price Action ${pa.label}`:pa.bear&&direction==='DOWN'?`Price Action ${pa.label}`:null,
    vol.bull&&direction==='UP'?`Volume ${vol.ratio.toFixed(1)}x`:vol.bear&&direction==='DOWN'?`Volume ${vol.ratio.toFixed(1)}x`:null,
    sr.bull&&direction==='UP'?'Support level':sr.bear&&direction==='DOWN'?'Resistance level':null,
    ob.bull&&direction==='UP'?'Bullish Order Block':ob.bear&&direction==='DOWN'?'Bearish Order Block':null,
    fvg.bull&&direction==='UP'?'Bullish FVG':fvg.bear&&direction==='DOWN'?'Bearish FVG':null,
    br.bull&&direction==='UP'?'Breakout + Retest bullish':br.bear&&direction==='DOWN'?'Breakout + Retest bearish':null
  ].filter(Boolean);
  const traceFirst=Number(samples[0]?.price||startPrice||entry),traceLast=Number(samples.at(-1)?.price||entry),traceMove=traceLast-traceFirst;
  return {direction,confidence,reason:`${label(currentInterval)} · ${core?'CORE CONFIRMED':'DIRECTIONAL BIAS'} · ${evidence.slice(0,5).join(' · ')}${traceMove?' · 5s trace '+(traceMove>=0?'+':'')+traceMove.toFixed(2):''}`,interval:label(currentInterval),symbol:formatSymbol(SYMBOL),entry,tp1:direction==='UP'?entry+risk:entry-risk,tp2:direction==='UP'?entry+risk*1.5:entry-risk*1.5,sl:direction==='UP'?entry-risk:entry+risk,atr:risk,timestamp:Date.now(),scanSeconds:10,signalAtSeconds:11,candlesAnalyzed:analysis.length,closedCandlesAnalyzed:closedCount,strategy:{marketStructure:ms,sweep,priceAction:pa,volume:vol,supportResistance:sr,orderBlock:ob,fvg,breakoutRetest:br,coreConfirmed:core,confirmations:strategyConfirmations,totalStrategies:8}};
}

function formatSymbol(s){const m=String(s||'').match(/^(.+?)(USDT|USDC|FDUSD|BUSD|TUSD|BTC|ETH|BNB)$/);return m?`${m[1]}/${m[2]}`:String(s||'—');}

function getBaseAsset(symbol){
  const s=String(symbol||'').toUpperCase();
  return s.replace(/(USDT|USDC|FDUSD|BUSD|TUSD|BTC|ETH|BNB)$/,'') || s;
}

function atr(a,p=14){if(a.length<p+1)return null;const tr=[];for(let i=1;i<a.length;i++)tr.push(Math.max(a[i].high-a[i].low,Math.abs(a[i].high-a[i-1].close),Math.abs(a[i].low-a[i-1].close)));return tr.slice(-p).reduce((x,y)=>x+y,0)/p;}

function makeFallbackSignal(startPrice,samples,candle){
  const end=Number(samples.at(-1)?.price||candle?.close||startPrice);
  const first=Number(samples[0]?.price||startPrice);
  const move=end-first;
  let up=move>0;
  if(Math.abs(move)<Math.max(first*0.00005,0.5)) up=(Number(candle?.close||end)>=Number(candle?.open||first));
  const entry=end;
  const range=Math.max(
    Math.abs(Number(candle?.high||entry)-Number(candle?.low||entry)),
    entry*0.001
  );
  const risk=range*0.65;
  return {
    direction:up?'UP':'DOWN', confidence:55,
    reason:`${label(currentInterval)} · 10s live-price trace ${move>=0?'+':''}${move.toFixed(2)}`,
    interval:label(currentInterval),symbol:formatSymbol(SYMBOL),entry,
    tp1:up?entry+risk:entry-risk,
    tp2:up?entry+risk*1.5:entry-risk*1.5,
    sl:up?entry-risk:entry+risk,atr:risk,timestamp:Date.now(),scanSeconds:10,signalAtSeconds:11
  };
}