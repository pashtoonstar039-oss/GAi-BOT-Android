package com.gai.binanceoverlay;

import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import org.json.*;
import java.io.*;
import java.net.*;
import java.util.*;

public class SignalBridge {
    private final WebView web;
    SignalBridge(WebView w){ web=w; }

    @JavascriptInterface
    public String requestSignal(final String symbol, final String interval){
        try {
            String sym=symbol.toUpperCase(Locale.US).replace("-","");
            String iv=interval.toLowerCase(Locale.US);
            String u="https://api.binance.com/api/v3/klines?symbol="+URLEncoder.encode(sym,"UTF-8")+
                    "&interval="+URLEncoder.encode(iv,"UTF-8")+"&limit=120";
            JSONArray a=new JSONArray(get(u));
            int n=a.length();
            double[] c=new double[n],h=new double[n],l=new double[n],v=new double[n];
            for(int i=0;i<n;i++){
                JSONArray k=a.getJSONArray(i);
                h[i]=k.getDouble(2); l[i]=k.getDouble(3); c[i]=k.getDouble(4); v[i]=k.getDouble(5);
            }
            int L=0,S=0;
            double e9=ema(c,9),e21=ema(c,21);
            if(e9>e21)L++;else S++;
            double r=rsi(c,14);
            if(r>=50)L++;else S++;
            double mac=ema(c,12)-ema(c,26);
            if(mac>0)L++;else S++;
            if(c[n-1]>c[n-6])L++;else S++;
            double hh=h[n-21],ll=l[n-21];
            for(int i=n-20;i<n;i++){hh=Math.max(hh,h[i]);ll=Math.min(ll,l[i]);}
            if(c[n-1]>=hh)L++;else S++;
            double av=0;for(int i=n-21;i<n-1;i++)av+=v[i];av/=20;
            if(v[n-1]>av){if(c[n-1]>c[n-2])L++;else S++;}else{if(c[n-1]>=c[n-2])L++;else S++;}
            if(c[n-1]>=c[n-2])L++;else S++;
            if((c[n-1]-l[n-1]) >= (h[n-1]-c[n-1]))L++;else S++;

            String side=L>=S?"LONG":"SHORT";
            double price=c[n-1], atr=atr(h,l,c,14);
            double sl,tp1,tp2;
            if(side.equals("LONG")){sl=price-1.2*atr;tp1=price+atr;tp2=price+2*atr;}
            else{sl=price+1.2*atr;tp1=price-atr;tp2=price-2*atr;}

            JSONObject o=new JSONObject();
            o.put("status","OK");o.put("symbol",sym);o.put("timeframe",interval);
            o.put("signal",side);o.put("price",price);o.put("tp1",tp1);o.put("tp2",tp2);o.put("sl",sl);
            o.put("longVotes",L);o.put("shortVotes",S);o.put("strategies",8);
            return o.toString();
        }catch(Exception e){
            try{JSONObject o=new JSONObject();o.put("status","ERROR");o.put("message",e.toString());return o.toString();}
            catch(Exception x){return "{\"status\":\"ERROR\"}";}
        }
    }

    private String get(String u)throws Exception{
        HttpURLConnection c=(HttpURLConnection)new URL(u).openConnection();
        c.setConnectTimeout(7000);c.setReadTimeout(7000);c.setRequestMethod("GET");
        BufferedReader b=new BufferedReader(new InputStreamReader(c.getInputStream()));
        StringBuilder s=new StringBuilder();String x;while((x=b.readLine())!=null)s.append(x);b.close();return s.toString();
    }
    private static double ema(double[] x,int p){double k=2.0/(p+1),e=x[0];for(int i=1;i<x.length;i++)e=x[i]*k+e*(1-k);return e;}
    private static double rsi(double[] x,int p){double g=0,l=0;for(int i=x.length-p;i<x.length;i++){double d=x[i]-x[i-1];if(d>0)g+=d;else l-=d;}return l==0?100:100-100/(1+g/l);}
    private static double atr(double[] h,double[] l,double[] c,int p){double s=0;for(int i=c.length-p;i<c.length;i++)s+=Math.max(h[i]-l[i],Math.max(Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1])));return s/p;}
}
