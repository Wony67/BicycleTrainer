package com.wony67.bicycletrainer;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BatterySettings")
public class BatterySettingsPlugin extends Plugin {
    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        try {
            Intent intent = createBatteryOptimizationIntent();
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception requestError) {
            try {
                Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                fallback.setData(Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(fallback);
                call.resolve();
            } catch (Exception fallbackError) {
                call.reject("배터리 설정 화면을 열 수 없습니다.", fallbackError);
            }
        }
    }

    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        JSObject result = new JSObject();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            result.put("ignoring", true);
            call.resolve(result);
            return;
        }

        PowerManager powerManager = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        boolean ignoring = powerManager != null && powerManager.isIgnoringBatteryOptimizations(getContext().getPackageName());
        result.put("ignoring", ignoring);
        call.resolve(result);
    }

    private Intent createBatteryOptimizationIntent() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            return intent;
        }

        return new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).setData(Uri.parse("package:" + getContext().getPackageName()));
    }
}
