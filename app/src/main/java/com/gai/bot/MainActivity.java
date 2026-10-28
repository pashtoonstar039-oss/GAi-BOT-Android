package com.gai.bot;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
  private TextView status;
  @Override public void onCreate(Bundle b){ super.onCreate(b); showSetup(); }
  private void showSetup(){
    LinearLayout root=new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setPadding(40,60,40,40); root.setGravity(Gravity.CENTER); root.setBackgroundColor(Color.rgb(11,15,22));
    TextView title=new TextView(this); title.setText("GAi BOT\nBinance 8-Strategy Scanner"); title.setTextColor(Color.WHITE); title.setTextSize(24); title.setGravity(Gravity.CENTER); root.addView(title,new LinearLayout.LayoutParams(-1,-2));
    status=new TextView(this); status.setTextColor(Color.LTGRAY); status.setTextSize(14); status.setGravity(Gravity.CENTER); status.setPadding(0,30,0,30); root.addView(status,new LinearLayout.LayoutParams(-1,-2));
    Button overlay=new Button(this); overlay.setText("ENABLE FLOATING POPUP"); root.addView(overlay,new LinearLayout.LayoutParams(-1,-2));
    Button start=new Button(this); start.setText("START GAi BOT"); root.addView(start,new LinearLayout.LayoutParams(-1,-2));
    overlay.setOnClickListener(v -> { if(!Settings.canDrawOverlays(this)) startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:"+getPackageName()))); else startBot(); });
    start.setOnClickListener(v -> startBot()); setContentView(root); updateStatus();
  }
  private void updateStatus(){ status.setText(Settings.canDrawOverlays(this)?"Floating permission: ON\nTap START to show the popup over other apps.":"Floating permission: OFF\nEnable it so the scanner can stay visible while you share your screen."); }
  private void startBot(){
    if(!Settings.canDrawOverlays(this)){ updateStatus(); return; }
    Intent i=new Intent(this,OverlayService.class); startForegroundService(i); status.setText("GAi BOT is running. You can open Binance or any other app; the popup stays on screen.");
  }
  @Override protected void onResume(){ super.onResume(); if(status!=null) updateStatus(); }
}
