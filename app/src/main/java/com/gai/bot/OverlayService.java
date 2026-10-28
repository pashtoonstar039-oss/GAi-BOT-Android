package com.gai.bot;

import android.app.*;import android.content.*;import android.graphics.Color;import android.graphics.PixelFormat;import android.os.*;import android.provider.Settings;import android.view.*;import android.webkit.*;import android.widget.*;

public class OverlayService extends Service {
  private WindowManager wm; private View overlay; private WebView web;
  private static final int NOTIF=19;
  @Override public void onCreate(){ super.onCreate(); createNotification(); showOverlay(); }
  private void createNotification(){
    String ch="gai_scanner"; NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
    if(Build.VERSION.SDK_INT>=26) nm.createNotificationChannel(new NotificationChannel(ch,"GAi BOT Scanner",NotificationManager.IMPORTANCE_LOW));
    Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,ch):new Notification.Builder(this);
    b.setContentTitle("GAi BOT running").setContentText("Floating Binance scanner is active").setSmallIcon(android.R.drawable.ic_dialog_info).setOngoing(true);
    startForeground(NOTIF,b.build());
  }
  private void showOverlay(){
    if(!Settings.canDrawOverlays(this)) return;
    web=new WebView(this); web.setBackgroundColor(Color.TRANSPARENT); web.getSettings().setJavaScriptEnabled(true); web.getSettings().setDomStorageEnabled(true); web.getSettings().setAllowFileAccess(true); web.getSettings().setAllowFileAccessFromFileURLs(true); web.getSettings().setAllowUniversalAccessFromFileURLs(true); web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW); web.setOverScrollMode(View.OVER_SCROLL_NEVER);
    web.loadUrl("file:///android_asset/index.html");
    overlay=web; wm=(WindowManager)getSystemService(WINDOW_SERVICE);
    WindowManager.LayoutParams p=new WindowManager.LayoutParams(190, WindowManager.LayoutParams.WRAP_CONTENT, Build.VERSION.SDK_INT>=26?WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY:WindowManager.LayoutParams.TYPE_PHONE, WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS, PixelFormat.TRANSLUCENT);
    p.gravity=Gravity.TOP|Gravity.END; p.x=10; p.y=110; wm.addView(overlay,p);
    web.setOnTouchListener(new View.OnTouchListener(){float downX,downY,startX,startY; long downT; boolean moving;
      public boolean onTouch(View v,android.view.MotionEvent e){ if(e.getAction()==0){downX=e.getRawX();downY=e.getRawY();startX=p.x;startY=p.y;downT=System.currentTimeMillis();moving=false;return false;} if(e.getAction()==2){float dx=e.getRawX()-downX,dy=e.getRawY()-downY;if(Math.abs(dx)>8||Math.abs(dy)>8){moving=true;p.x=(int)(startX-dx);p.y=(int)(startY+dy);wm.updateViewLayout(overlay,p);}return false;} return false; }});
  }
  @Override public int onStartCommand(Intent i,int f,int s){ return START_STICKY; }
  @Override public void onDestroy(){ if(web!=null)web.destroy(); if(overlay!=null&&wm!=null)try{wm.removeView(overlay);}catch(Exception ignored){} super.onDestroy(); }
  @Override public android.os.IBinder onBind(Intent i){return null;}
}
