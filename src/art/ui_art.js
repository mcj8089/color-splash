/**
 * COLOR SPLASH · UI 美术（Canvas 程序化绘制件）
 * =====================================================================
 * · drawShareCard：社媒分享卡片（1000×1000）
 *     暖纸底 + 泼溅颜料 + 游戏截图圆框 + 昵称 + 画稿徽章 + pipygames.com 水印。
 *   · drawPaletteChip：色盘珠子高光层（DOM 用 CSS，弹窗内 canvas 用这个）。
 * 全部本地 Canvas，file:// 双击也能出卡。
 * =====================================================================
 */

import { makeRng, blob, drop } from "./paths.js";

/**
 * 绘制分享卡片。
 * @param {object} opts {name, lv, shot?:HTMLCanvasElement}
 * @returns {HTMLCanvasElement}
 */
export function drawShareCard(opts) {
  const { name = "", lv = 0, shot = null } = opts || {};
  const S = 1000;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const ctx = cv.getContext("2d");
  const rng = makeRng(20261104);

  /* ---- 纸底 + 渐变 ---- */
  const bg = ctx.createLinearGradient(0, 0, S, S);
  bg.addColorStop(0, "#fff4e3");
  bg.addColorStop(0.5, "#ffe8cf");
  bg.addColorStop(1, "#ffd9b8");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  /* ---- 泼溅 ---- */
  const cols = ["#e63946", "#f4a261", "#2a9d8f", "#8338ec", "#ff6b9d", "#118ab2"];
  for (let i = 0; i < 9; i++) {
    const x = rng.range(40, S - 40);
    const y = rng.range(40, S - 40);
    ctx.fillStyle = hexA(cols[i % cols.length], 0.14);
    ctx.fill(new Path2D(blob(x, y, rng.range(24, 66), rng, 9, 0.5)));
  }

  /* ---- 标题 ---- */
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#5a3d2b";
  ctx.font = '800 66px "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
  ctx.fillText("Color Splash", S / 2, 108);
  ctx.font = '600 30px "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = "#8a6a4f";
  ctx.fillText("Paint by Numbers", S / 2, 158);

  /* ---- 截图圆角框（或颜料滴替代） ---- */
  const boxW = 620, boxH = 470, bx = (S - boxW) / 2, by = 210;
  ctx.save();
  roundRect(ctx, bx, by, boxW, boxH, 34);
  ctx.shadowColor = "rgba(90,50,20,0.35)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "#fdf8ee";
  ctx.fill();
  ctx.restore();
  if (shot) {
    ctx.save();
    roundRect(ctx, bx + 14, by + 14, boxW - 28, boxH - 28, 24);
    ctx.clip();
    /* 等比铺满裁切 */
    const sc = Math.max((boxW - 28) / shot.width, (boxH - 28) / shot.height);
    const dw = shot.width * sc;
    const dh = shot.height * sc;
    ctx.drawImage(shot, bx + 14 + (boxW - 28 - dw) / 2, by + 14 + (boxH - 28 - dh) / 2, dw, dh);
    ctx.restore();
  } else {
    /* 无截图：画三滴颜料 */
    const drips = [
      { x: S / 2 - 110, y: by + boxH / 2, c: cols[0] },
      { x: S / 2, y: by + boxH / 2 - 30, c: cols[2] },
      { x: S / 2 + 110, y: by + boxH / 2, c: cols[4] },
    ];
    for (const d of drips) {
      ctx.fillStyle = d.c;
      ctx.fill(new Path2D(drop(d.x, d.y, 46, -90)));
    }
  }

  /* ---- 画稿徽章 ---- */
  if (lv > 0) {
    const cxp = S / 2, cyp = 790;
    ctx.fillStyle = "#e63946";
    ctx.beginPath();
    ctx.arc(cxp, cyp, 66, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = '800 34px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillText(`#${lv}`, cxp, cyp - 14);
    ctx.font = '500 17px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillText("PICTURE", cxp, cyp + 16);
  }

  /* ---- 昵称 ---- */
  ctx.fillStyle = "#5a3d2b";
  ctx.font = '700 44px "Trebuchet MS", system-ui, sans-serif';
  ctx.fillText(name ? `@${name}` : "—", S / 2, lv > 0 ? 896 : 812);

  /* ---- 水印 ---- */
  ctx.fillStyle = "rgba(90,61,43,0.85)";
  roundRect(ctx, S / 2 - 170, 916, 340, 48, 24);
  ctx.fill();
  ctx.fillStyle = "#fff4e3";
  ctx.font = '700 26px "Trebuchet MS", system-ui, sans-serif';
  ctx.fillText("pipygames.com", S / 2, 941);

  return cv;
}

/** 圆角矩形路径 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexA(hex, a) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export default { drawShareCard };
