/// <reference types="miniprogram-api-typings" />

declare global {
  type AppOption = WechatMiniprogram.App.Options;
  interface IAppOption {
    globalData: {
      statusBarHeight: number;
      navBarHeight: number;
      menuButtonInfo: WechatMiniprogram.ClientRect | null;
    };
  }
  function getApp(): IAppOption;
}

export {};
