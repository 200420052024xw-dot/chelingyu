"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPagePerformance = withPagePerformance;
/** Lightweight lifecycle timing for local development and device profiling. */
function withPagePerformance(name, options) {
    const originalOnLoad = options.onLoad;
    const originalOnReady = options.onReady;
    const originalOnShow = options.onShow;
    const mutable = options;
    mutable.onLoad = function (...args) {
        this.__pagePerfStartedAt = Date.now();
        return originalOnLoad === null || originalOnLoad === void 0 ? void 0 : originalOnLoad.apply(this, args);
    };
    mutable.onReady = function (...args) {
        const result = originalOnReady === null || originalOnReady === void 0 ? void 0 : originalOnReady.apply(this, args);
        const startedAt = this.__pagePerfStartedAt;
        if (typeof startedAt === "number") {
            console.info(`[perf] ${name} onLoad→onReady ${Date.now() - startedAt}ms`);
            delete this.__pagePerfStartedAt;
        }
        return result;
    };
    mutable.onShow = function (...args) {
        const startedAt = Date.now();
        const result = originalOnShow === null || originalOnShow === void 0 ? void 0 : originalOnShow.apply(this, args);
        console.info(`[perf] ${name} onShow sync ${Date.now() - startedAt}ms`);
        return result;
    };
    return options;
}
