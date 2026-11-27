/**
 * COLOR SPLASH · UI 层（屏幕 / 弹窗 / 色盘 / HUD / 画廊）
 * =====================================================================
 * 屏幕流：boot → menu → gallery / game(→complete)。
 * 设计规范：
 *   · 所有按钮/面板/珠子带材质光影（CSS 渐变 + 内阴影 + 高光条），
 *     禁止极简线条占位；
 *   · 单语言渲染（i18n.apply 全量覆写 data-i18n / data-i18n-ph）；
 *   · 游戏内数值一律读 config，不写死。
 * =====================================================================
 */

import { GAME_CONFIG } from "../../config/game.config.js";
import { LEVELS } from "../../config/levels.js";
import { buildLevel } from "../art/levels.js";
import { ArtRenderer, renderThumb, shade } from "../art/renderer.js";
import { paintBackdrop } from "../art/backdrop.js";
import { PlayField } from "../game/engine.js";

export const $ = (sel, root) => (root || document).querySelector(sel);
export const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

const CFG = GAME_CONFIG;

export class UI {
  /**
   * @param {object} opt {audio, save, i18n, sdk, track}
   */
  constructor(opt) {
    this.audio = opt.audio;
    this.save = opt.save;
    this.i18n = opt.i18n;
    this.sdk = opt.sdk || null;
    this.track = opt.track || (() => {});

    /* 对局会话 */
    this.field = null;
    this.renderer = null;
    this.level = null;
    this.levelId = 0;
    this.paletteUiBuilt = false;
    this._persistTimer = 0;

    this.galleryPage = 0;
    this.GALLERY_PAGE = 12;

    this._bindChrome();
    this._bindDialogs();
    this._bindGameHud();
  }

  /* ============================ 基础设施 ============================ */

  blip(name) {
    if (this.audio) this.audio.playSfx(name);
  }

  /** 单语言全量覆写 */
  applyI18n() {
    $$("[data-i18n]").forEach((el) => {
      el.textContent = this.i18n.t(el.dataset.i18n);
    });
    $$("[data-i18n-ph]").forEach((el) => {
      el.placeholder = this.i18n.t(el.dataset.i18nPh);
    });
    // <html lang> 用完整区域码（SEO / 读屏器），与 i18n 的映射保持一致
    document.documentElement.lang = this.i18n.locale === "zh" ? "zh-CN" : "en";
  }

