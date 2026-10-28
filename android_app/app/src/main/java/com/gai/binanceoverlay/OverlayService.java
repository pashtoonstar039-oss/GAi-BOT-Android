package com.gai.binanceoverlay;

import android.app.*;
import android.content.*;
import android.graphics.PixelFormat;
import android.os.*;
import android.provider.Settings;
import android.view.*;
import android.webkit.*;
import java.util.*;

public class OverlayService extends Service {
    private WindowManager wm;
    private WebView overlay;

    @Override public void onCreate() {
        super.onCreate();
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel c = new NotificationChannel("overlay","Overlay",
                    NotificationManager.IMPORTANCE_LOW);
            ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(c);
            Notification n = new Notification.Builder(this,"overlay")
                    .setContentTitle("GAi Binance Overlay")
                    .setContentText("Live market signal engine active")
                    .setSmallIcon(android.R.drawable.ic_menu_view).build();
            startForeground(7,n);
        }
        showOverlay();
    }

    private void showOverlay() {
        if (!Settings.canDrawOverlays(this)) return;
        WebView w = new WebView(this);
        w.setBackgroundColor(0x00000000);
        WebSettings s=w.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        w.addJavascriptInterface(new SignalBridge(w),"SignalBridge");
        w.setWebViewClient(new WebViewClient());
        w.loadUrl("file:///android_asset/popup.html");
        overlay=w;

        int type = Build.VERSION.SDK_INT >= 26 ?
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY :
                WindowManager.LayoutParams.TYPE_PHONE;

        WindowManager.LayoutParams p = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        p.gravity = Gravity.TOP | Gravity.START;
        p.x=12; p.y=180;
        wm=(WindowManager)getSystemService(WINDOW_SERVICE);
        wm.addView(overlay,p);

        // Keep the original popup UI untouched. The engine is injected after load.
        w.setWebViewClient(new WebViewClient(){
            @Override public void onPageFinished(WebView view,String url){
                super.onPageFinished(view,url);
                view.evaluateJavascript(
                    "window.GAiNativeSignalEnabled=true;" +
                    "window.GAiRequestSignal=function(symbol,interval){return window.SignalBridge.requestSignal(String(symbol||'BTCUSDT'),String(interval||'1m'));};",
                    null);
            }
        });
    }

    @Override public int onStartCommand(Intent i,int f,int id){ return START_STICKY; }
    @Override public void onDestroy(){ if(wm!=null&&overlay!=null)wm.removeView(overlay); super.onDestroy(); }
    @Override public IBinder onBind(Intent i){ return null; }
}
