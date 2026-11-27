/**
 * COLOR SPLASH · 域名锁配置（唯一权威来源）
 * ------------------------------------------------------------------
 * 只有 allowedHosts 白名单域名可以正常游玩；
 * 其他域名：游戏照常加载 → 加载完成后等 3 秒 → 自动跳转 pipygames.com。
 * 本文件通过 SDK.init({ protect }) 覆盖 SDK 默认值。
 */

export const DOMAIN_CONFIG = {
  enabled: true,

  allowedHosts: [
    "localhost",
    "127.0.0.1",
    "::1",
    "pipygames.com",
    "www.pipygames.com"
  ],

  redirectUrl: "https://pipygames.com",
  redirectDelayMs: 3000,

  /* file:// 双击 single.html 直接玩：必须放行，否则单机版会被跳转劫持 */
  allowFileProtocol: true,
  allowIframe: true,
  debug: true
};

/** 社媒分享落地页（分享 URL = SHARE_BASE_URL?ref=share&from=昵称&lv=关卡） */
export const SHARE_BASE_URL = "https://pipygames.com/games/color-splash/";

export default DOMAIN_CONFIG;
