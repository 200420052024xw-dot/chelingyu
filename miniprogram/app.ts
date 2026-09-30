import { bootstrapLocalDatabase } from "./repositories/local-database";
import { sessionStore } from "./stores/session";
import { reportEnvStatus } from "./config/env";

App<IAppOption>({
  globalData: {
    statusBarHeight: 0,
    navBarHeight: 0,
    menuButtonInfo: null,
  },

  onLaunch() {
    const launchStartedAt = Date.now();
    // 打印环境配置（dev 时方便排查 key 是否生效）
    reportEnvStatus();

    // 首次启动时确保数据库结构
    bootstrapLocalDatabase();

    // 恢复本机业务会话
    sessionStore.bootstrap();

    // 获取系统信息，兼容微信胶囊高度
    try {
      const windowInfo = wx.getWindowInfo();
      const menuButton = wx.getMenuButtonBoundingClientRect();
      this.globalData.statusBarHeight = windowInfo.statusBarHeight;
      this.globalData.menuButtonInfo = menuButton;
      this.globalData.navBarHeight =
        (menuButton.top - windowInfo.statusBarHeight) * 2 + menuButton.height;
    } catch (e) {
      // 兼容旧基础库
    }
    console.info(`[perf] app onLaunch ${Date.now() - launchStartedAt}ms`);
  },

  onShow() {},

  onError(err) {
    console.error("[App.onError]", err);
  },
});
