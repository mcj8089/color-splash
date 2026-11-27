/**
 * COLOR SPLASH · 广告位配置（预留位，随时可开）
 * ------------------------------------------------------------------
 * 广告账号未接入 → enabled:false，所有广告调用自动「静默降级」：
 *   激励视频模拟播放后直接发奖，插屏立即跳过，游戏逻辑零阻塞。
 * 接入账号后只改三处：enabled / provider / 各 placement 的 id。
 *
 * 广告位约定：
 *   hintBoost   激励视频：免费获得一次「自动填完当前颜色」的加速
 *   levelClear  插屏：每完成 4 关插一次（默认关）
 */

export const ADS_CONFIG = {
  enabled: false,
  provider: "mock", // none | mock | poki | crazygames | custom
  testMode: true,

  global: {
    pauseGameDuringAd: true,
    muteAudioDuringAd: true,
    fillTimeoutMs: 9000,
    simulateMs: 1300
  },

  placements: {
    hintBoost: {
      format: "rewarded", id: "", enabled: true,
      maxPerRun: 3, cooldownMs: 30000, reward: "auto_fill_color"
    },
    levelClear: {
      format: "interstitial", id: "", enabled: false,
      everyNPlays: 4, cooldownMs: 60000
    }
  },

  providerConfig: {
    poki: {
      sdkUrl: "https://game-cdn.poki.com/scripts/v2/poki-sdk.js",
      gameId: ""
    },
    crazygames: {
      sdkUrl: "https://sdk.crazygames.com/crazygames-sdk-v3.js"
    },
    custom: {
      scriptUrl: "",
      adapterGlobal: "GameAdAdapter"
    }
  },

  mockTextKey: "ad_playing"
};

export default ADS_CONFIG;
