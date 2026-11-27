/**
 * COLOR SPLASH · 总装（main.js）
 * =====================================================================
 * 启动流程：
 *   SDK.init（埋点/广告/域名锁/存档镜像）→ 域名锁判定 → i18n → 存档
 *   → 音频 → UI/分享/引导 → 开屏分阶段加载（泼墨动画）→ 主菜单
 * 玩法：按数字涂色（对标 Color Tap 的核心循环，见 src/game/engine.js）。
 * =====================================================================
 */

import { GAME_CONFIG } from "../config/game.config.js";
import { DOMAIN_CONFIG, SHARE_BASE_URL } from "../config/domains.config.js";
import { ADS_CONFIG } from "../config/ads.config.js";
import { LOCALES, DEFAULT_LOCALE } from "../config/locales.js";
import { LEVELS, levelDef } from "../config/levels.js";
import { I18n } from "./core/i18n.js";
import { createSave } from "./core/save.js";
import { createAudio } from "./core/audio.js";
import { createAds } from "./core/ads.js";
import { createDomainGuard } from "./core/domain.js";
import { buildLevel, warmup } from "./art/levels.js";
import { paintBackdrop } from "./art/backdrop.js";
import { UI, $, $$ } from "./ui/ui.js";
import { SharePanel } from "./ui/share.js";
import { Tutorial } from "./ui/tutorial.js";

/* ------------------------------------------------------------------ */
/* 单例装配                                                            */
/* ------------------------------------------------------------------ */

/* SDK：本地 gamesdk（window.GameSDK，<script> 全局）为主，
 * 线上 pipysdk.min.js 为增强（index.html 异步加载）。init 覆盖项用 SDK 约定键。 */
const pickSdk = () => window.GameSDK || window.PipySDK || null;
const SDK_BOOT = {
  ads: ADS_CONFIG,
  protect: DOMAIN_CONFIG,
  save: { key: GAME_CONFIG.meta.saveKey },
};
const sdk = (() => {
  const s = pickSdk() || { init: () => {}, track: () => {} };
  try {
    s.init(SDK_BOOT);
  } catch (err) {
    console.warn("[sdk] init skipped", err);
  }
  /* 埋点方法兜底：SDK 缺失时静默 no-op，主流程永不阻塞 */
  for (const m of ["track", "trackLoad", "trackStart", "event"]) {
    if (typeof s[m] !== "function") s[m] = () => {};
  }
  return s;
})();

const i18n = new I18n(LOCALES);
i18n.detect();

const save = createSave({ config: GAME_CONFIG, sdk });
const audio = createAudio({ config: GAME_CONFIG, save });

/* 广告桥：配置默认关闭，静默降级 */
const ads = createAds({ config: ADS_CONFIG, audio, sdk }).init({
  onPause: () => audio.setBgm(null),
  onResume: () => {
    const scr = document.querySelector(".screen.on");
    audio.setBgm(scr && scr.id === "screen-game" ? "bgm_paint" : "bgm_menu");
  },
});

const ui = new UI({ i18n, save, audio, ads, sdk });

/* 分享面板（裂变文案 / 九平台 / 卡片） */
const share = new SharePanel({
  ui,
  i18n,
  baseUrl: SHARE_BASE_URL,
  meta: GAME_CONFIG.meta,
  getState: () => ({ lv: ui.levelId || 0 }),
  track: (name, payload) => sdk.track(name, payload),
  gameCanvas: () => $("#game-canvas"),
});
ui.attachShare(share);

/* 互动引导：完成/跳过 → 存档标记 + 右上角重看按钮 */
const tutorial = new Tutorial({
  ui,
  i18n,
  onFinish: () => {
    save.markSeenGuide();
    const guideBtn = $("#hud-guide");
    if (guideBtn) guideBtn.classList.add("on");
  },
});
ui.attachTutorial(tutorial);

/* ------------------------------------------------------------------ */
/* 域名锁（DomainGuard + 锁定弹窗）                                     */
/* ------------------------------------------------------------------ */

const domain = createDomainGuard(DOMAIN_CONFIG);

function setupDomainLock() {
  const res = domain.check();
  if (res.ok) return;
  domain.guard({
    onLock: (info) => {
      ui.open("domain");
      updateDomainBody(info.delayMs);
    },
    onTick: (secondsLeft) => updateDomainBody(secondsLeft * 1000),
  });
  $("#btn-domain-go").addEventListener("click", () => domain.goNow());
}

function updateDomainBody(msLeft) {
  const el = $("#domain-body");
  if (el) el.textContent = i18n.t("domain_redirect", { s: Math.max(1, Math.ceil(msLeft / 1000)) });
}

