/**
 * COLOR SPLASH · 画稿渲染器
 * =====================================================================
 * 三层绘制结构（性能关键）：
 *   1) paintCanvas（离屏 1000×1000×DPR）：所有区域的当前填色 + 描边 + 编号。
 *      只在「填色集合变化」时整体重绘，拖动连涂有节流，帧内零成本。
 *   2) highlight 层：引擎每帧对「当前选中颜色的未涂区域」描呼吸光圈（便宜）。
 *   3) effects 层：填色弹跳 / 错误抖动 / 通关彩纸，均为叠加绘制，不清底。
 * 另提供 renderThumb()：画廊卡片的全彩预览缩略图。
 * =====================================================================
 */

const PAPER = "#fbf5e9";          /* 未涂区域的画纸色 */
const INK = "#43382c";            /* 描边墨色（深棕，不是死黑） */
const LABEL = "#6b5b49";          /* 编号文字色 */
const HINT = "#8a7660";           /* 淡编号（区域很小时） */

export class ArtRenderer {
  /**
   * @param {object} level buildLevel() 产物
   */
  constructor(level) {
    this.level = level;
    this.dpr = Math.min(2, (typeof devicePixelRatio === "number" ? devicePixelRatio : 1) || 1);
    this.canvas = document.createElement("canvas");
    this.canvas.width = 1000 * this.dpr;
    this.canvas.height = 1000 * this.dpr;
    this.ctx = this.canvas.getContext("2d");
    this._filled = null;          /* 上次绘制时的已涂集合（Set） */
    this._selected = -1;          /* 上次绘制时的高亮色号（影响编号隐藏） */
  }

