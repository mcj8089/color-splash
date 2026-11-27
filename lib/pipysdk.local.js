/**
 * pipysdk.local.js · 线上 SDK 兜底壳（lib/）
 * =====================================================================
 * index.html 的加载策略：线上 https://pipygames.com/sdk/pipysdk.min.js 优先；
 * 加载失败（断网 / file:// 双击 / 域名不可达）时 document.write 引入本文件。
 *
 * 本文件是一个「最小兜底壳」：真正的本地 SDK 实现在 src/sdk/gamesdk.js
 * （window.GameSDK，含埋点/广告占位/存档/域名校验）。这里只保证
 * window.PipySDK 存在且方法不抛错，让装配层（src/main.js）任何加载
 * 顺序下都能拿到可用对象 —— 缺能力的方法一律安全 no-op。
 *
 * 注意：main.js 的装配顺序是 window.GameSDK || window.PipySDK，
 * GameSDK 在本文件之后加载，因此线上/本地 SDK 正常时本壳会被覆盖或闲置。
 * =====================================================================
 */
(function () {
  "use strict";
  /* 已有线上 SDK（或后续 gamesdk.js 定义的同名对象）则不重复定义 */
  if (window.PipySDK) return;

  /** 安全 no-op：无论传什么都静默返回 undefined */
  var noop = function () {};

  /**
   * 最小 SDK 兜底实现
   * 覆盖 main.js 会用到的全部入口，防止离线场景抛异常。
   */
  window.PipySDK = {
    /** 初始化（ ads / protect / save 配置由调用方传入） */
    init: noop,
    /** 通用埋点 */
    track: noop,
    /** 加载阶段埋点 */
    trackLoad: noop,
    /** 首次进入埋点 */
    trackStart: noop,
    /** 自定义事件埋点 */
    event: noop,
    /** 广告能力（离线兜底：永远返回“没有广告”的成功结果） */
    ads: {
      showRewarded: function (cb) { if (cb && cb.onClose) cb.onClose(false); },
      showInterstitial: function (cb) { if (cb && cb.onClose) cb.onClose(); },
      isBlocked: function () { return true; },
    },
    /** 存档能力（离线兜底：内存存档，读写即忘） */
    save: {
      get: function () { return null; },
      set: noop,
      remove: noop,
    },
  };
})();