/* ------------------------------------------------------------------ */
/* 开屏加载（泼墨 + 颜料珠动画，非静态进度条）                          */
/* ------------------------------------------------------------------ */

function setBoot(pct, stageKey) {
  const fill = $("#boot-fill");
  const status = $("#boot-status");
  if (fill) fill.style.width = `${Math.round(pct * 100)}%`;
  if (status && stageKey) status.textContent = i18n.t(stageKey);
}

/* 轮播小贴士 */
let tipTimer = 0;
function startTips() {
  const tips = ["boot_tip_1", "boot_tip_2", "boot_tip_3", "boot_tip_4"];
  let i = 0;
  const el = $("#boot-tip");
  if (!el) return;
  el.textContent = i18n.t(tips[0]);
  tipTimer = setInterval(() => {
    i = (i + 1) % tips.length;
    el.classList.remove("show");
    setTimeout(() => {
      el.textContent = i18n.t(tips[i]);
      el.classList.add("show");
    }, 220);
  }, 2600);
}
function stopTips() { clearInterval(tipTimer); }

async function boot() {
  setupDomainLock();
  ui.showScreen("boot");
  ui.applyI18n();
  startTips();

  /* 分阶段：预热关卡画稿（画廊缩略图零卡顿）→ 音频 → 就绪 */
  const stages = [
    ["boot_stage_scene", () => { paintBackdrop($("#bg-menu"), "menu", null); }],
    ["boot_stage_palette", () => { warmup(LEVELS.slice(0, 14).map(levelDef)); }],
    ["boot_stage_levels", () => { warmup(LEVELS.slice(14).map(levelDef)); }],
    ["boot_stage_audio", () => { audio.loadAll(); }],
    ["boot_stage_ready", () => {}],
  ];
  for (let i = 0; i < stages.length; i++) {
    const [key, fn] = stages[i];
    setBoot(i / stages.length, key);
    await new Promise((r) => setTimeout(r, 170));
    try { await fn(); } catch (e) { console.warn("[boot]", key, e); }
    sdk.trackLoad({ stage: key, pct: (i + 1) / stages.length });
  }
  setBoot(1, "boot_stage_ready");
  await new Promise((r) => setTimeout(r, 320));
  stopTips();
  ui.showScreen("menu");
  audio.setBgm("bgm_menu");
  sdk.trackStart({ lang: i18n.locale, cur: save.cur });
}

function paintMenuBg() {
  const bg = $("#bg-menu");
  if (bg) paintBackdrop(bg, "menu", null);
}

/* ------------------------------------------------------------------ */
/* 音频解锁（首手势） + BGM 场景切换                                    */
/* ------------------------------------------------------------------ */

const unlockAudio = () => {
  audio.unlock();
};
window.addEventListener("pointerdown", unlockAudio, { once: true });
window.addEventListener("keydown", unlockAudio, { once: true });

/* 屏幕切换时换 BGM（观察 .screen.on 变化） */
const screenObs = new MutationObserver(() => {
  const on = document.querySelector(".screen.on");
  if (!on) return;
  audio.setBgm(on.id === "screen-game" ? "bgm_paint" : "bgm_menu");
});
screenObs.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["class"] });

/* ------------------------------------------------------------------ */
/* 启动                                                                */
/* ------------------------------------------------------------------ */

boot();

/* ------------------------------------------------------------------ */
/* 调试 / 自动化接口（GIF 录制与验收脚本使用，正常游玩不触碰）           */
/* ------------------------------------------------------------------ */

window.__COLORSPLASH__ = {
  /** 当前画面：'boot' | 'menu' | 'gallery' | 'game' */
  screen: () => {
    const el = document.querySelector(".screen.on");
    return el ? el.id.replace("screen-", "") : "";
  },
  /** 引擎只读快照（关卡 / 进度 / 选色） */
  field: () => {
    const f = ui.field;
    if (!f) return null;
    return {
      level: f.level.def.id,
      regions: f.level.regions.length,
      filled: f.filled.size,
      selected: f.selected,
      complete: f.complete,
    };
  },
  /** 走真实链路进第 n 关（含存档解锁校验） */
  openLevel: (n) => ui.startLevel(n),
  /** 自动演示：涂下一块（GIF 录制用） */
  demoFill: () => (ui.field ? ui.field.demoFillNext() : false),
  /** 自动演示：以固定节奏涂完全关 */
  demoAuto: (intervalMs = 140) => {
    const t = setInterval(() => {
      if (!ui.field || ui.field.complete) clearInterval(t);
      else ui.field.demoFillNext();
    }, intervalMs);
    return t;
  },
  /** 内部句柄（验收断言用） */
  _internal: { ui, save, i18n, sdk, ads, buildLevel, LEVELS },
};

export {};
