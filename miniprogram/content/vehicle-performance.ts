/** Core specifications from tangship/server/src/operations/vehicle-catalog.seed.ts. */
export const VEHICLE_PERFORMANCE: Record<string, {
  rangeKm: number;
  speedKmh: string;
  temperatureRange?: string;
}> = {
  z2: { rangeKm: 80, speedKmh: "15–25" },
  "z5-2026": { rangeKm: 120, speedKmh: "20–30" },
  "l5-max": { rangeKm: 140, speedKmh: "18–28" },
  z8: { rangeKm: 160, speedKmh: "25–35" },
  "z8-max": { rangeKm: 200, speedKmh: "25–35" },
  "z5-c": { rangeKm: 110, speedKmh: "20–30", temperatureRange: "-18°C ～ +8°C" },
  "z8-max-c": { rangeKm: 180, speedKmh: "25–35", temperatureRange: "-18°C ～ +8°C" },
  "z5-multi": { rangeKm: 120, speedKmh: "20–30" },
};
