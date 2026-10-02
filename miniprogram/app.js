"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const local_database_1 = require("./repositories/local-database");
const session_1 = require("./stores/session");
const env_1 = require("./config/env");
const remote_1 = require("./services/remote");
App({
    globalData: {
        statusBarHeight: 0,
        navBarHeight: 0,
        menuButtonInfo: null,
    },
    onLaunch() {
        const launchStartedAt = Date.now();
        // 打印环境配置（dev 时方便排查 key 是否生效）
        (0, env_1.reportEnvStatus)();
        // 首次启动时确保数据库结构
        (0, local_database_1.bootstrapLocalDatabase)();
        // 恢复本机业务会话
        session_1.sessionStore.bootstrap();
        // 获取系统信息，兼容微信胶囊高度
        try {
            const windowInfo = wx.getWindowInfo();
            const menuButton = wx.getMenuButtonBoundingClientRect();
            this.globalData.statusBarHeight = windowInfo.statusBarHeight;
            this.globalData.menuButtonInfo = menuButton;
            this.globalData.navBarHeight =
                (menuButton.top - windowInfo.statusBarHeight) * 2 + menuButton.height;
        }
        catch (e) {
            // 兼容旧基础库
        }
        console.info(`[perf] app onLaunch ${Date.now() - launchStartedAt}ms`);
    },
    onShow() { if ((0, remote_1.isSharedMode)())
        void remote_1.sharedPricing.syncModels().catch(error => console.warn("[models] sync failed", error)); },
    onError(err) {
        console.error("[App.onError]", err);
    },
});
