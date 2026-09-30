"use strict";
/** 地理工具：距离、点判定。原型阶段统一 GCJ-02。 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toRadians = toRadians;
exports.haversineMeters = haversineMeters;
exports.formatDistance = formatDistance;
exports.formatEtaMinutes = formatEtaMinutes;
const EARTH_RADIUS_M = 6371000;
function toRadians(deg) {
    return (deg * Math.PI) / 180;
}
function haversineMeters(a, b) {
    const dLat = toRadians(b.latitude - a.latitude);
    const dLng = toRadians(b.longitude - a.longitude);
    const lat1 = toRadians(a.latitude);
    const lat2 = toRadians(b.latitude);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return Math.round(EARTH_RADIUS_M * c);
}
function formatDistance(meters) {
    if (meters < 1000)
        return `${meters} m`;
    return `${(meters / 1000).toFixed(1)} km`;
}
function formatEtaMinutes(min) {
    return `约 ${min} 分钟`;
}
