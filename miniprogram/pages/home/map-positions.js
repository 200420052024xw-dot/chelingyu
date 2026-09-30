"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDisplayPositions = createDisplayPositions;
function createDisplayPositions(count, center, occupied = [], random = Math.random) {
    const result = [];
    for (let i = 0; i < count; i += 1) {
        let fx = 16;
        let fy = 30;
        for (let attempt = 0; attempt < 24; attempt += 1) {
            fx = 13 + random() * 72;
            fy = 22 + random() * 34;
            if ([...occupied, ...result].every((p) => Math.hypot(p.fx - fx, p.fy - fy) > 15))
                break;
        }
        result.push({
            fx,
            fy,
            latitude: center.latitude + (50 - fy) * 0.00011,
            longitude: center.longitude + (fx - 50) * 0.00014,
        });
    }
    return result;
}
