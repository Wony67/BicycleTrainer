package com.wony67.bicycletrainer;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BatterySettingsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