  /**
   * 重绘整幅画稿。
   * @param {Set<number>} filled 已涂区域 idx 集合
   * @param {object} [opts] {selected:number 当前选中色号}
   */
  repaint(filled, opts) {
    const selected = opts && Number.isFinite(opts.selected) ? opts.selected : -1;
    /* 填色集合与选中色都未变 → 跳过 */
    if (this._filled && this._selected === selected &&
        filled && this._filled.size === filled.size &&
        [...filled].every((v) => this._filled.has(v))) {
      return false;
    }
    this._filled = filled ? new Set(filled) : new Set();
    this._selected = selected;

    const ctx = this.ctx;
    const s = this.dpr;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.clearRect(0, 0, 1000, 1000);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const { regions, palette } = this.level;
    for (const r of regions) {
      if (!r.path2d) continue;
      const isFilled = this._filled.has(r.idx);
      ctx.save();
      if (isFilled) {
        const col = palette[(r.n - 1) % palette.length];
        ctx.fillStyle = col;
        ctx.fill(r.path2d);
        /* 内圈暗压：让色块有一点点「颜料厚度」的体积感 */
        ctx.strokeStyle = shade(col, -0.18);
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 9;
        ctx.stroke(r.path2d);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = PAPER;
        ctx.fill(r.path2d);
      }
      /* 描边（填色后描边变浅，模拟颜料盖线） */
      ctx.strokeStyle = isFilled ? shade(INK, 0.1) : INK;
      ctx.globalAlpha = isFilled ? 0.75 : 1;
      ctx.lineWidth = isFilled ? 4.5 : 5;
      ctx.stroke(r.path2d);
      ctx.globalAlpha = 1;
      /* 编号：未涂区域一律显示（对齐原作「每块都有数字」——
       * 小块没有数字时玩家不知道用哪支颜色，点了只会错色抖动）。
       * 字号按面积自适应；落点用 labelPt（保证在路径内）。 */
      if (!isFilled) {
        const fs = Math.max(12, Math.min(46, Math.sqrt(r.area) * 0.24));
        const p = r.labelPt || r.centroid;
        ctx.fillStyle = r.area < 2600 ? HINT : LABEL;
        ctx.font = `700 ${fs.toFixed(1)}px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(r.n), p.x, p.y);
      }
      ctx.restore();
    }
    return true;
  }

  /**
   * 每帧叠加：当前选中色的未涂区域呼吸光圈 + 光斑。
   * 在主 canvas（世界坐标系已就位）上调用。
   */
  drawHighlights(ctx, filled, selected, timeMs, opts) {
    if (!selected || selected < 1) return;
    const pulse = 0.55 + 0.45 * Math.sin(timeMs / 320);
    const col = this.level.palette[(selected - 1) % this.level.palette.length];
    const hintMode = opts && opts.hintIdx >= 0;
    for (const r of this.level.regions) {
      if (!r.path2d || filled.has(r.idx) || r.n !== selected) continue;
      const isHint = hintMode && r.idx === opts.hintIdx;
      ctx.save();
      /* 白色呼吸描边（贴近原作选中色的提示方式） */
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.globalAlpha = 0.35 + 0.4 * pulse;
      ctx.lineWidth = isHint ? 9 : 6;
      ctx.stroke(r.path2d);
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.25 + 0.35 * pulse;
      ctx.lineWidth = isHint ? 16 : 10;
      ctx.stroke(r.path2d);
      ctx.restore();
    }
  }

  /** 填色弹跳特效：区域按质心放大回弹并叠加白色闪光 */
  drawPop(ctx, r, t /* 0..1 */) {
    if (t >= 1) return;
    const ease = 1 - Math.pow(1 - t, 3);
    const scale = 1 + 0.16 * Math.sin(ease * Math.PI);
    const col = this.level.palette[(r.n - 1) % this.level.palette.length];
    ctx.save();
    ctx.translate(r.centroid.x, r.centroid.y);
    ctx.scale(scale, scale);
    ctx.translate(-r.centroid.x, -r.centroid.y);
    ctx.fillStyle = col;
    ctx.fill(r.path2d);
    ctx.globalAlpha = (1 - t) * 0.75;
    ctx.fillStyle = "#ffffff";
    ctx.fill(r.path2d);
    ctx.restore();
  }

  /** 错误抖动：区域红墨描边 + 水平抖动 */
  drawShake(ctx, r, t /* 0..1 */) {
    if (t >= 1) return;
    const wob = Math.sin(t * Math.PI * 8) * (1 - t) * 7;
    ctx.save();
    ctx.translate(wob, 0);
    ctx.strokeStyle = "rgba(214,69,80,0.9)";
    ctx.lineWidth = 6;
    ctx.stroke(r.path2d);
    ctx.restore();
  }
}

/* --------------------------- 缩略图（画廊卡片） --------------------------- */

/**
 * 渲染关卡全彩缩略图（模拟涂完的样子）。
 * @param {object} level buildLevel 产物
 * @param {number} size 输出边长
 * @param {Set<number>} [prefill] 预涂集合（展示半完成进度）
 */
export function renderThumb(level, size, prefill) {
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext("2d");
  const dpr = Math.min(2, (typeof devicePixelRatio === "number" ? devicePixelRatio : 1) || 1);
  cv.width = size * dpr;
  cv.height = size * dpr;
  cv.style.width = `${size}px`;
  cv.style.height = `${size}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.scale(size / 1000, size / 1000);
  ctx.lineJoin = "round";
  const filled = prefill || null;
  for (const r of level.regions) {
    if (!r.path2d) continue;
    const isFilled = !filled || filled.has(r.idx);
    if (isFilled) {
      const col = level.palette[(r.n - 1) % level.palette.length];
      ctx.fillStyle = col;
      ctx.fill(r.path2d);
      ctx.strokeStyle = shade(INK, 0.12);
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 5;
      ctx.stroke(r.path2d);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = PAPER;
      ctx.fill(r.path2d);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 5;
      ctx.stroke(r.path2d);
    }
  }
  return cv;
}

/* ------------------------------ 颜色工具 ------------------------------ */

/** 颜色加深/提亮：amt -1..1（负=变暗） */
export function shade(hex, amt) {
  const h = hex.replace("#", "");
  const num = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;
  if (amt >= 0) {
    r = Math.round(r + (255 - r) * amt);
    g = Math.round(g + (255 - g) * amt);
    b = Math.round(b + (255 - b) * amt);
  } else {
    r = Math.round(r * (1 + amt));
    g = Math.round(g * (1 + amt));
    b = Math.round(b * (1 + amt));
  }
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export default ArtRenderer;
