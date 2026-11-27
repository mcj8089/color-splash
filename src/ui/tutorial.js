/**
 * COLOR SPLASH · 互动引导（首次进画的按键/手势教学）
 * =====================================================================
 * 两步实操式引导（对齐原作「跟着提示点」的入门体验）：
 *   第 1 步：手型光标飘到底部色盘的目标颜料上 → 玩家点选该颜色 → 进入第 2 步；
 *   第 2 步：手型光标飘到画稿上对应区域（金圈高亮 + 脉冲）→ 玩家涂中 → 弹出
 *            「继续涂色，放松一下！」短句后自动收起。
 * · 玩家按引导操作即前进，点「跳过」立即结束；
 * · 跳过/完成后，右上角出现「重看引导」按钮，随时可再学；
 * · 手型光标为内联 SVG 手绘（带渐变、投影），绝非几何占位图形。
 * =====================================================================
 */

import { $ } from "./ui.js";

/* 画家手型光标（内联 SVG：握笔的手 + 蘸满颜料的画笔） */
const HAND_SVG = `
<svg viewBox="0 0 120 120" width="96" height="96" aria-hidden="true">
  <defs>
    <linearGradient id="tut-brush" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f7b733"/>
      <stop offset="1" stop-color="#e8890c"/>
    </linearGradient>
    <linearGradient id="tut-skin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe3c9"/>
      <stop offset="1" stop-color="#f3c29b"/>
    </linearGradient>
  </defs>
  <ellipse cx="66" cy="104" rx="34" ry="8" fill="rgba(70,40,10,0.18)"/>
  <path d="M78 58 L96 34" stroke="url(#tut-brush)" stroke-width="10" stroke-linecap="round"/>
  <path d="M96 34 L110 16" stroke="#8a5a2b" stroke-width="9" stroke-linecap="round"/>
  <circle cx="112" cy="13" r="9" fill="#e63946"/>
  <circle cx="109" cy="10" r="3" fill="rgba(255,255,255,0.75)"/>
  <path d="M74 60 c-3 -9 4 -14 9 -9 l8 8 c8 -4 16 -2 18 4 c6 1 9 6 7 12 c4 4 3 10 -2 13 l-24 14 c-10 6 -24 2 -30 -8 l-8 -14 c-3 -6 3 -12 9 -9 z" fill="url(#tut-skin)" stroke="#c98d5e" stroke-width="2.4"/>
  <path d="M76 62 l12 12 M88 56 l11 11 M99 54 l8 8" stroke="#c98d5e" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
</svg>`;

export class Tutorial {
  /**
   * @param {object} opt
   * @param {import("./ui.js").UI} opt.ui
   * @param {object} opt.i18n
   * @param {Function} [opt.onFinish] 引导结束（含跳过）回调
   */
  constructor(opt) {
    this.ui = opt.ui;
    this.i18n = opt.i18n;
    this.onFinish = opt.onFinish || (() => {});
    this.active = false;
    this.step = 0;
    this.targetN = 1;
    this.targetIdx = -1;
    this.raf = 0;

    /* DOM：遮罩 + 手 + 气泡（懒建，body 直挂） */
    this.el = document.createElement("div");
    this.el.id = "tutorial-layer";
    this.el.innerHTML = `
      <div class="tut-dim"></div>
      <div class="tut-bubble"><span id="tut-text"></span></div>
      <div class="tut-hand">${HAND_SVG}</div>
      <button type="button" class="tut-skip" id="tut-skip"></button>`;
    document.body.appendChild(this.el);
    this.$text = this.el.querySelector("#tut-text");
    this.$hand = this.el.querySelector(".tut-hand");
    this.$bubble = this.el.querySelector(".tut-bubble");
    this.el.querySelector("#tut-skip").addEventListener("click", () => {
      this.ui.blip("ui_click");
      this.finish(true);
    });
  }

