/**
 * COLOR SPLASH · 玩法引擎
 * =====================================================================
 * 对标原作的核心循环（严格保持手感）：
 *   · 底部色盘点选色号 → 画稿上同号未涂区域呼吸高亮；
 *   · 点按同号区域 → 填色 + 弹跳 + 湿刷音效；点错色区域 → 抖动 + 错误音；
 *   · 按住拖动 → 连续涂过路径上的同号区域（节流采样）；
 *   · 缩放：右侧滑杆 / 滚轮 / 双指捏合；平移：双指拖动 或 按住空格/右键拖动；
 *   · 放大镜提示：相机平滑飞到最近的同号未涂区域并脉冲标记；
 *   · 全部涂完 → 星光彩纸 → 回调 onComplete。
 * 相机模型：屏幕 = (世界 - 中心) × scalePx + 画布半宽，scalePx = baseScale × zoom。
 * =====================================================================
 */

import { GAME_CONFIG } from "../../config/game.config.js";

const CFG = GAME_CONFIG.view;
const PLAY = GAME_CONFIG.play;

export class PlayField {
  /**
   * @param {HTMLCanvasElement} canvas 主画布
   * @param {object} level buildLevel() 产物
   * @param {ArtRenderer} renderer 该关卡的渲染器
   * @param {object} hooks {onFill(region), onComplete(), onWrong(region), onPick(n), onEmptyPick()}
   * @param {Iterable<number>} [initialFilled] 恢复存档：已涂区域 idx 集合
   */
  constructor(canvas, level, renderer, hooks, initialFilled) {
    this.canvas = canvas;
    this.level = level;
    this.renderer = renderer;
    this.hooks = hooks || {};
    this.ctx = canvas.getContext("2d");

    this.filled = new Set(initialFilled || []);
    this.selected = -1;
    this.complete = false;

    /* 相机 */
    this.zoom = 1;               // 1..maxScale（相对贴合缩放的倍数）
    this.center = { x: 500, y: 500 };
    this.baseScale = 1;
    this._camTween = null;

    /* 特效 */
    this._pops = [];             // {r, t0}
    this._shakes = [];           // {r, t0}
    this._hintIdx = -1;
    this._hintT0 = -1;
    this._confetti = [];
    this._guideIdx = -1;         // 引导系统指定的目标区域

    /* 输入状态 */
    this._pointers = new Map();  // id → {x, y}
    this._painting = false;
    this._lastPaint = 0;
    this._spaceDown = false;

    this._onResize = () => this.resize();
    if (typeof window !== "undefined") window.addEventListener("resize", this._onResize);

    this._bindInput();
    this.resize();
  }

  /* ============================ 生命周期 ============================ */

  destroy() {
    if (typeof window !== "undefined") window.removeEventListener("resize", this._onResize);
    this._unbindInput();
  }

