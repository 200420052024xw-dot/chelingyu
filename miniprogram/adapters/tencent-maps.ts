/**
 * 腾讯位置服务 WebService API 适配层。
 *
 * 启用条件：ENV.tencentMapsKey 非空 + ENV.useTencentMapsWebService = true
 * 关闭时所有方法直接 reject，调用方应回落 mock 实现。
 *
 * 主要接口：
 *   - distance(a, b)        : 驾车/步行距离矩阵
 *   - geocode(address)       : 地址 → 坐标
 *   - reverseGeocode(point)  : 坐标 → 地址
 *   - route(a, b)            : 路径规划（折线坐标）
 *
 * API 文档：https://lbs.qq.com/serviceWebServiceGuide/webServiceGuide
 *   - /ws/distance/v1          距离矩阵
 *   - /ws/geocoder/v1          地理编码
 *   - /ws/geocoder/v1?get_poi=1 逆地理编码
 *   - /ws/direction/v1/driving  驾车路线规划
 *
 * 错误约定：所有方法 reject 一个带 code/message 的 Error，方便上层区分
 *   - TENCENT_KEY_MISSING  : 没填 key
 *   - TENCENT_DISABLED     : useTencentMapsWebService = false
 *   - TENCENT_HTTP_FAILED  : 网络/HTTP 失败
 *   - TENCENT_API_FAILED   : 业务 status != 0
 */

import { ENV } from "../config/env";
import type { GeoPoint } from "../contracts/types";

export class TencentMapsError extends Error {
  code:
    | "TENCENT_KEY_MISSING"
    | "TENCENT_DISABLED"
    | "TENCENT_HTTP_FAILED"
    | "TENCENT_API_FAILED";
  status?: number;
  constructor(
    code: TencentMapsError["code"],
    message: string,
    status?: number,
  ) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function ensureEnabled(): void {
  if (!ENV.useTencentMapsWebService) {
    throw new TencentMapsError(
      "TENCENT_DISABLED",
      "useTencentMapsWebService = false",
    );
  }
  if (!ENV.tencentMapsKey) {
    throw new TencentMapsError(
      "TENCENT_KEY_MISSING",
      "tencentMapsKey 未配置（miniprogram/config/env.local.ts）",
    );
  }
}

interface RequestOptions {
  path: string;
  params: Record<string, string | number>;
}

function request<T>({ path, params }: RequestOptions): Promise<T> {
  ensureEnabled();
  const qs = Object.keys(params)
    .map(
      (k) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k]))}`,
    )
    .join("&");
  const url = `${ENV.tencentMapsApiBase}${path}?${qs}&key=${ENV.tencentMapsKey}`;

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: "GET",
      timeout: ENV.requestTimeoutMs,
      success: (res: WechatMiniprogram.RequestSuccessCallbackResult) => {
        if (res.statusCode !== 200) {
          reject(
            new TencentMapsError(
              "TENCENT_HTTP_FAILED",
              `HTTP ${res.statusCode}`,
              res.statusCode,
            ),
          );
          return;
        }
        const body = res.data as any;
        // 腾讯位置服务统一响应：{ status: 0, message: "query ok", result: {...} }
        if (body && typeof body.status === "number" && body.status !== 0) {
          reject(
            new TencentMapsError(
              "TENCENT_API_FAILED",
              body.message ?? `status=${body.status}`,
              body.status,
            ),
          );
          return;
        }
        resolve(body as T);
      },
      fail: (err: WechatMiniprogram.GeneralCallbackResult) => {
        reject(
          new TencentMapsError(
            "TENCENT_HTTP_FAILED",
            err.errMsg ?? "网络请求失败",
          ),
        );
      },
    });
  });
}

// === 接口实现 ===

/**
 * 直线/驾车距离矩阵。
 * 文档：/ws/distance/v1/?mode=driving&from=lat,lng&to=lat,lng&key=xxx
 */
export async function distanceByWebService(
  from: GeoPoint,
  to: GeoPoint,
  mode: "driving" | "walking" = "driving",
): Promise<{ meters: number; durationSeconds: number }> {
  const fromStr = `${from.latitude},${from.longitude}`;
  const toStr = `${to.latitude},${to.longitude}`;
  interface DistanceResult {
    status: number;
    message: string;
    result: {
      elements: Array<{
        distance: number; // 米
        duration: number; // 秒
      }>;
    };
  }
  const res = await request<DistanceResult>({
    path: "/ws/distance/v1",
    params: { mode, from: fromStr, to: toStr },
  });
  const el = res.result.elements[0];
  if (!el) {
    throw new TencentMapsError("TENCENT_API_FAILED", "距离结果为空");
  }
  return { meters: el.distance, durationSeconds: el.duration };
}

/**
 * 地址 → 坐标（地理编码）。
 */
export async function geocodeByWebService(address: string, region?: string): Promise<GeoPoint> {
  interface GeocodeResult {
    status: number;
    result: {
      location: { lat: number; lng: number };
      title: string;
    };
  }
  const params: Record<string, string | number> = {
    address,
    output: "json",
  };
  if (region) params.region = region;
  const res = await request<GeocodeResult>({
    path: "/ws/geocoder/v1",
    params,
  });
  if (!res.result?.location) {
    throw new TencentMapsError("TENCENT_API_FAILED", "地理编码结果为空");
  }
  return { latitude: res.result.location.lat, longitude: res.result.location.lng };
}

/**
 * 坐标 → 地址（逆地理编码）。
 */
export async function reverseGeocodeByWebService(point: GeoPoint): Promise<{
  name: string;
  address: string;
  adcode: string;
}> {
  interface ReverseResult {
    status: number;
    result: {
      address: string;
      formatted_addresses?: { recommend?: string; rough?: string };
      ad_info: { adcode: string };
    };
  }
  const res = await request<ReverseResult>({
    path: "/ws/geocoder/v1",
    params: {
      location: `${point.latitude},${point.longitude}`,
      get_poi: 0,
      output: "json",
    },
  });
  if (!res.result?.address) {
    throw new TencentMapsError("TENCENT_API_FAILED", "逆地理编码结果为空");
  }
  return {
    name: res.result.formatted_addresses?.recommend || res.result.formatted_addresses?.rough || res.result.address,
    address: res.result.address,
    adcode: res.result.ad_info?.adcode ?? "",
  };
}

export interface PlaceSuggestion {
  id: string;
  title: string;
  address: string;
  city: string;
  adcode: string;
  location: GeoPoint;
}

/** 地点名称搜索；腾讯 key 未启用时由页面使用微信原生选点兜底。 */
export async function suggestPlaces(keyword: string, region?: string): Promise<PlaceSuggestion[]> {
  interface SuggestResult {
    status: number;
    data?: Array<{
      id: string;
      title: string;
      address?: string;
      city?: string;
      adcode?: string;
      location?: { lat: number; lng: number };
    }>;
  }
  const params: Record<string, string | number> = { keyword, page_size: 15, output: "json" };
  if (region) params.region = region;
  const res = await request<SuggestResult>({ path: "/ws/place/v1/suggestion", params });
  return (res.data ?? []).filter((p) => p.location).map((p) => ({
    id: p.id,
    title: p.title,
    address: p.address ?? "",
    city: p.city ?? "",
    adcode: p.adcode ?? "",
    location: { latitude: p.location!.lat, longitude: p.location!.lng },
  }));
}

/**
 * 单一出口：是否真正启用 WebService。
 */
export function isWebServiceEnabled(): boolean {
  return ENV.useTencentMapsWebService && ENV.tencentMapsKey.length > 0;
}