  /** 启动引导：field=PlayField，paletteUi=色盘 UI（提供 chipRect(n)） */
  start(field, paletteUi) {
    this.field = field;
    this.paletteUi = paletteUi;
    this.active = true;
    this.step = 0;

    /* 目标色号：选面积最大的 1 号区域所在色；目标区域取该色号中最大者 */
    let bestN = 1;
    let bestArea = 0;
    for (const r of field.level.regions) {
      if (r.n <= Math.min(2, field.level.maxN) && r.area > bestArea) {
        bestArea = r.area;
        bestN = r.n;
      }
    }
    this.targetN = bestN;
    let tgt = null;
    for (const r of field.level.regions) {
      if (r.n === bestN && (!tgt || r.area > tgt.area)) tgt = r;
    }
    this.targetIdx = tgt ? tgt.idx : -1;
    /* 引导落点：质心若被上层区域遮挡（点击会命中别的色号），
     * 就在包围盒内采样一个「点了必中本区域」的点 —— 否则玩家按引导点下去
     * 只会触发错色抖动，引导永远无法推进 */
    this.targetPt = tgt ? this._findTapPoint(tgt) : null;
    field.setGuideRegion(this.targetIdx);

    this.el.classList.add("on");
    this.el.querySelector("#tut-skip").textContent = this.i18n.t("tut_skip");
    this._showStep();
    this._loop();
  }

  /** UI 事件驱动推进（由 ui.js 转发） */
  notifyPick(n) {
    if (!this.active) return;
    if (this.step === 0 && n === this.targetN) this._advance(1);
  }

  /**
   * 第 2 步判定：玩家涂中「目标色号」的任意区域即算学会（不限定某一具体块，
   * 避免手滑涂到同色其他块时引导卡死）。传 idx 是为了兼容旧调用。
   */
  notifyFill(idx) {
    if (!this.active) return;
    const r = this.field && this.field.level.regions[idx];
    if (this.step === 1 && r && r.n === this.targetN) this._advance(2);
  }

  _showStep() {
    const key = this.step === 0 ? "tut_step1" : this.step === 1 ? "tut_step2" : "tut_step3";
    this.$text.textContent = this.i18n.t(key);
    this.el.classList.toggle("step-praise", this.step >= 2);
  }

  _advance(next) {
    this.step = next;
    if (next >= 2) {
      /* 完成：短暂表扬后收摊 */
      this._showStep();
      this.el.classList.add("fading");
      setTimeout(() => this.finish(false), 1500);
    } else {
      this._showStep();
    }
  }

  finish(skipped) {
    if (!this.active) return;
    this.active = false;
    cancelAnimationFrame(this.raf);
    this.el.classList.remove("on", "fading", "step-praise");
    if (this.field) this.field.setGuideRegion(-1);
    this.onFinish(skipped);
  }

  /**
   * 找一个「点了必中」的引导落点：
   * 优先用质心；若质心被更上层的区域遮挡（hitTest 命中别的区域），
   * 则在目标区域包围盒内随机采样，直到命中本区域为止。
   */
  _findTapPoint(r) {
    const f = this.field;
    if (!f || !f.hitTest) return r.centroid;
    if (f.hitTest(r.centroid.x, r.centroid.y) === r) return r.centroid;
    const bb = r.bbox;
    for (let i = 0; i < 80; i++) {
      const x = bb.x0 + (bb.x1 - bb.x0) * (0.18 + 0.64 * Math.random());
      const y = bb.y0 + (bb.y1 - bb.y0) * (0.18 + 0.64 * Math.random());
      if (f.hitTest(x, y) === r) return { x, y };
    }
    return r.centroid; // 兜底：极小区域采样失败时仍回质心
  }

  /** 每帧：手型光标飘向目标（色盘珠 / 画稿区域），带正弦浮动 */
  _loop() {
    if (!this.active) return;
    const tick = () => {
      if (!this.active) return;
      try {
        let tx = 0;
        let ty = 0;
        if (this.step === 0 && this.paletteUi) {
          const rect = this.paletteUi.chipRect(this.targetN);
          if (rect) {
            tx = rect.left + rect.width / 2;
            ty = rect.top - 8;
          }
        } else if (this.step === 1 && this.field && this.targetIdx >= 0) {
          const r = this.field.level.regions[this.targetIdx];
          if (r) {
            /* 用「点了必中」的落点（targetPt），质心被遮挡时引导手仍指向有效位置 */
            const pt = this.targetPt || r.centroid;
            const p = this.field.worldToScreen(pt.x, pt.y);
            const rect = this.field.canvas.getBoundingClientRect();
            tx = rect.left + p.x;
            ty = rect.top + p.y;
          }
        }
        const bob = Math.sin(performance.now() / 300) * 10;
        this.$hand.style.transform = `translate(${tx - 40}px, ${ty - 78 + bob}px)`;
        this.$bubble.style.left = `${tx}px`;
        this.$bubble.style.top = `${Math.max(12, ty - 150)}px`;
        this.$bubble.style.transform = "translateX(-50%)";
      } catch (e) { /* 目标暂时不可见则保持原位 */ }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
}

export default Tutorial;
