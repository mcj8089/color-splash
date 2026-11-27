/**
 * COLOR SPLASH · 场景背景绘制（canvas 手绘风）
 * =====================================================================
 * 禁纯色背景规范：菜单与对局背景都由 canvas 现场绘制「画室」场景——
 *   · 暖色渐变天光 + 木质画桌（对局）；
 *   · 大小错落的散景光斑（焦外 bokeh）；
 *   · 泼溅颜料斑点与柔和飘浮色块；
 *   · 极淡的画笔笔触纹理。
 * 只在尺寸变化时重绘一次，运行期零开销。
 * =====================================================================
 */

import { makeRng, blob } from "./paths.js";

/**
 * 绘制背景到画布（铺满元素尺寸）。
 * @param {HTMLCanvasElement} cv
 * @param {"menu"|"game"} mode
 * @param {string[]} [palette]
 */
export function paintBackdrop(cv, mode, palette) {
  const dpr = Math.min(2, (typeof devicePixelRatio === "number" ? devicePixelRatio : 1) || 1);
  const w = cv.clientWidth || window.innerWidth;
  const h = cv.clientHeight || window.innerHeight;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rng = makeRng(mode === "menu" ? 20261104 : 777);

  /* ---- 天光渐变 ---- */
  const sky = ctx.createLinearGradient(0, 0, w * 0.3, h);
  if (mode === "menu") {
    sky.addColorStop(0, "#fdeedc");
    sky.addColorStop(0.45, "#f9ddc0");
    sky.addColorStop(1, "#f3c9a8");
  } else {
    sky.addColorStop(0, "#f7ead8");
    sky.addColorStop(1, "#eed3b4");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  /* ---- 散景光斑 ---- */
  const bokehCols = (palette && palette.length ? palette : ["#f4a261", "#e76f51", "#2a9d8f", "#ffd166", "#e9c46a"]);
  for (let i = 0; i < 26; i++) {
    const x = rng.range(0, w);
    const y = rng.range(0, h);
    const r = rng.range(16, 90) * (mode === "menu" ? 1.4 : 1);
    const col = bokehCols[Math.floor(rng.next() * bokehCols.length) % bokehCols.length];
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, withAlpha(col, 0.16));
    g.addColorStop(1, withAlpha(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ---- 泼溅颜料斑 ---- */
  for (let i = 0; i < 7; i++) {
    const x = rng.range(w * 0.05, w * 0.95);
    const y = rng.range(h * 0.05, h * 0.95);
    const r = rng.range(26, 70);
    ctx.fillStyle = withAlpha(bokehCols[Math.floor(rng.next() * bokehCols.length) % bokehCols.length], 0.13);
    const p = new Path2D(blob(x, y, r, rng, 9, 0.5));
    ctx.fill(p);
    /* 飞溅小点 */
    for (let k = 0; k < 5; k++) {
      const a = rng.range(0, Math.PI * 2);
      const d = r * rng.range(1.2, 2.1);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rng.range(2, 6), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---- 笔触纹理（低对比长弧线） ---- */
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    const x0 = rng.range(-100, w);
    const y0 = rng.range(0, h);
    const len = rng.range(180, 520);
    ctx.strokeStyle = "rgba(120,86,60,0.05)";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x0 + len * 0.5, y0 + rng.range(-40, 40), x0 + len, y0 + rng.range(-20, 20));
    ctx.stroke();
  }

  /* ---- 对局模式：木质画桌（下半屏） ---- */
  if (mode === "game") {
    const deskY = h * 0.62;
    const desk = ctx.createLinearGradient(0, deskY, 0, h);
    desk.addColorStop(0, "rgba(146,102,60,0.55)");
    desk.addColorStop(1, "rgba(110,74,42,0.72)");
    ctx.fillStyle = desk;
    ctx.beginPath();
    ctx.moveTo(0, deskY + rng.range(-8, 8));
    for (let x = 0; x <= w; x += w / 8) {
      ctx.quadraticCurveTo(x + w / 16, deskY - 14 + rng.range(-6, 6), x + w / 8, deskY + rng.range(-8, 8));
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
    /* 木纹 */
    for (let i = 0; i < 9; i++) {
      const y = deskY + (h - deskY) * rng.range(0.05, 0.95);
      ctx.strokeStyle = "rgba(70,45,22,0.14)";
      ctx.lineWidth = rng.range(1.5, 4);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.3, y + rng.range(-14, 14), w * 0.7, y + rng.range(-14, 14), w, y + rng.range(-10, 10));
      ctx.stroke();
    }
  }

  /* ---- 暗角 ---- */
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  vg.addColorStop(0, "rgba(60,36,16,0)");
  vg.addColorStop(1, "rgba(60,36,16,0.26)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

/** #rrggbb → rgba(…,a) */
function withAlpha(hex, a) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export default paintBackdrop;
