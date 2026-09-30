/** Lightweight lifecycle timing for local development and device profiling. */
export function withPagePerformance<
  TData extends WechatMiniprogram.Page.DataOption,
  TCustom extends WechatMiniprogram.Page.CustomOption,
>(name: string, options: WechatMiniprogram.Page.Options<TData, TCustom>): WechatMiniprogram.Page.Options<TData, TCustom> {
  const originalOnLoad = options.onLoad;
  const originalOnReady = options.onReady;
  const originalOnShow = options.onShow;
  const mutable = options as any;

  mutable.onLoad = function (this: any, ...args: any[]) {
    this.__pagePerfStartedAt = Date.now();
    return (originalOnLoad as any)?.apply(this, args);
  };

  mutable.onReady = function (this: any, ...args: any[]) {
    const result = (originalOnReady as any)?.apply(this, args);
    const startedAt = this.__pagePerfStartedAt;
    if (typeof startedAt === "number") {
      console.info(`[perf] ${name} onLoad→onReady ${Date.now() - startedAt}ms`);
      delete this.__pagePerfStartedAt;
    }
    return result;
  };

  mutable.onShow = function (this: any, ...args: any[]) {
    const startedAt = Date.now();
    const result = (originalOnShow as any)?.apply(this, args);
    console.info(`[perf] ${name} onShow sync ${Date.now() - startedAt}ms`);
    return result;
  };

  return options;
}
