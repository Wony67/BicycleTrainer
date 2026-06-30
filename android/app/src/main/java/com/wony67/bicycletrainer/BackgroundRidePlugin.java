package com.wony67.bicycletrainer;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;

@CapacitorPlugin(name = "BackgroundRide")
public class BackgroundRidePlugin extends Plugin {
    @PluginMethod
    public void startTracking(PluginCall call) {
        if (!hasLocationPermission()) {
            call.reject("위치 권한이 필요합니다.");
            return;
        }

        long startedAt = call.getLong("startedAt", System.currentTimeMillis());
        Intent intent = new Intent(getContext(), BackgroundRideService.class);
        intent.setAction(BackgroundRideService.ACTION_START);
        intent.putExtra(BackgroundRideService.EXTRA_STARTED_AT, startedAt);
        ContextCompat.startForegroundService(getContext(), intent);

        JSObject result = new JSObject();
        result.put("started", true);
        call.resolve(result);
    }

    @PluginMethod
    public void stopTracking(PluginCall call) {
        Intent intent = new Intent(getContext(), BackgroundRideService.class);
        intent.setAction(BackgroundRideService.ACTION_STOP);
        getContext().startService(intent);

        call.resolve(getSnapshot());
    }

    @PluginMethod
    public void getTrackingStatus(PluginCall call) {
        call.resolve(getSnapshot());
    }

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private JSObject getSnapshot() {
        BackgroundRideStore store = new BackgroundRideStore(getContext());
        JSObject result = new JSObject();
        result.put("running", store.isRunning());
        result.put("startedAt", store.getStartedAt());
        result.put("distanceKm", store.getDistanceKm());
        result.put("currentSpeed", store.getLastSpeedKmh());
        result.put("points", store.getPoints());
        result.put("autoStopped", store.snapshot().optBoolean("autoStopped", false));
        result.put("stopReason", store.snapshot().optString("stopReason", ""));
        result.put("androidVersion", Build.VERSION.SDK_INT);
        return result;
    }
}