  toast(key, vars, mood) {
    const box = $("#toast");
    if (!box) return;
    box.textContent = this.i18n.t(key, vars);
    box.dataset.mood = mood || "";
    box.classList.add("on");
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => box.classList.remove("on"), 2200);
  }

  showScreen(name) {
    $$(".screen").forEach((s) => s.classList.toggle("on", s.id === `screen-${name}`));
    if (name === "menu") {
      paintBackdrop($("#bg-menu"), "menu", null);
      this._syncMenu();
    }
    if (name === "gallery") paintBackdrop($("#bg-gallery"), "menu", null);
    if (name === "gallery") this.renderGallery();
  }

  open(name) {
    const dlg = $(`#dlg-${name}`);
    if (dlg) dlg.classList.add("on");
    $("#overlay").classList.add("on");
    this.blip("ui_open");
  }

  close(name) {
    const dlg = name ? $(`#dlg-${name}`) : null;
    if (dlg) dlg.classList.remove("on");
    const anyOpen = $$(".dlg.on").length > 0;
    if (!anyOpen) $("#overlay").classList.remove("on");
    this.blip("ui_back");
  }

  closeAll() {
    $$(".dlg.on").forEach((d) => d.classList.remove("on"));
    $("#overlay").classList.remove("on");
  }

  /* ============================ 外壳绑定 ============================ */

  _bindChrome() {
    /* 主菜单 */
    const on = (id, fn) => {
      const el = $(id);
      if (el) el.addEventListener("click", () => { this.blip("ui_click"); fn(); });
    };
    on("#btn-play", () => this.startLevel(this.save.cur));
    on("#btn-levels", () => this.showScreen("gallery"));
    on("#btn-howto", () => this.open("howto"));
    on("#btn-settings", () => { this._syncSettings(); this.open("settings"); });
    on("#btn-share", () => { if (this.sharePanel) this.sharePanel.open(); });
    on("#btn-reset", () => this.open("confirm"));
    on("#btn-menu-share", () => { if (this.sharePanel) this.sharePanel.open(); });
    /* 画廊 */
    on("#btn-gallery-back", () => this.showScreen("menu"));
    on("#btn-page-prev", () => this.page(-1));
    on("#btn-page-next", () => this.page(1));
    /* 确认清档 */
    on("#btn-confirm-no", () => this.close("confirm"));
    on("#btn-confirm-yes", () => {
      this.save.reset();
      this.close("confirm");
      this.toast("menu_reset_done", null, "good");
      this._syncMenu();
    });
    /* 设置弹窗开关 */
    const bindToggle = (id, key) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("click", () => {
        const next = !this.save.settings[key];
        this.save.setSetting(key, next);
        this._syncSettings();
        this.blip("ui_click");
      });
    };
    bindToggle("#set-sound", "sound");
    bindToggle("#set-music", "music");
    bindToggle("#set-effects", "effects");
    on("#btn-settings-close", () => this.close("settings"));
    on("#btn-howto-close", () => this.close("howto"));
    /* 完成弹窗 */
    on("#btn-complete-next", () => {
      this.closeAll();
      this.startLevel(Math.min(this.save.cur, LEVELS.length));
    });
    on("#btn-complete-gallery", () => {
      this.closeAll();
      this.showScreen("gallery");
    });
    on("#btn-complete-share", () => {
      if (this.sharePanel) this.sharePanel.open();
    });
    on("#btn-complete-close", () => this.closeAll());
    /* 通用弹窗遮罩点击关闭（域名锁弹窗除外：不可点掉） */
    $("#overlay").addEventListener("click", () => {
      if ($("#dlg-domain").classList.contains("on")) return;
      this.closeAll();
    });
    $("#btn-share-close").addEventListener("click", () => this.close("share"));
    /* 阻止 iOS 双击缩放（画布手势自管） */
    document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });
  }

  _bindDialogs() { /* 结构见 index.html，绑定在 _bindChrome 内完成 */ }

  _syncSettings() {
    const s = this.save.settings;
    const sync = (id, v) => {
      const el = $(id);
      if (el) {
        el.classList.toggle("on", !!v);
        el.setAttribute("aria-checked", String(!!v));
      }
    };
    sync("#set-sound", s.sound);
    sync("#set-music", s.music);
    sync("#set-effects", s.effects);
  }

  _syncMenu() {
    const done = this.save.doneCount;
    const cur = this.save.cur;
    const stats = $("#menu-stats");
    if (stats) stats.textContent = this.i18n.t("levels_sub", { done, total: LEVELS.length });
    const play = $("#btn-play .btn-label");
    if (play) {
      play.textContent = cur > 1 || done > 0
        ? this.i18n.t("menu_continue", { n: cur })
        : this.i18n.t("menu_play");
    }
  }

  /* ============================ 画廊 ============================ */

  page(dir) {
    const pages = Math.ceil(LEVELS.length / this.GALLERY_PAGE);
    this.galleryPage = Math.max(0, Math.min(pages - 1, this.galleryPage + dir));
    this.renderGallery();
    this.blip("ui_click");
  }

  renderGallery() {
    const grid = $("#gallery-grid");
    if (!grid) return;
    const pages = Math.ceil(LEVELS.length / this.GALLERY_PAGE);
    this.galleryPage = Math.min(this.galleryPage, pages - 1);
    const start = this.galleryPage * this.GALLERY_PAGE;
    grid.innerHTML = "";
    const pageLabel = $("#gallery-page-label");
    if (pageLabel) pageLabel.textContent = this.i18n.t("levels_page", { a: this.galleryPage + 1, b: pages });
    const sub = $("#gallery-sub");
    if (sub) sub.textContent = this.i18n.t("levels_sub", { done: this.save.doneCount, total: LEVELS.length });

    LEVELS.slice(start, start + this.GALLERY_PAGE).forEach((def) => {
      const unlocked = this.save.isUnlocked(def.id);
      const fillRec = this.save.getFill(def.id);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "gal-card" + (unlocked ? "" : " locked");
      card.dataset.level = String(def.id);

      const level = buildLevel(def);
      const prefill = fillRec.filled.length && !fillRec.done ? new Set(fillRec.filled) : null;
      const thumb = renderThumb(level, 150, fillRec.done ? null : prefill);
      thumb.className = "gal-thumb";
      card.appendChild(thumb);

      const tag = document.createElement("span");
      tag.className = "gal-num";
      tag.textContent = String(def.id);
      card.appendChild(tag);

      if (fillRec.done) {
        const done = document.createElement("span");
        done.className = "gal-done";
        done.textContent = "✓";
        card.appendChild(done);
      } else if (!unlocked) {
        const lock = document.createElement("span");
        lock.className = "gal-lock";
        lock.innerHTML = `<svg viewBox="0 0 24 24" width="30" height="30"><path fill="#fff" d="M12 3a5 5 0 0 0-5 5v2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V8a5 5 0 0 0-5-5zm-3 7V8a3 3 0 1 1 6 0v2z"/></svg>`;
        card.appendChild(lock);
      } else if (prefill) {
        /* 进度条 */
        const pct = Math.round((fillRec.filled.length / level.regions.length) * 100);
        const bar = document.createElement("span");
        bar.className = "gal-progress";
        bar.innerHTML = `<i style="width:${pct}%"></i>`;
        card.appendChild(bar);
      }

      card.addEventListener("click", () => {
        this.blip("ui_click");
        if (!unlocked) {
          this.toast("levels_locked", null, "bad");
          return;
        }
        this.startLevel(def.id);
      });
      grid.appendChild(card);
    });
  }

  /* ============================ 对局 ============================ */

  _bindGameHud() {
    const on = (id, fn) => {
      const el = $(id);
      if (el) el.addEventListener("click", (e) => { e.stopPropagation(); this.blip("ui_click"); fn(); });
    };
    on("#hud-back", () => {
      this._teardownField();
      this.showScreen("gallery");
    });
    on("#hud-settings", () => { this._syncSettings(); this.open("settings"); });
    on("#hud-guide", () => this._startTutorial());
    const hintBtn = $("#hud-hint");
    if (hintBtn) {
      hintBtn.addEventListener("click", () => {
        this.blip("ui_click");
        if (!this.field || !this.field.hint()) this.toast("hud_palette_all_done", null, "good");
      });
    }
    /* 缩放滑杆 */
    const slider = $("#zoom-slider");
    if (slider) {
      slider.addEventListener("input", () => {
        if (this.field) this.field.setZoomT(parseFloat(slider.value));
      });
    }
  }

  _teardownField() {
    if (this.field) {
      this.field.destroy();
      this.field = null;
    }
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
  }

  /** 进入关卡（画廊 / 主菜单 / 完成弹窗共用的唯一入口） */
  startLevel(id) {
    const def = LEVELS[Math.max(0, Math.min(LEVELS.length, id) - 1)];
    this.levelId = def.id;
    this.level = buildLevel(def);
    this.closeAll();
    this.showScreen("game");
    this._syncMenu();

    /* 背景（游戏模式画室） */
    paintBackdrop($("#bg-game"), "game", this.level.palette);

    /* 渲染器 + 引擎 */
    const canvas = $("#game-canvas");
    this.renderer = new ArtRenderer(this.level);
    const rec = this.save.getFill(def.id);
    const startFilled = rec.done ? [] : rec.filled;
    this.renderer.repaint(new Set(startFilled), { selected: -1 });

    this._teardownField();
    this.field = new PlayField(canvas, this.level, this.renderer, {
      onFill: (r) => this._onFill(r),
      onWrong: () => this.blip("region_wrong"),
      onPick: (n) => { this._updateBadge(); if (this.tutorial) this.tutorial.notifyPick(n); },
      onEmptyPick: () => this.blip("ui_error"),
      onComplete: () => this._onComplete(),
      onZoom: (t) => {
        const slider = $("#zoom-slider");
        if (slider && document.activeElement !== slider) slider.value = String(t);
      },
    }, startFilled);
    this.filled = this.field.filled;  /* 与引擎共享同一集合（引用一致） */

    /* 关卡号 + 色盘 + 徽章 */
    const lvLabel = $("#hud-level");
    if (lvLabel) lvLabel.textContent = this.i18n.t("hud_level", { n: def.id });
    this._buildPalette();
    this._updateBadge();

    /* 引导按钮显隐（已完成引导则显示右上角重看按钮） */
    const guideBtn = $("#hud-guide");
    if (guideBtn) guideBtn.classList.toggle("on", !!this.save.data.seenGuide);

    /* 主循环 */
    let last = performance.now();
    const loop = (now) => {
      if (!this.field) return;
      this.field.update(now - last, now);
      this.field.render(now);
      last = now;
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);

    this.track("level_start", { lv: def.id });

    /* 首次进画 → 引导 */
    if (!this.save.data.seenGuide) {
      setTimeout(() => this._startTutorial(), 450);
    }
  }

  /** 底部色盘：1..maxN 编号颜料珠（光泽材质 CSS） */
  _buildPalette() {
    const bar = $("#palette-bar");
    if (!bar) return;
    bar.innerHTML = "";
    this.chips = new Map();
    const palette = this.level.palette.slice(0, this.level.maxN);
    palette.forEach((hex, i) => {
      const n = i + 1;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.dataset.n = String(n);
      chip.style.setProperty("--chip", hex);
      chip.style.setProperty("--chip-dark", shade(hex, -0.3));
      chip.style.setProperty("--chip-lite", shade(hex, 0.4));
      chip.innerHTML = `<i class="chip-gloss"></i><b>${n}</b><i class="chip-check">✓</i>`;
      chip.addEventListener("click", (e) => {
        e.stopPropagation();
        this._pickColor(n);
      });
      bar.appendChild(chip);
      this.chips.set(n, chip);
    });
    this._syncChips();
  }

  _pickColor(n) {
    if (!this.field) return;
    this.field.selectColor(n);
    this.blip("palette_pick");
    this._syncChips();
  }

  _syncChips() {
    if (!this.chips || !this.field) return;
    for (const [n, chip] of this.chips) {
      chip.classList.toggle("sel", this.field.selected === n);
      const done = this._colorDone(n);
      chip.classList.toggle("done", done);
    }
  }

  _colorDone(n) {
    if (!this.level) return false;
    return !this.level.regions.some((r) => r.n === n && !this.filled.has(r.idx));
  }

  /** 剩余同号区域数（放大镜徽章） */
  _remaining(n) {
    if (!this.level || n < 1) return 0;
    let c = 0;
    for (const r of this.level.regions) if (r.n === n && !this.filled.has(r.idx)) c++;
    return c;
  }

  _updateBadge() {
    const badge = $("#hint-badge");
    if (badge && this.field) {
      const rem = this.field.selected >= 1 ? this._remaining(this.field.selected) : 0;
      badge.textContent = String(rem);
      badge.classList.toggle("zero", rem === 0);
    }
  }

  _onFill(r) {
    this.filled.add(r.idx);
    /* 音效：拖动连涂用轻刷声（区分首点） */
    this.blip("brush_fill");
    /* 色珠完成态 & 徽章 */
    this._syncChips();
    this._updateBadge();
    if (this.tutorial) this.tutorial.notifyFill(r.idx);
    /* 存档节流持久化 */
    clearTimeout(this._persistTimer);
    this._persistTimer = setTimeout(() => {
      // 完成结算已按 done=true 落盘；迟到的一次性节流写入直接丢弃，
      // 否则会把完成标记覆盖回 done=false（刷新后进度丢失的根因）
      if (this.field && this.field.complete) return;
      if (this.levelId) this.save.setFill(this.levelId, [...this.filled], false);
    }, 400);
  }

  _onComplete() {
    this.save.setFill(this.levelId, [...this.filled], true);
    this.save.completeLevel(this.levelId);
    this.blip("level_complete");
    setTimeout(() => this.blip("star_pop"), 320);
    this.track("level_complete", { lv: this.levelId });
    if (this.sdk && this.sdk.event) {
      try { this.sdk.event("level_complete", { lv: this.levelId }); } catch (e) { /* 忽略 */ }
    }
    const sub = $("#complete-sub");
    if (sub) sub.textContent = this.i18n.t("complete_sub", { n: this.levelId });
    const nextBtn = $("#btn-complete-next");
    if (nextBtn) nextBtn.disabled = this.levelId >= LEVELS.length;
    setTimeout(() => this.open("complete"), 900);
  }

  /* ============================ 引导 ============================ */

  attachTutorial(tutorial) {
    this.tutorial = tutorial;
    this.sharePanel = this.sharePanel || null;
  }

  attachShare(sharePanel) {
    this.sharePanel = sharePanel;
  }

  _startTutorial() {
    if (!this.tutorial || !this.field) return;
    /* 引导需要「干净的起点」：从未涂状态演示第 1 号颜色 */
    this.tutorial.start(this.field, {
      chipRect: (n) => {
        const chip = this.chips && this.chips.get(n);
        return chip ? chip.getBoundingClientRect() : null;
      },
    });
  }
}

export default UI;
