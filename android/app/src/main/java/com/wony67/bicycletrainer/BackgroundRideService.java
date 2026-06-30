package com.wony67.bicycletrainer;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

public class BackgroundRideService extends Service implements LocationListener {
    public static final String ACTION_START = "com.wony67.bicycletrainer.backgroundRide.START";
    public static final String ACTION_STOP = "com.wony67.bicycletrainer.backgroundRide.STOP";
    public static final String EXTRA_STARTED_AT = "startedAt";

    private static final int NOTIFICATION_ID = 6710;
    private static final String CHANNEL_ID = "ride_tracking";
    private static final long MIN_TIME_MS = 10000L;
    private static final float MIN_DISTANCE_M = 5f;
    private static final double STATIONARY_RADIUS_KM = 0.1d;
    private static final long STATIONARY_LIMIT_MS = 20L * 60L * 1000L;

    private BackgroundRideStore store;
    private LocationManager locationManager;

    @Override
    public void onCreate() {
        super.onCreate();
        store = new BackgroundRideStore(this);
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_START : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopTracking("manual", false);
            return START_NOT_STICKY;
        }

        long startedAt = intent == null ? System.currentTimeMillis() : intent.getLongExtra(EXTRA_STARTED_AT, System.currentTimeMillis());
        store.reset(startedAt);
        startForeground(NOTIFICATION_ID, createNotification());
        requestLocationUpdates();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        removeLocationUpdates();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onLocationChanged(Location location) {
        if (location == null || !store.isRunning()) return;

        double latitude = location.getLatitude();
        double longitude = location.getLongitude();
        double speedKmh = location.hasSpeed() ? location.getSpeed() * 3.6d : 0d;
        store.appendLocation(latitude, longitude, speedKmh);
        checkStationaryAutoStop(latitude, longitude);
    }

    @Override
    public void onProviderEnabled(String provider) {
        // No UI work is needed here; the WebView reads snapshots when active.
    }

    @Override
    public void onProviderDisabled(String provider) {
        // No UI work is needed here; the WebView reads snapshots when active.
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {
        // Kept for compatibility with older Android LocationListener API.
    }

    private void requestLocationUpdates() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
                && ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            store.stop("permission", false);
            stopSelf();
            return;
        }

        try {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, MIN_TIME_MS, MIN_DISTANCE_M, this);
        } catch (Exception ignored) {
            // Network provider below may still be available.
        }

        try {
            locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, MIN_TIME_MS, MIN_DISTANCE_M, this);
        } catch (Exception ignored) {
            // Some devices disable network location.
        }
    }

    private void removeLocationUpdates() {
        if (locationManager == null) return;
        try {
            locationManager.removeUpdates(this);
        } catch (Exception ignored) {
            // Service may be torn down after providers are already unavailable.
        }
    }

    private void checkStationaryAutoStop(double latitude, double longitude) {
        long now = System.currentTimeMillis();
        if (!store.hasStationaryAnchor()) {
            store.setStationaryAnchor(latitude, longitude, now);
            return;
        }

        double distanceFromAnchor = haversineKm(store.getStationaryLatitude(), store.getStationaryLongitude(), latitude, longitude);
        if (distanceFromAnchor <= STATIONARY_RADIUS_KM) {
            if (now - store.getStationarySince() >= STATIONARY_LIMIT_MS) {
                stopTracking("stationary", true);
            }
            return;
        }

        store.setStationaryAnchor(latitude, longitude, now);
    }

    private void stopTracking(String reason, boolean autoStopped) {
        removeLocationUpdates();
        store.stop(reason, autoStopped);
        stopForeground(true);
        stopSelf();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Ride tracking",
                NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Keeps Bicycle Trainer recording location in the background.");
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.createNotificationChannel(channel);
    }

    private android.app.Notification createNotification() {
        Intent activityIntent = new Intent(this, MainActivity.class);
        activityIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) pendingFlags |= PendingIntent.FLAG_IMMUTABLE;

        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, activityIntent, pendingFlags);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Bicycle Trainer")
                .setContentText("주행기록을 백그라운드에서 저장 중입니다.")
                .setSmallIcon(getApplicationInfo().icon)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double radiusKm = 6371d;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2d) * Math.sin(dLat / 2d)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2d)
                * Math.sin(dLon / 2d);
        return radiusKm * 2d * Math.atan2(Math.sqrt(a), Math.sqrt(1d - a));
    }
}
