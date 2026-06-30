package com.wony67.bicycletrainer;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class BackgroundRideStore {
    private static final String PREFS = "background_ride";
    private static final String KEY_RUNNING = "running";
    private static final String KEY_STARTED_AT = "startedAt";
    private static final String KEY_DISTANCE_KM = "distanceKm";
    private static final String KEY_POINTS = "points";
    private static final String KEY_LAST_LATITUDE = "lastLatitude";
    private static final String KEY_LAST_LONGITUDE = "lastLongitude";
    private static final String KEY_LAST_SPEED_KMH = "lastSpeedKmh";
    private static final String KEY_STATIONARY_LATITUDE = "stationaryLatitude";
    private static final String KEY_STATIONARY_LONGITUDE = "stationaryLongitude";
    private static final String KEY_STATIONARY_SINCE = "stationarySince";
    private static final String KEY_AUTO_STOPPED = "autoStopped";
    private static final String KEY_STOP_REASON = "stopReason";

    private final SharedPreferences prefs;

    public BackgroundRideStore(Context context) {
        prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public void reset(long startedAt) {
        prefs.edit()
                .clear()
                .putBoolean(KEY_RUNNING, true)
                .putLong(KEY_STARTED_AT, startedAt)
                .putFloat(KEY_DISTANCE_KM, 0f)
                .putString(KEY_POINTS, "[]")
                .putBoolean(KEY_AUTO_STOPPED, false)
                .putString(KEY_STOP_REASON, "")
                .apply();
    }

    public boolean isRunning() {
        return prefs.getBoolean(KEY_RUNNING, false);
    }

    public long getStartedAt() {
        return prefs.getLong(KEY_STARTED_AT, 0L);
    }

    public double getDistanceKm() {
        return prefs.getFloat(KEY_DISTANCE_KM, 0f);
    }

    public double getLastSpeedKmh() {
        return prefs.getFloat(KEY_LAST_SPEED_KMH, 0f);
    }

    public JSONArray getPoints() {
        try {
            return new JSONArray(prefs.getString(KEY_POINTS, "[]"));
        } catch (JSONException error) {
            return new JSONArray();
        }
    }

    public boolean hasLastLocation() {
        return prefs.contains(KEY_LAST_LATITUDE) && prefs.contains(KEY_LAST_LONGITUDE);
    }

    public double getLastLatitude() {
        return Double.longBitsToDouble(prefs.getLong(KEY_LAST_LATITUDE, 0L));
    }

    public double getLastLongitude() {
        return Double.longBitsToDouble(prefs.getLong(KEY_LAST_LONGITUDE, 0L));
    }

    public boolean hasStationaryAnchor() {
        return prefs.contains(KEY_STATIONARY_LATITUDE) && prefs.contains(KEY_STATIONARY_LONGITUDE);
    }

    public double getStationaryLatitude() {
        return Double.longBitsToDouble(prefs.getLong(KEY_STATIONARY_LATITUDE, 0L));
    }

    public double getStationaryLongitude() {
        return Double.longBitsToDouble(prefs.getLong(KEY_STATIONARY_LONGITUDE, 0L));
    }

    public long getStationarySince() {
        return prefs.getLong(KEY_STATIONARY_SINCE, 0L);
    }

    public void setStationaryAnchor(double latitude, double longitude, long since) {
        prefs.edit()
                .putLong(KEY_STATIONARY_LATITUDE, Double.doubleToRawLongBits(latitude))
                .putLong(KEY_STATIONARY_LONGITUDE, Double.doubleToRawLongBits(longitude))
                .putLong(KEY_STATIONARY_SINCE, since)
                .apply();
    }

    public void appendLocation(double latitude, double longitude, double speedKmh) {
        JSONArray points = getPoints();
        double distanceKm = getDistanceKm();

        if (hasLastLocation()) {
            double nextDistance = haversineKm(getLastLatitude(), getLastLongitude(), latitude, longitude);
            if (nextDistance < 0.2d) {
                distanceKm += nextDistance;
                points.put(createPoint(latitude, longitude));
            }
        } else {
            points.put(createPoint(latitude, longitude));
        }

        prefs.edit()
                .putFloat(KEY_DISTANCE_KM, (float) distanceKm)
                .putString(KEY_POINTS, points.toString())
                .putLong(KEY_LAST_LATITUDE, Double.doubleToRawLongBits(latitude))
                .putLong(KEY_LAST_LONGITUDE, Double.doubleToRawLongBits(longitude))
                .putFloat(KEY_LAST_SPEED_KMH, (float) Math.max(0d, speedKmh))
                .apply();
    }

    public void stop(String reason, boolean autoStopped) {
        prefs.edit()
                .putBoolean(KEY_RUNNING, false)
                .putBoolean(KEY_AUTO_STOPPED, autoStopped)
                .putString(KEY_STOP_REASON, reason == null ? "" : reason)
                .apply();
    }

    public JSONObject snapshot() {
        JSONObject result = new JSONObject();
        try {
            result.put("running", isRunning());
            result.put("startedAt", getStartedAt());
            result.put("distanceKm", getDistanceKm());
            result.put("currentSpeed", getLastSpeedKmh());
            result.put("points", getPoints());
            result.put("autoStopped", prefs.getBoolean(KEY_AUTO_STOPPED, false));
            result.put("stopReason", prefs.getString(KEY_STOP_REASON, ""));
        } catch (JSONException ignored) {
            // JSONObject only contains primitive values and arrays above.
        }
        return result;
    }

    private JSONObject createPoint(double latitude, double longitude) {
        JSONObject point = new JSONObject();
        try {
            point.put("latitude", latitude);
            point.put("longitude", longitude);
        } catch (JSONException ignored) {
            // Coordinates are finite doubles from Android Location.
        }
        return point;
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