  /** 画布尺寸变化 → 重算贴合缩放并夹回视野 */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, (typeof devicePixelRatio === "number" ? devicePixelRatio : 1) || 1);
    this.canvas.width = Math.max(2, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(2, Math.round(rect.height * dpr));
    this._dpr = dpr;
    this.baseScale = (Math.min(rect.width, rect.height) / 1000) * 0.94;
    this._clampCamera();
  }

  /* ============================ 相机 ============================ */

  get _viewW() { return this.canvas.width / this._dpr; }
  get _viewH() { return this.canvas.height / this._dpr; }

  /** 当前视觉缩放（像素比） */
  get scalePx() { return this.baseScale * this.zoom; }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.center.x) * this.scalePx + this._viewW / 2,
      y: (wy - this.center.y) * this.scalePx + this._viewH / 2,
    };
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this._viewW / 2) / this.scalePx + this.center.x,
      y: (sy - this._viewH / 2) / this.scalePx + this.center.y,
    };
  }

  /** 相机夹取：缩放范围 + 平移边界（未放大时锁中心，放大后画稿不出视野） */
  _clampCamera() {
    this.zoom = Math.max(1, Math.min(CFG.maxScale, this.zoom));
    const hx = this._viewW / 2 / this.scalePx;  /* 视野半宽（世界单位） */
    const hy = this._viewH / 2 / this.scalePx;
    /* 画稿边缘最多允许拖出视野外 12% 画稿宽度 */
    const slack = CFG.clampMargin * 1000;
    this.center.x = Math.max(Math.min(500, hx - slack), Math.min(this.center.x, Math.max(500, 1000 - hx + slack)));
    this.center.y = Math.max(Math.min(500, hy - slack), Math.min(this.center.y, Math.max(500, 1000 - hy + slack)));
  }

  /** 相机平滑飞行动画（提示/复位用） */
  flyTo(wx, wy, targetZoom, ms = 600) {
    this._camTween = {
      fromX: this.center.x, fromY: this.center.y,
      toX: wx, toY: wy,
      fromZ: this.zoom, toZ: targetZoom || this.zoom,
      t0: performance.now(), ms,
    };
  }

  resetCamera() {
    this.zoom = 1;
    this.center = { x: 500, y: 500 };
    this._camTween = null;
  }

  /** 缩放滑杆（0..1）→ zoom */
  setZoomT(t) {
    const z = 1 + (CFG.maxScale - 1) * Math.max(0, Math.min(1, t));
    this.zoom = z;
    this._clampCamera();
  }

  get zoomT() { return (this.zoom - 1) / (CFG.maxScale - 1); }

  /* ============================ 输入 ============================ */

  _bindInput() {
    const cv = this.canvas;
    this._bound = {
      down: (e) => this._onDown(e),
      move: (e) => this._onMove(e),
      up: (e) => this._onUp(e),
      wheel: (e) => this._onWheel(e),
      key: (e) => { if (e.key === " ") this._spaceDown = e.type === "keydown"; },
      ctx: (e) => e.preventDefault(),
    };
    cv.addEventListener("pointerdown", this._bound.down);
    window.addEventListener("pointermove", this._bound.move);
    window.addEventListener("pointerup", this._bound.up);
    window.addEventListener("pointercancel", this._bound.up);
    cv.addEventListener("wheel", this._bound.wheel, { passive: false });
    cv.addEventListener("contextmenu", this._bound.ctx);
    window.addEventListener("keydown", this._bound.key);
    window.addEventListener("keyup", this._bound.key);
  }

  _unbindInput() {
    const cv = this.canvas;
    if (!this._bound) return;
    cv.removeEventListener("pointerdown", this._bound.down);
    window.removeEventListener("pointermove", this._bound.move);
    window.removeEventListener("pointerup", this._bound.up);
    window.removeEventListener("pointercancel", this._bound.up);
    cv.removeEventListener("wheel", this._bound.wheel);
    cv.removeEventListener("contextmenu", this._bound.ctx);
    window.removeEventListener("keydown", this._bound.key);
    window.removeEventListener("keyup", this._bound.key);
  }

  _localPt(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  _onDown(e) {
    if (this.complete) return;
    const p = this._localPt(e);
    this._pointers.set(e.pointerId, p);
    this._camTween = null;
    /* 双指 = 捏合/平移模式；右键或空格 = 平移 */
    if (this._pointers.size >= 2 || e.button === 2 || this._spaceDown) {
      this._painting = false;
      return;
    }
    this._painting = true;
    this._paintAt(p, true);
  }

  _onMove(e) {
    const p = this._localPt(e);
    const prev = this._pointers.get(e.pointerId);
    if (!prev) return;
    this._pointers.set(e.pointerId, p);

    if (this._pointers.size >= 2) {
      /* 双指：捏合缩放 + 平移 */
      const ids = [...this._pointers.keys()];
      const a1 = this._pointers.get(ids[0]);
      const b1 = this._pointers.get(ids[1]);
      if (this._pinchLast) {
        const d1 = Math.hypot(this._pinchLast.a.x - this._pinchLast.b.x, this._pinchLast.a.y - this._pinchLast.b.y);
        const d2 = Math.hypot(a1.x - b1.x, a1.y - b1.y);
        if (d1 > 4 && d2 > 4) {
          const factor = Math.pow(d2 / d1, CFG.pinchSensitivity * 0.5);
          this.zoom *= factor;
          const midPrev = { x: (this._pinchLast.a.x + this._pinchLast.b.x) / 2, y: (this._pinchLast.a.y + this._pinchLast.b.y) / 2 };
          const midNow = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 };
          const wPrev = this.screenToWorld(midPrev.x, midPrev.y);
          this._clampCamera();
          const wNow = this.screenToWorld(midNow.x, midNow.y);
          this.center.x += wPrev.x - wNow.x;
          this.center.y += wPrev.y - wNow.y;
          this._clampCamera();
          if (this.hooks.onZoom) this.hooks.onZoom(this.zoomT);
        }
      }
      this._pinchLast = { a: { ...a1 }, b: { ...b1 } };
      return;
    }

    if (e.button === 2 || this._spaceDown) {
      /* 平移模式 */
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      this.center.x -= dx / this.scalePx;
      this.center.y -= dy / this.scalePx;
      this._clampCamera();
      return;
    }

    if (this._painting) {
      const now = performance.now();
      if (now - this._lastPaint >= PLAY.fillDragThrottleMs) {
        this._lastPaint = now;
        this._paintAt(p, false);
      }
    }
  }

  _onUp(e) {
    this._pointers.delete(e.pointerId);
    if (this._pointers.size < 2) this._pinchLast = null;
    if (this._pointers.size === 0) this._painting = false;
  }

  _onWheel(e) {
    e.preventDefault();
    if (this.complete) return;
    const p = this._localPt(e);
    const before = this.screenToWorld(p.x, p.y);
    this.zoom *= e.deltaY < 0 ? 1 + CFG.wheelZoomStep : 1 / (1 + CFG.wheelZoomStep);
    this._clampCamera();
    /* 以指针为锚缩放 */
    const after = this.screenToWorld(p.x, p.y);
    this.center.x += before.x - after.x;
    this.center.y += before.y - after.y;
    this._clampCamera();
    if (this.hooks.onZoom) this.hooks.onZoom(this.zoomT);
  }

  /* ============================ 填色 ============================ */

  /** 命中测试：世界坐标 → 区域（倒序 = 顶层优先） */
  hitTest(wx, wy) {
    const ctx = this.renderer.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // 世界坐标即画稿坐标，单位变换
    for (let i = this.level.regions.length - 1; i >= 0; i--) {
      const r = this.level.regions[i];
      if (!r.path2d) continue;
      if (r.bbox.x0 - 2 > wx || r.bbox.x1 + 2 < wx || r.bbox.y0 - 2 > wy || r.bbox.y1 + 2 < wy) continue;
      try {
        if (ctx.isPointInPath(r.path2d, wx, wy)) return r;
      } catch (err) { /* Path2D 兜底失败则跳过该区域 */ }
    }
    return null;
  }

  _paintAt(screenPt, immediate) {
    if (this.selected < 1) {
      if (immediate && this.hooks.onEmptyPick) this.hooks.onEmptyPick();
      return;
    }
    const w = this.screenToWorld(screenPt.x, screenPt.y);
    const r = this.hitTest(w.x, w.y);
    if (!r) return;
    if (this.filled.has(r.idx)) return;
    if (r.n !== this.selected) {
      /* 错色抖动（立即触发一次，拖动时不重复轰炸） */
      if (immediate) {
        this._shakes.push({ r, t0: performance.now() });
        if (this.hooks.onWrong) this.hooks.onWrong(r);
      }
      return;
    }
    this.filled.add(r.idx);
    this._pops.push({ r, t0: performance.now() });
    if (this.hooks.onFill) this.hooks.onFill(r);
    this.renderer.repaint(this.filled, { selected: this.selected });
    if (this.filled.size >= this.level.regions.length) this._complete();
  }

  /** 选色（底部色盘点击） */
  selectColor(n) {
    this.selected = n;
    this._hintIdx = -1;
    this.renderer.repaint(this.filled, { selected: n });
    if (this.hooks.onPick) this.hooks.onPick(n);
  }

  /** 放大镜提示：飞到最近的同号未涂区域（无选色则任选最少的颜色） */
  hint() {
    let target = null;
    if (this.selected >= 1) {
      let bestD = Infinity;
      for (const r of this.level.regions) {
        if (r.n !== this.selected || this.filled.has(r.idx)) continue;
        const d = Math.hypot(r.centroid.x - this.center.x, r.centroid.y - this.center.y);
        if (d < bestD) { bestD = d; target = r; }
      }
    }
    if (!target) return false;
    this._hintIdx = target.idx;
    this._hintT0 = performance.now();
    this.flyTo(target.centroid.x, target.centroid.y, Math.max(this.zoom, 2.2), 620);
    return true;
  }

  /** 引导系统指定高亮区域 */
  setGuideRegion(idx) { this._guideIdx = idx; }

  /**
   * 自动演示：按真实填色链路涂掉「当前选中颜色」的下一块区域
   * （无选中色则自动轮转下一支可用颜料）。GIF 录制与自动化验收专用，
   * 正常游玩不触发；走同一 _paintAt 代码路径，绝不绕过判定。
   */
  demoFillNext() {
    if (this.complete) return false;
    if (this.selected < 1) {
      /* 自动选一支还有剩余区域的颜料 */
      for (let n = 1; n <= this.level.maxN; n++) {
        if (this.level.regions.some((r) => r.n === n && !this.filled.has(r.idx))) {
          this.selected = n;
          if (this.hooks.onPick) this.hooks.onPick(n);
          break;
        }
      }
    }
    for (const r of this.level.regions) {
      if (r.n === this.selected && !this.filled.has(r.idx)) {
        this.filled.add(r.idx);
        this._pops.push({ r, t0: performance.now() });
        if (this.hooks.onFill) this.hooks.onFill(r);
        this.renderer.repaint(this.filled, { selected: this.selected });
        if (this.filled.size >= this.level.regions.length) this._complete();
        return true;
      }
    }
    /* 该颜色涂完 → 清空选色，下一轮自动换色 */
    this.selected = -1;
    this.renderer.repaint(this.filled, { selected: -1 });
    return false;
  }

  _complete() {
    this.complete = true;
    this.selected = -1;
    this._spawnConfetti();
    if (this.hooks.onComplete) this.hooks.onComplete();
  }

  _spawnConfetti() {
    const colors = this.level.palette.slice(0, 8);
    const W = this._viewW;
    const H = this._viewH;
    for (let i = 0; i < PLAY.confettiCount; i++) {
      this._confetti.push({
        x: Math.random() * W,
        y: -30 - Math.random() * H * 0.4,
        vx: (Math.random() - 0.5) * 90,
        vy: 130 + Math.random() * 200,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 6,
        s: 7 + Math.random() * 9,
        col: colors[i % colors.length],
        shape: Math.random() < 0.5 ? 0 : 1, // 0=圆瓣 1=条带（都为曲线感）
      });
    }
  }

  /* ============================ 帧循环 ============================ */

  update(dtMs, now) {
    /* 相机飞行 */
    if (this._camTween) {
      const tw = this._camTween;
      const t = Math.min(1, (now - tw.t0) / tw.ms);
      const e = 1 - Math.pow(1 - t, 3);
      this.center.x = tw.fromX + (tw.toX - tw.fromX) * e;
      this.center.y = tw.fromY + (tw.toY - tw.fromY) * e;
      this.zoom = tw.fromZ + (tw.toZ - tw.fromZ) * e;
      if (this.hooks.onZoom && t < 1) this.hooks.onZoom(this.zoomT);
      if (t >= 1) this._camTween = null;
    }
    void dtMs;
    /* 彩纸物理 */
    const H = this._viewH;
    for (const c of this._confetti) {
      c.x += c.vx * (dtMs / 1000);
      c.y += c.vy * (dtMs / 1000);
      c.vy += 260 * (dtMs / 1000);
      c.rot += c.vr * (dtMs / 1000);
    }
    if (this._confetti.length && this._confetti.every((c) => c.y > H + 40)) {
      this._confetti.length = 0;
    }
  }

  /** 渲染一帧（世界变换内部处理） */
  render(now) {
    const ctx = this.ctx;
    const W = this._viewW;
    const H = this._viewH;
    ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    /* 画稿投影 */
    const s = this.scalePx;
    const ox = W / 2 - this.center.x * s;
    const oy = H / 2 - this.center.y * s;

    ctx.save();
    ctx.shadowColor = "rgba(40,26,12,0.35)";
    ctx.shadowBlur = 34 * Math.min(1.5, s);
    ctx.shadowOffsetY = 14;
    ctx.fillStyle = "#fdf8ee";
    ctx.fillRect(ox, oy, 1000 * s, 1000 * s);
    ctx.restore();

    /* 画稿本体（离屏贴图） */
    ctx.drawImage(this.renderer.canvas, ox, oy, 1000 * s, 1000 * s);

    /* 世界坐标层 */
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    this.renderer.drawHighlights(ctx, this.filled, this.selected, now,
      { hintIdx: now - this._hintT0 < PLAY.hintPulseMs ? this._hintIdx : -1 });

    /* 引导目标高亮（更醒目的金圈） */
    if (this._guideIdx >= 0) {
      const r = this.level.regions[this._guideIdx];
      if (r && r.path2d && !this.filled.has(r.idx)) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 260);
        ctx.save();
        ctx.strokeStyle = "#ffcf4d";
        ctx.lineWidth = 8 + 6 * pulse;
        ctx.globalAlpha = 0.85;
        ctx.stroke(r.path2d);
        ctx.fillStyle = "rgba(255,207,77,0.25)";
        ctx.fill(r.path2d);
        ctx.restore();
      }
    }

    /* 弹跳 / 抖动特效 */
    for (let i = this._pops.length - 1; i >= 0; i--) {
      const p = this._pops[i];
      const t = (now - p.t0) / PLAY.popMs;
      if (t >= 1) { this._pops.splice(i, 1); continue; }
      this.renderer.drawPop(ctx, p.r, t);
    }
    for (let i = this._shakes.length - 1; i >= 0; i--) {
      const p = this._shakes[i];
      const t = (now - p.t0) / PLAY.shakeMs;
      if (t >= 1) { this._shakes.splice(i, 1); continue; }
      this.renderer.drawShake(ctx, p.r, t);
    }
    ctx.restore();

    /* 彩纸（屏幕坐标） */
    if (this._confetti.length) {
      for (const c of this._confetti) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.fillStyle = c.col;
        if (c.shape === 0) {
          ctx.beginPath();
          ctx.ellipse(0, 0, c.s, c.s * 0.62, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(-c.s * 0.3, -c.s);
          ctx.quadraticCurveTo(c.s * 0.5, 0, -c.s * 0.3, c.s);
          ctx.quadraticCurveTo(-c.s * 0.9, 0, -c.s * 0.3, -c.s);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }
}

export default PlayField;
