/** 首页只展示车辆的示意分布，不表示实时定位。每次进入页面生成一次。 */
export interface DisplayPosition {
  fx: number;
  fy: number;
  latitude: number;
  longitude: number;
}

export function createDisplayPositions(
  count: number,
  center: { latitude: number; longitude: number },
  occupied: DisplayPosition[] = [],
  random: () => number = Math.random,
): DisplayPosition[] {
  const result: DisplayPosition[] = [];
  for (let i = 0; i < count; i += 1) {
    let fx = 16;
    let fy = 30;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      fx = 13 + random() * 72;
      fy = 22 + random() * 34;
      if ([...occupied, ...result].every((p) => Math.hypot(p.fx - fx, p.fy - fy) > 15)) break;
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
