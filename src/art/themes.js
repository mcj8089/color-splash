/**
 * COLOR SPLASH · 画稿模板库（游戏的心脏）
 * =====================================================================
 * 19 个画稿模板 × 种子扰动 = 56 关不重样的填色画稿。
 * 设计规则：
 *   · 设计空间恒为 1000×1000，重要内容留边 ≥ 35；
 *   · 所有轮廓一律贝塞尔有机曲线（paths.js），禁止直线/多边形拼接感；
 *   · 每个模板返回 { bg:"主题", regions:[{n, d}] }，d 为 SVG path 字符串
 *     （或数组 = 多子路径同色区域）；
 *   · n = 色号（1 起）；相邻区域用不同 n，保证「选色后高亮块不粘连」；
 *   · 区域名册按绘制顺序（先背景后前景），渲染时按序压栈即可正确遮挡。
 * detail（0~1）控制装饰区域数量：前期关卡画面简洁、色少易上手，
 * 后期装饰繁复、色号多、更耐涂。
 * =====================================================================
 */

import {
  makeRng, polar, closedCurve, openCurve, oval, petal, leaf, heart, drop,
  softStar, crescent, waveband, tube, arcBand, blob,
} from "./paths.js";

/* ============================ 通用小工具 ============================ */

/** 水平镜像点列（对称翅膀/叶片用） */
const mirrorX = (pts, cx) =>
  pts.map((p) => ({ x: cx * 2 - p.x, y: p.y })).reverse();

/** 画稿外框：略带呼吸感的圆角大色块（每张画的背景层） */
function frame(rng, inset = 26, wob = 10) {
  const x0 = inset, y0 = inset, x1 = 1000 - inset, y1 = 1000 - inset;
  const pts = [];
  const steps = 6;
  for (let i = 0; i <= steps; i++) pts.push({ x: x0 + ((x1 - x0) * i) / steps, y: y0 + rng.range(-wob, wob) });
  for (let i = 1; i <= steps; i++) pts.push({ x: x1 + rng.range(-wob, wob), y: y0 + ((y1 - y0) * i) / steps });
  for (let i = 1; i <= steps; i++) pts.push({ x: x1 - ((x1 - x0) * i) / steps, y: y1 + rng.range(-wob, wob) });
  for (let i = 1; i < steps; i++) pts.push({ x: x0 + rng.range(-wob, wob), y: y1 - ((y1 - y0) * i) / steps });
  return closedCurve(pts, 0.5);
}

/** 小花：花瓣环 + 花芯（返回两个区域，同一位置两号） */
function smallFlower(rng, cx, cy, r, nPetal, nP, nC, rot = 0, droop = 0) {
  const regions = [];
  const arr = [];
  for (let i = 0; i < nPetal; i++) {
    arr.push(petal(cx, cy, r * rng.range(0.95, 1.12), 360 / nPetal * 0.42, rot + (360 / nPetal) * i, rng.range(-0.2, 0.2) + droop));
  }
  regions.push({ n: nP, d: arr });
  regions.push({ n: nC, d: blob(cx, cy, r * 0.34, rng, 8, 0.24) });
  return regions;
}

/** 云朵：三团错位 blob 合成一个区域（同号多子路径） */
function cloud(rng, cx, cy, s) {
  return [
    blob(cx - s * 0.55, cy + s * 0.1, s * 0.42, rng, 8, 0.3),
    blob(cx, cy - s * 0.1, s * 0.52, rng, 9, 0.28),
    blob(cx + s * 0.55, cy + s * 0.12, s * 0.4, rng, 8, 0.3),
  ];
}

/** 草丛：三五根弯叶合成一簇 */
function grassTuft(rng, cx, cy, s, n) {
  const arr = [];
  const blades = n || 4;
  for (let i = 0; i < blades; i++) {
    const dx = (i - (blades - 1) / 2) * s * 0.5;
    const ang = -90 + dx * 0.55 + rng.range(-8, 8);
    arr.push(leaf(cx + dx, cy, s * rng.range(0.8, 1.25), 13 + rng.range(-3, 3), ang, rng.range(0.3, 0.9)));
  }
  return arr;
}

/* ============================ 01 蝴蝶 ============================ */
function tButterfly(rng, detail) {
  const regions = [{ n: 1, d: frame(rng, 26, 12) }];
  const cx = 500;
  /* 右上翅锚点 → 左侧镜像 */
  const upR = [
    { x: 515, y: 470 }, { x: 610, y: 320 }, { x: 745, y: 255 },
    { x: 862, y: 315 }, { x: 872, y: 445 }, { x: 775, y: 545 }, { x: 575, y: 525 },
  ];
  const loR = [
    { x: 525, y: 545 }, { x: 690, y: 585 }, { x: 790, y: 690 },
    { x: 755, y: 800 }, { x: 640, y: 838 }, { x: 540, y: 745 },
  ];
  regions.push({ n: 2, d: [closedCurve(upR, 0.85), closedCurve(mirrorX(upR, cx), 0.85)] });
  regions.push({ n: 3, d: [closedCurve(loR, 0.85), closedCurve(mirrorX(loR, cx), 0.85)] });
  /* 翅膀内带（crescent 弧带）+ 斑点 */
  regions.push({
    n: 4,
    d: [
      arcBand(672, 402, 92, 150, 285, 40), arcBand(328, 402, 92, 255, 30, -40),
      arcBand(655, 700, 72, 120, 265, 34), arcBand(345, 700, 72, 60, -120, -34),
    ],
  });
  const spots = [];
  for (let i = 0; i < 3; i++) {
    const sx = 640 + i * 78 + rng.range(-10, 10);
    const sy = 470 - i * 34 + rng.range(-10, 10);
    spots.push(blob(sx, sy, 20 + rng.range(-4, 8), rng, 8, 0.3));
    spots.push(blob(1000 - sx, sy, 20 + rng.range(-4, 8), rng, 8, 0.3));
  }
  spots.push(blob(660, 760, 18, rng, 8, 0.3), blob(340, 760, 18, rng, 8, 0.3));
  regions.push({ n: 5, d: spots });
  /* 躯干 / 头 / 触角 */
  regions.push({ n: 6, d: oval(cx, 640, 30, 118) });
  regions.push({ n: 7, d: blob(cx, 478, 34, rng, 9, 0.2) });
  regions.push({
    n: 8,
    d: [
      tube([{ x: 488, y: 452 }, { x: 430, y: 385 }, { x: 415, y: 322 }, { x: 432, y: 296 }], 11),
      tube([{ x: 512, y: 452 }, { x: 570, y: 385 }, { x: 585, y: 322 }, { x: 568, y: 296 }], 11),
      blob(430, 290, 13, rng, 7, 0.25), blob(570, 290, 13, rng, 7, 0.25),
    ],
  });
  /* 下腹条纹 */
  regions.push({
    n: 9,
    d: [
      arcBand(cx, 640, 96, 118, 152, 26), arcBand(cx, 640, 100, 170, 205, 24),
    ],
  });
  /* 角落花与叶 */
  regions.push(...smallFlower(rng, 150, 840, 62, 6, 10, 11, 0, 0.3));
  regions.push(...smallFlower(rng, 855, 158, 54, 5, 10, 11, 22, 0.2));
  regions.push({
    n: 12,
    d: [
      leaf(215, 905, 95, 17, -35, 0.5), leaf(120, 790, 85, 15, -125, 0.5),
      leaf(795, 105, 85, 15, 150, 0.5), leaf(905, 215, 78, 14, 60, 0.5),
    ],
  });
  if (detail > 0.3) {
    const dots = [];
    for (let i = 0; i < 8; i++) {
      const a = rng.range(0, 360);
      const r = rng.range(360, 470);
      dots.push(blob(500 + Math.cos((a * Math.PI) / 180) * r, 560 + Math.sin((a * Math.PI) / 180) * r * 0.9, 11 + rng.range(0, 8), rng, 7, 0.4));
    }
    regions.push({ n: 13, d: dots });
  }
  return { bg: "garden", regions };
}

/* ============================ 02 曼陀罗 ============================ */
function tMandala(rng, detail) {
  const regions = [{ n: 1, d: frame(rng, 26, 8) }];
  const cx = 500, cy = 500;
  const layers = 3 + (detail > 0.45 ? 1 : 0);
  const petalN = rng.pick([8, 10, 12]);
  let slot = 2;
  const radii = [420, 330, 245, 168];
  for (let L = 0; L < layers; L++) {
    const r = radii[L];
    const cnt = petalN + (L % 2 === 1 ? 2 : 0);
    const arr = [];
    for (let i = 0; i < cnt; i++) {
      arr.push(petal(cx, cy, r, (360 / cnt) * 0.44, (360 / cnt) * i + (L * 360) / (cnt * 2), rng.range(-0.15, 0.15)));
    }
    regions.push({ n: slot, d: arr });
    slot++;
    /* 层间圆环带 */
    if (L < layers - 1) {
      const ringPts = [];
      const steps = 36;
      for (let i = 0; i < steps; i++) {
        const a = (360 / steps) * i;
        ringPts.push(polar(cx, cy, r - 26 + rng.range(-3, 3), a));
      }
      regions.push({ n: slot, d: blob(cx, cy, r - 30, rng, 18, 0.05) });
      slot++;
    }
  }
  /* 花芯 + 内瓣 */
  regions.push({ n: slot++, d: blob(cx, cy, 96, rng, 12, 0.1) });
  const core = [];
  for (let i = 0; i < 6; i++) core.push(petal(cx, cy, 62, 26, 60 * i + 30, 0.1));
  regions.push({ n: slot++, d: core });
  regions.push({ n: slot++, d: blob(cx, cy, 30, rng, 8, 0.2) });
  /* 外圈珍珠点 + 四角饰叶 */
  const dots = [];
  const dotR = 462;
  const dotN = petalN * 2;
  for (let i = 0; i < dotN; i++) {
    dots.push(polar(cx, cy, dotR, (360 / dotN) * i + 9));
  }
  regions.push({ n: slot++, d: dots.map((p) => blob(p.x, p.y, 13, rng, 7, 0.25)) });
  const corner = [];
  for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    corner.push(leaf(500 + dx * 395, 500 + dy * 395, 95, 16, dx > 0 ? (dy > 0 ? 135 : -135) : dy > 0 ? 45 : -45, 0.35));
  }
  regions.push({ n: slot++, d: corner });
  if (detail > 0.6) {
    /* 内层十字水滴装饰 */
    const drops = [];
    for (let i = 0; i < 4; i++) drops.push(drop(cx, cy, 34, -90 + 90 * i));
    regions.push({ n: slot++, d: drops });
  }
  return { bg: "night", regions };
}

/* ============================ 03 盆栽花 ============================ */
function tFlowerpot(rng, detail) {
  const regions = [{ n: 1, d: frame(rng, 26, 10) }];
  /* 花盆：杯形曲壁 + 沿口 */
  const pot = [
    { x: 335, y: 610 }, { x: 365, y: 830 }, { x: 430, y: 905 },
    { x: 570, y: 905 }, { x: 635, y: 830 }, { x: 665, y: 610 },
  ];
  regions.push({ n: 2, d: closedCurve(pot, 0.7) });
  regions.push({ n: 3, d: closedCurve([
    { x: 315, y: 585 }, { x: 500, y: 560 }, { x: 685, y: 585 },
    { x: 682, y: 640 }, { x: 500, y: 660 }, { x: 318, y: 640 },
  ], 0.6) });
  regions.push({ n: 4, d: closedCurve([
    { x: 355, y: 680 }, { x: 500, y: 700 }, { x: 645, y: 680 },
    { x: 620, y: 826 }, { x: 500, y: 866 }, { x: 380, y: 826 },
  ], 0.7) });
  /* 主花：大瓣环 × 2 层 + 花芯 */
  const fx = 500, fy = 300;
  const petals = [];
  for (let i = 0; i < 8; i++) petals.push(petal(fx, fy, 185, 22, 45 * i + rng.range(-4, 4), rng.range(-0.2, 0.2)));
  regions.push({ n: 5, d: petals });
  const petals2 = [];
  for (let i = 0; i < 8; i++) petals2.push(petal(fx, fy, 128, 20, 45 * i + 22, rng.range(-0.2, 0.2)));
  regions.push({ n: 6, d: petals2 });
  regions.push({ n: 7, d: blob(fx, fy, 62, rng, 10, 0.16) });
  regions.push({ n: 8, d: blob(fx, fy, 30, rng, 8, 0.3) });
  /* 侧花两朵 + 茎叶 */
  regions.push({
    n: 9,
    d: [tube([{ x: 470, y: 560 }, { x: 430, y: 500 }, { x: 300, y: 460 }], 16),
        tube([{ x: 530, y: 560 }, { x: 590, y: 495 }, { x: 712, y: 462 }], 16),
        tube([{ x: 500, y: 565 }, { x: 505, y: 620 }, { x: 498, y: 668 }], 18)],
  });
  regions.push(...smallFlower(rng, 272, 420, 78, 6, 10, 7, -8));
  regions.push(...smallFlower(rng, 738, 424, 70, 5, 11, 7, 10));
  regions.push({
    n: 12,
    d: [leaf(360, 520, 120, 19, -30, 0.45), leaf(660, 530, 115, 18, 210, -0.45),
        leaf(500, 620, 96, 16, -75, 0.2)],
  });
  /* 盆面蝴蝶结饰带 */
  regions.push({ n: 13, d: [
    heart(415, 745, 34, -18), heart(585, 745, 34, 18),
  ] });
  if (detail > 0.35) {
    const dots = [];
    for (let i = 0; i < 7; i++) dots.push(blob(rng.range(90, 910), rng.range(120, 300), rng.range(9, 16), rng, 7, 0.4));
    regions.push({ n: 14, d: dots });
  }
  return { bg: "garden", regions };
}

/* ============================ 04 热气球 ============================ */
function tBalloon(rng, detail) {
  const regions = [{ n: 1, d: frame(rng, 26, 10) }];
  /* 云层（先画，气球压上面） */
  regions.push({ n: 2, d: cloud(rng, 190, 720, 110) });
  regions.push({ n: 3, d: cloud(rng, 830, 640, 95) });
  regions.push({ n: 4, d: cloud(rng, 500, 880, 90) });
  /* 球囊：竖条纹分段（从顶点放射的瓣） */
  const bx = 500, by = 330, R = 245;
  const gores = 5 + (detail > 0.4 ? 1 : 0);
  const pts = [];
  for (let i = 0; i < 14; i++) {
    const a = -90 + (360 / 14) * i;
    const wob = 1 + Math.sin((a + 90) * (Math.PI / 180) * 3) * 0.05;
    pts.push(polar(bx, by, R * wob, a));
  }
  regions.push({ n: 5, d: closedCurve(pts, 0.85) });
  /* 瓣条：交替弧带 */
  const stripes = [];
  for (let g = 0; g < gores; g++) {
    const a0 = -90 + (360 / (gores * 2)) * (g * 2);
    const a1 = a0 + 360 / (gores * 2);
    stripes.push(arcBand(bx, by, R * 0.82, a0, a1, R * 0.14));
  }
  regions.push({ n: 6, d: stripes });
  regions.push({ n: 7, d: blob(bx, by - R * 0.55, 34, rng, 8, 0.2) });
  /* 吊篮 + 绳 */
  regions.push({ n: 8, d: closedCurve([
    { x: 420, y: 700 }, { x: 580, y: 700 }, { x: 568, y: 788 },
    { x: 500, y: 806 }, { x: 432, y: 788 },
  ], 0.6) });
  regions.push({ n: 9, d: [
    tube([{ x: 452, y: 596 }, { x: 438, y: 656 }, { x: 446, y: 700 }], 10),
    tube([{ x: 548, y: 596 }, { x: 562, y: 656 }, { x: 554, y: 700 }], 10),
    tube([{ x: 470, y: 598 }, { x: 476, y: 655 }, { x: 480, y: 700 }], 8),
    tube([{ x: 530, y: 598 }, { x: 524, y: 655 }, { x: 520, y: 700 }], 8),
  ] });
  /* 远处小气球 */
  regions.push({ n: 10, d: blob(828, 240, 58, rng, 12, 0.08) });
  regions.push({ n: 11, d: closedCurve([
    { x: 806, y: 306 }, { x: 850, y: 306 }, { x: 842, y: 336 }, { x: 814, y: 336 },
  ], 0.6) });
  regions.push({ n: 12, d: blob(172, 380, 40, rng, 12, 0.1) });
  regions.push({ n: 13, d: closedCurve([
    { x: 156, y: 428 }, { x: 188, y: 428 }, { x: 182, y: 450 }, { x: 162, y: 450 },
  ], 0.6) });
  if (detail > 0.5) {
    const birds = [];
    for (const [bxp, byp] of [[300, 190], [355, 225], [680, 170]]) {
      birds.push(tube([
        { x: bxp - 34, y: byp }, { x: bxp - 12, y: byp - 12 }, { x: bxp, y: byp },
        { x: bxp + 12, y: byp - 12 }, { x: bxp + 34, y: byp },
      ], 7));
    }
    regions.push({ n: 14, d: birds });
  }
  return { bg: "sunset", regions };
}

/* ============================ 05 锦鲤池塘 ============================ */
function tKoi(rng, detail) {
  const regions = [{ n: 1, d: frame(rng, 26, 10) }];
  /* 池塘水面 */
  regions.push({ n: 2, d: blob(500, 500, 430, rng, 16, 0.07) });
  /* 涟漪弧带 */
  regions.push({ n: 3, d: [
    arcBand(700, 260, 90, 120, 320, 14), arcBand(712, 250, 124, 130, 300, 12),
    arcBand(230, 750, 100, 300, 500, 14),
  ] });
  /* 锦鲤：弯月形身体（俯视）+ 分叉尾 */
  const body = [
    { x: 330, y: 520 }, { x: 380, y: 430 }, { x: 490, y: 380 },
    { x: 620, y: 395 }, { x: 700, y: 470 }, { x: 712, y: 545 },
    { x: 660, y: 620 }, { x: 540, y: 655 }, { x: 415, y: 620 },
  ];
  regions.push({ n: 4, d: closedCurve(body, 0.8) });
  /* 尾鳍 */
  regions.push({ n: 5, d: closedCurve([
    { x: 690, y: 470 }, { x: 790, y: 380 }, { x: 830, y: 420 },
    { x: 790, y: 520 }, { x: 838, y: 580 }, { x: 762, y: 610 }, { x: 706, y: 540 },
  ], 0.75) });
  /* 胸鳍 ×2 背鳍 */
  regions.push({ n: 6, d: [
    closedCurve([{ x: 470, y: 640 }, { x: 445, y: 720 }, { x: 520, y: 730 }, { x: 545, y: 660 }], 0.7),
    closedCurve([{ x: 345, y: 500 }, { x: 280, y: 460 }, { x: 285, y: 545 }, { x: 350, y: 560 }], 0.7),
  ] });
  /* 头部 */
  regions.push({ n: 7, d: closedCurve([
    { x: 336, y: 516 }, { x: 380, y: 436 }, { x: 470, y: 392 },
    { x: 495, y: 470 }, { x: 470, y: 560 }, { x: 400, y: 600 },
  ], 0.75) });
  regions.push({ n: 8, d: blob(395, 480, 13, rng, 8, 0.25) });
  /* 斑纹 */
  regions.push({ n: 9, d: [
    blob(560, 470, 46, rng, 9, 0.25), blob(640, 540, 38, rng, 9, 0.25), blob(510, 580, 32, rng, 8, 0.3),
  ] });
  /* 睡莲叶 + 莲花 */
  regions.push({ n: 10, d: [blob(230, 260, 105, rng, 12, 0.1), blob(810, 760, 88, rng, 12, 0.1)] });
  regions.push({ n: 11, d: [
    petal(818, 232, 78, 20, -60, 0.1), petal(818, 232, 74, 19, -120, 0.1),
    petal(818, 232, 80, 20, 0, 0.1), petal(818, 232, 70, 18, -180, 0.1),
    blob(818, 232, 26, rng, 8, 0.3),
  ] });
  /* 气泡 */
  regions.push({ n: 12, d: [
    blob(160, 560, 17, rng, 8, 0.25), blob(200, 520, 11, rng, 8, 0.25),
    blob(860, 620, 15, rng, 8, 0.25), blob(890, 580, 10, rng, 8, 0.25),
  ] });
  if (detail > 0.4) {
    /* 鳞片弧带组 */
    const scales = [];
    for (let i = 0; i < 4; i++) scales.push(arcBand(560, 510, 60 + i * 26, 165, 215, 12));
    regions.push({ n: 13, d: scales });
  }
  return { bg: "ocean", regions };
}

/* ============================ 06 冰淇淋 ============================ */
function tIcecream(rng, detail) {
  const regions = [{ n: 1, d: frame(rng, 26, 12) }];
  /* 蛋筒（倒三角曲壁）+ 格纹条 */
  regions.push({ n: 2, d: closedCurve([
    { x: 372, y: 520 }, { x: 628, y: 520 }, { x: 528, y: 900 },
    { x: 500, y: 918 }, { x: 472, y: 900 },
  ], 0.6) });
  regions.push({ n: 3, d: [
    closedCurve([{ x: 396, y: 580 }, { x: 470, y: 560 }, { x: 470, y: 610 }, { x: 418, y: 626 }], 0.6),
    closedCurve([{ x: 604, y: 580 }, { x: 530, y: 560 }, { x: 530, y: 610 }, { x: 582, y: 626 }], 0.6),
    closedCurve([{ x: 452, y: 700 }, { x: 548, y: 700 }, { x: 538, y: 756 }, { x: 462, y: 756 }], 0.6),
    closedCurve([{ x: 484, y: 830 }, { x: 516, y: 830 }, { x: 508, y: 872 }, { x: 492, y: 872 }], 0.6),
  ] });
  /* 三球冰淇淋（错位堆叠） */
  regions.push({ n: 4, d: blob(408, 430, 118, rng, 11, 0.12) });
  regions.push({ n: 5, d: blob(600, 442, 108, rng, 11, 0.12) });
  regions.push({ n: 6, d: blob(502, 300, 122, rng, 11, 0.12) });
  /* 淋酱滴落 */
  regions.push({ n: 7, d: closedCurve([
    { x: 396, y: 300 }, { x: 430, y: 232 }, { x: 502, y: 196 }, { x: 578, y: 232 },
    { x: 610, y: 306 }, { x: 596, y: 352 }, { x: 566, y: 342 }, { x: 560, y: 396 },
    { x: 524, y: 402 }, { x: 516, y: 356 }, { x: 470, y: 372 }, { x: 452, y: 410 },
    { x: 418, y: 400 }, { x: 424, y: 348 }, { x: 400, y: 344 },
  ], 0.75) });
  /* 樱桃 + 高光 */
  regions.push({ n: 8, d: blob(500, 152, 44, rng, 9, 0.16) });
  regions.push({ n: 9, d: tube([{ x: 500, y: 110 }, { x: 512, y: 74 }, { x: 536, y: 56 }], 9) });
  regions.push({ n: 10, d: blob(416, 356, 15, rng, 7, 0.3) });
  /* 糖屑 */
  const sprinkle = [];
  for (let i = 0; i < 10; i++) {
    const a = rng.range(0, 360);
    const r = rng.range(30, 100);
    sprinkle.push(
      tube([{ x: 502 + Math.cos((a * Math.PI) / 180) * r, y: 300 + Math.sin((a * Math.PI) / 180) * r },
            { x: 502 + Math.cos((a * Math.PI) / 180) * (r + 26), y: 300 + Math.sin((a * Math.PI) / 180) * (r + 26) }], 8)
    );
  }
  regions.push({ n: 11, d: sprinkle });
  /* 底碟与星星点缀 */
  regions.push({ n: 12, d: waveband(120, 880, 905, 16, 3, 34) });
  if (detail > 0.3) {
    regions.push({ n: 13, d: [
      softStar(180, 210, 26, 12, 5, -90), softStar(826, 330, 30, 14, 5, -90),
      softStar(770, 150, 20, 9, 5, -90), softStar(210, 620, 24, 11, 5, -90),
    ] });
  }
  return { bg: "candy", regions };
}

/* ============================ 07 猫头鹰 ============================ */
function tOwl(rng, detail) {
  const regions = [{ n: 1, d: frame(rng, 26, 10) }];
  /* 月亮 + 远山 */
  regions.push({ n: 2, d: crescent(760, 210, 86, 10) });
  regions.push({ n: 3, d: closedCurve([
    { x: 30, y: 850 }, { x: 180, y: 760 }, { x: 330, y: 830 },
    { x: 520, y: 745 }, { x: 700, y: 835 }, { x: 900, y: 760 }, { x: 972, y: 850 }, { x: 972, y: 972 }, { x: 30, y: 972 },
  ], 0.6) });
  /* 树枝 */
  regions.push({ n: 4, d: tube([
    { x: 80, y: 792 }, { x: 300, y: 806 }, { x: 520, y: 798 }, { x: 760, y: 815 }, { x: 930, y: 800 },
  ], 34) });
  /* 身体 + 翅膀 */
  regions.push({ n: 5, d: blob(500, 520, 262, rng, 14, 0.09) });
  regions.push({ n: 6, d: [
    closedCurve([{ x: 320, y: 480 }, { x: 262, y: 580 }, { x: 300, y: 680 }, { x: 372, y: 640 }, { x: 368, y: 520 }], 0.75),
    closedCurve([{ x: 680, y: 480 }, { x: 738, y: 580 }, { x: 700, y: 680 }, { x: 628, y: 640 }, { x: 632, y: 520 }], 0.75),
  ] });
  /* 腹部羽毛盘 */
  regions.push({ n: 7, d: oval(500, 620, 150, 150) });
  /* 面盘 ×2 */
  regions.push({ n: 8, d: [blob(408, 400, 92, rng, 10, 0.1), blob(592, 400, 92, rng, 10, 0.1)] });
  /* 眼 */
  regions.push({ n: 9, d: [blob(408, 402, 52, rng, 10, 0.08), blob(592, 402, 52, rng, 10, 0.08)] });
  regions.push({ n: 10, d: [blob(408, 402, 24, rng, 9, 0.15), blob(592, 402, 24, rng, 9, 0.15)] });
  regions.push({ n: 11, d: [blob(420, 392, 9, rng, 7, 0.3), blob(604, 392, 9, rng, 7, 0.3)] });
  /* 喙 + 耳羽 */
  regions.push({ n: 12, d: [drop(500, 452, 20, 90)] });
  regions.push({ n: 13, d: [
    closedCurve([{ x: 352, y: 330 }, { x: 330, y: 262 }, { x: 396, y: 300 }, { x: 412, y: 344 }], 0.7),
    closedCurve([{ x: 648, y: 330 }, { x: 670, y: 262 }, { x: 604, y: 300 }, { x: 588, y: 344 }], 0.7),
  ] });
  /* 腹纹（弧带排）+ 爪 */
  const bellyRows = [];
  for (let i = 0; i < 3; i++) bellyRows.push(arcBand(500, 620, 62 + i * 34, 200, 340, 13));
  regions.push({ n: 14, d: bellyRows });
  if (detail > 0.45) {
    /* 枝叶点缀 + 头顶星点 */
    regions.push({ n: 14, d: [
      ...grassTuft(rng, 220, 790, 55, 3),
      ...grassTuft(rng, 790, 806, 50, 3),
      softStar(300, 170, 20, 9, 5, -90), softStar(180, 300, 16, 7, 5, -90),
    ] });
  }
  return { bg: "night", regions };
}

/* ============================ 08 帆船出海 ============================ */
function tSailboat(rng, detail) {
  const regions = [{ n: 1, d: frame(rng, 26, 10) }];
  /* 天空占上 55% */
  regions.push({ n: 2, d: closedCurve([
    { x: 26, y: 26 }, { x: 974, y: 26 }, { x: 974, y: 540 }, { x: 26, y: 540 },
  ].map((p) => ({ x: p.x + rng.range(-3, 3), y: p.y + rng.range(-3, 3) })), 0.5) });
  /* 太阳 + 光环 */
  regions.push({ n: 3, d: blob(760, 200, 84, rng, 12, 0.08) });
  regions.push({ n: 4, d: arcBand(760, 200, 118, -80, 100, 16) });
  /* 海浪三层 */
  regions.push({ n: 5, d: closedCurve([
    { x: 26, y: 520 }, { x: 500, y: 500 }, { x: 974, y: 525 },
    { x: 974, y: 974 }, { x: 26, y: 974 },
  ], 0.5) });
  regions.push({ n: 6, d: waveband(26, 974, 700, 26, 4, 70) });
  regions.push({ n: 7, d: waveband(26, 974, 850, 30, 3, 80) });
  /* 船体 */
  regions.push({ n: 8, d: closedCurve([
    { x: 320, y: 560 }, { x: 680, y: 560 }, { x: 640, y: 660 },
    { x: 500, y: 690 }, { x: 360, y: 660 },
  ], 0.6) });
  /* 主帆 + 前帆 + 桅杆 */
  regions.push({ n: 9, d: closedCurve([
    { x: 508, y: 240 }, { x: 508, y: 538 }, { x: 342, y: 538 }, { x: 360, y: 430 }, { x: 445, y: 310 },
  ], 0.65) });
  regions.push({ n: 10, d: closedCurve([
    { x: 540, y: 280 }, { x: 540, y: 538 }, { x: 668, y: 538 }, { x: 620, y: 400 },
  ], 0.65) });
  regions.push({ n: 11, d: tube([{ x: 522, y: 610 }, { x: 522, y: 400 }, { x: 522, y: 205 }], 13) });
  /* 旗 */
  regions.push({ n: 12, d: closedCurve([
    { x: 528, y: 205 }, { x: 610, y: 222 }, { x: 528, y: 246 },
  ], 0.7) });
  /* 海鸥 + 浮标 */
  regions.push({ n: 13, d: [
    tube([{ x: 250, y: 300 }, { x: 275, y: 288 }, { x: 300, y: 300 }], 8),
    tube([{ x: 300, y: 300 }, { x: 325, y: 288 }, { x: 350, y: 300 }], 8),
    tube([{ x: 620, y: 140 }, { x: 645, y: 128 }, { x: 670, y: 140 }], 8),
  ] });
  if (detail > 0.35) {
    regions.push({ n: 14, d: [
      drop(760, 470, 16, -90), drop(820, 500, 12, -90),
      blob(160, 430, 22, rng, 8, 0.3),
    ] });
  }
  return { bg: "ocean", regions };
}

/* ============================ 09 蘑菇屋 ============================ */
function tMushroom(rng, detail) {
  const regions = [{ n: 1, d: frame(rng, 26, 10) }];
  /* 远丘 */
  regions.push({ n: 2, d: closedCurve([
    { x: 26, y: 780 }, { x: 250, y: 700 }, { x: 520, y: 768 },
    { x: 780, y: 690 }, { x: 974, y: 780 }, { x: 974, y: 974 }, { x: 26, y: 974 },
  ], 0.55) });
  /* 蘑菇伞盖（大帽）+ 斑点 */
  regions.push({ n: 3, d: closedCurve([
    { x: 175, y: 500 }, { x: 240, y: 330 }, { x: 380, y: 235 }, { x: 500, y: 205 },
    { x: 640, y: 240 }, { x: 770, y: 340 }, { x: 825, y: 500 },
    { x: 700, y: 560 }, { x: 500, y: 585 }, { x: 300, y: 560 },
  ], 0.7) });
  regions.push({ n: 4, d: [
    blob(350, 380, 46, rng, 9, 0.2), blob(560, 300, 38, rng, 9, 0.2),
    blob(690, 420, 42, rng, 9, 0.2), blob(500, 470, 30, rng, 8, 0.25),
  ] });
  /* 伞沿分带 */
  regions.push({ n: 5, d: arcBand(500, 760, 300, 200, 340, 42) });
  /* 菌柄屋身 */
  regions.push({ n: 6, d: closedCurve([
    { x: 370, y: 560 }, { x: 352, y: 850 }, { x: 420, y: 900 },
    { x: 580, y: 900 }, { x: 648, y: 850 }, { x: 630, y: 560 },
  ], 0.6) });
  /* 门 + 圆窗 */
  regions.push({ n: 7, d: closedCurve([
    { x: 440, y: 900 }, { x: 440, y: 730 }, { x: 500, y: 668 },
    { x: 560, y: 730 }, { x: 560, y: 900 },
  ], 0.6) });
  regions.push({ n: 8, d: blob(500, 800, 22, rng, 8, 0.2) });
  regions.push({ n: 9, d: [blob(398, 680, 34, rng, 9, 0.14), blob(602, 680, 34, rng, 9, 0.14)] });
  regions.push({ n: 10, d: [
    oval(398, 680, 14, 14), oval(602, 680, 14, 14),
  ] });
  /* 烟囱 + 烟 */
  regions.push({ n: 11, d: closedCurve([
    { x: 640, y: 330 }, { x: 700, y: 330 }, { x: 692, y: 240 }, { x: 648, y: 240 },
  ], 0.6) });
  regions.push({ n: 12, d: [blob(676, 196, 30, rng, 8, 0.3), blob(708, 150, 22, rng, 8, 0.3)] });
  /* 草丛 + 小蘑菇 */
  regions.push({ n: 13, d: [
    ...grassTuft(rng, 300, 892, 52, 4), ...grassTuft(rng, 706, 892, 52, 4),
  ] });
  regions.push({ n: 14, d: [
    blob(210, 872, 34, rng, 9, 0.16),
    closedCurve([{ x: 196, y: 906 }, { x: 224, y: 906 }, { x: 218, y: 956 }, { x: 202, y: 956 }], 0.6),
    blob(812, 868, 30, rng, 9, 0.16),
    closedCurve([{ x: 800, y: 898 }, { x: 826, y: 898 }, { x: 820, y: 944 }, { x: 806, y: 944 }], 0.6),
  ] });
  if (detail > 0.5) {
    regions.push({ n: 13, d: [
      blob(140, 300, 20, rng, 8, 0.35), blob(870, 560, 18, rng, 8, 0.35),
    ] });
  }
  return { bg: "garden", regions };
}

/* ============================ 10 蜗牛 ============================ */
function tSnail(rng, detail) {
  const regions = [{ n: 1, d: frame(rng, 26, 12) }];
  /* 地面叶床 */
  regions.push({ n: 2, d: closedCurve([
    { x: 26, y: 800 }, { x: 300, y: 760 }, { x: 640, y: 790 },
    { x: 974, y: 750 }, { x: 974, y: 974 }, { x: 26, y: 974 },
  ], 0.55) });
  regions.push({ n: 3, d: [leaf(300, 860, 120, 22, -10, -0.5), leaf(700, 880, 130, 24, 8, 0.5)] });
  /* 身体：从颈到尾的爬行曲线 */
  regions.push({ n: 4, d: closedCurve([
    { x: 250, y: 790 }, { x: 260, y: 700 }, { x: 320, y: 620 },
    { x: 400, y: 580 }, { x: 470, y: 600 }, { x: 460, y: 660 },
    { x: 520, y: 700 }, { x: 660, y: 720 }, { x: 790, y: 762 },
    { x: 780, y: 800 },
  ], 0.65) });
  /* 头颈 + 触角 */
  regions.push({ n: 5, d: closedCurve([
    { x: 300, y: 640 }, { x: 310, y: 540 }, { x: 370, y: 490 },
    { x: 420, y: 520 }, { x: 408, y: 610 }, { x: 370, y: 660 },
  ], 0.7) });
  regions.push({ n: 6, d: [
    tube([{ x: 340, y: 500 }, { x: 322, y: 420 }, { x: 330, y: 356 }], 12),
    tube([{ x: 396, y: 498 }, { x: 420, y: 420 }, { x: 448, y: 372 }], 12),
    blob(328, 348, 15, rng, 8, 0.25), blob(452, 364, 15, rng, 8, 0.25),
  ] });
  regions.push({ n: 7, d: [blob(352, 560, 10, rng, 7, 0.3)] });
  /* 壳：三层螺纹弧带 + 外壳圆 */
  const hx = 590, hy = 560;
  regions.push({ n: 8, d: blob(hx, hy, 190, rng, 16, 0.05) });
  regions.push({ n: 9, d: arcBand(hx, hy, 148, -130, 130, 34) });
  regions.push({ n: 10, d: arcBand(hx, hy, 92, -110, 150, 30) });
  regions.push({ n: 11, d: blob(hx, hy, 42, rng, 10, 0.12) });
  /* 壳顶装饰点 */
  regions.push({ n: 12, d: [
    blob(hx - 120, hy - 120, 14, rng, 8, 0.3), blob(hx + 130, hy - 100, 13, rng, 8, 0.3),
    blob(hx + 150, hy + 90, 15, rng, 8, 0.3),
  ] });
  if (detail > 0.4) {
    regions.push({ n: 13, d: [
      ...grassTuft(rng, 150, 800, 46, 3), ...grassTuft(rng, 880, 792, 46, 3),
      drop(830, 700, 12, 90), drop(180, 690, 11, 90),
    ] });
  }
  return { bg: "garden", regions };
}

/* ============================ 11 蜜蜂花园 ============================ */
function tBee(rng, detail) {
  const regions = [{ n: 1, d: frame(rng, 26, 12) }];
  /* 大雏菊底花 */
  const daisy = [];
  for (let i = 0; i < 14; i++) daisy.push(petal(500, 820, 195, 13, 360 / 14 * i, 0.25));
  regions.push({ n: 2, d: daisy });
  regions.push({ n: 3, d: blob(500, 820, 78, rng, 12, 0.1) });
  /* 蜂身：三段条纹腹 */
  regions.push({ n: 4, d: blob(470, 420, 128, rng, 12, 0.1) });
  regions.push({ n: 5, d: [
    arcBand(470, 420, 92, 60, 240, 30), arcBand(470, 420, 42, 40, 260, 26),
  ] });
  /* 头 */
  regions.push({ n: 6, d: blob(330, 380, 74, rng, 10, 0.1) });
  regions.push({ n: 7, d: [blob(312, 366, 12, rng, 7, 0.3), blob(352, 360, 12, rng, 7, 0.3)] });
  /* 触角 */
  regions.push({ n: 8, d: [
    tube([{ x: 306, y: 322 }, { x: 282, y: 262 }, { x: 292, y: 216 }], 9),
    tube([{ x: 356, y: 318 }, { x: 378, y: 258 }, { x: 366, y: 212 }], 9),
    blob(292, 210, 10, rng, 7, 0.3), blob(366, 206, 10, rng, 7, 0.3),
  ] });
  /* 翅膀 ×2 */
  regions.push({ n: 9, d: [
    blob(560, 260, 88, rng, 11, 0.14), blob(650, 330, 64, rng, 10, 0.16),
  ] });
  regions.push({ n: 10, d: [
    oval(560, 260, 34, 52, -30), oval(650, 330, 24, 38, -20),
  ] });
  /* 螫针 + 飞行点点 */
  regions.push({ n: 11, d: [
    drop(596, 452, 12, 118),
    blob(760, 560, 12, rng, 7, 0.35), blob(820, 500, 10, rng, 7, 0.35), blob(868, 448, 8, rng, 7, 0.35),
  ] });
  /* 蜂巢六角挂角 */
  regions.push({ n: 12, d: [blob(150, 170, 74, rng, 6, 0.06)] });
  regions.push({ n: 13, d: [
    oval(150, 148, 22, 24), oval(110, 196, 20, 22), oval(188, 198, 20, 22),
  ] });
  /* 侧叶 */
  regions.push({ n: 14, d: [
    leaf(160, 700, 130, 22, -40, 0.4), leaf(850, 760, 120, 21, 220, -0.4),
  ] });
  return { bg: "garden", regions };
}

/* ============================ 12 灯塔 ============================ */
function tLighthouse(rng, detail) {
  const regions = [{ n: 1, d: frame(rng, 26, 10) }];
  /* 夜空带 */
  regions.push({ n: 2, d: closedCurve([
    { x: 26, y: 26 }, { x: 974, y: 26 }, { x: 974, y: 620 }, { x: 26, y: 620 },
  ], 0.5) });
  /* 星星 */
  regions.push({ n: 3, d: [
    softStar(180, 150, 22, 10, 5, -90), softStar(320, 240, 14, 6, 5, -90),
    softStar(860, 140, 18, 8, 5, -90), softStar(760, 320, 12, 5, 5, -90),
    blob(140, 330, 10, rng, 7, 0.35), blob(560, 120, 11, rng, 7, 0.35),
  ] });
  /* 月亮 */
  regions.push({ n: 4, d: blob(812, 230, 74, rng, 12, 0.06) });
  regions.push({ n: 5, d: [blob(790, 210, 15, rng, 8, 0.3), blob(836, 252, 11, rng, 8, 0.3)] });
  /* 灯塔：塔身条纹 */
  regions.push({ n: 6, d: closedCurve([
    { x: 400, y: 620 }, { x: 430, y: 300 }, { x: 452, y: 268 },
    { x: 548, y: 268 }, { x: 570, y: 300 }, { x: 600, y: 620 },
  ], 0.5) });
  regions.push({ n: 7, d: [
    closedCurve([{ x: 424, y: 380 }, { x: 576, y: 380 }, { x: 570, y: 448 }, { x: 430, y: 448 }], 0.4),
    closedCurve([{ x: 438, y: 506 }, { x: 562, y: 506 }, { x: 556, y: 574 }, { x: 444, y: 574 }], 0.4),
  ] });
  /* 灯室 + 顶 + 门 */
  regions.push({ n: 8, d: closedCurve([
    { x: 452, y: 268 }, { x: 452, y: 196 }, { x: 548, y: 196 }, { x: 548, y: 268 },
  ], 0.5) });
  regions.push({ n: 9, d: closedCurve([
    { x: 436, y: 196 }, { x: 500, y: 120 }, { x: 564, y: 196 },
  ], 0.6) });
  regions.push({ n: 10, d: closedCurve([
    { x: 470, y: 620 }, { x: 470, y: 520 }, { x: 500, y: 492 },
    { x: 530, y: 520 }, { x: 530, y: 620 },
  ], 0.5) });
  /* 光束 */
  regions.push({ n: 11, d: [
    closedCurve([{ x: 452, y: 230 }, { x: 190, y: 150 }, { x: 190, y: 280 }, { x: 452, y: 262 }], 0.5),
    closedCurve([{ x: 548, y: 230 }, { x: 810, y: 150 }, { x: 810, y: 280 }, { x: 548, y: 262 }], 0.5),
  ] });
  /* 海 + 岩石 */
  regions.push({ n: 12, d: closedCurve([
    { x: 26, y: 620 }, { x: 974, y: 620 }, { x: 974, y: 974 }, { x: 26, y: 974 },
  ], 0.5) });
  regions.push({ n: 13, d: [
    blob(280, 800, 120, rng, 12, 0.16), blob(720, 850, 130, rng, 12, 0.16),
    blob(500, 900, 90, rng, 11, 0.18),
  ] });
  regions.push({ n: 14, d: [
    waveband(60, 420, 700, 14, 3, 22), waveband(600, 950, 730, 14, 3, 22),
  ] });
  return { bg: "night", regions };
}

/* ============================ 13 猫咪 ============================ */
function tCat(rng, detail) {
  const regions = [{ n: 1, d: frame(rng, 26, 12) }];
  /* 坐垫 */
  regions.push({ n: 2, d: closedCurve([
    { x: 190, y: 850 }, { x: 810, y: 850 }, { x: 880, y: 940 },
    { x: 500, y: 962 }, { x: 120, y: 940 },
  ], 0.6) });
  regions.push({ n: 3, d: waveband(200, 800, 900, 12, 4, 26) });
  /* 尾巴（盘到身前） */
  regions.push({ n: 4, d: tube([
    { x: 680, y: 780 }, { x: 790, y: 740 }, { x: 830, y: 650 },
    { x: 790, y: 580 }, { x: 720, y: 600 },
  ], 44) });
  /* 身体 */
  regions.push({ n: 5, d: closedCurve([
    { x: 330, y: 860 }, { x: 330, y: 620 }, { x: 390, y: 480 },
    { x: 500, y: 420 }, { x: 615, y: 480 }, { x: 672, y: 620 },
    { x: 672, y: 860 },
  ], 0.65) });
  /* 头 + 耳 */
  regions.push({ n: 6, d: blob(500, 350, 145, rng, 13, 0.07) });
  regions.push({ n: 7, d: [
    closedCurve([{ x: 390, y: 262 }, { x: 368, y: 172 }, { x: 460, y: 218 }], 0.6),
    closedCurve([{ x: 610, y: 262 }, { x: 632, y: 172 }, { x: 540, y: 218 }], 0.6),
  ] });
  regions.push({ n: 8, d: [
    closedCurve([{ x: 402, y: 254 }, { x: 392, y: 204 }, { x: 446, y: 232 }], 0.6),
    closedCurve([{ x: 598, y: 254 }, { x: 608, y: 204 }, { x: 554, y: 232 }], 0.6),
  ] });
  /* 眼鼻嘴 */
  regions.push({ n: 9, d: [
    oval(444, 340, 30, 36, -8), oval(556, 340, 30, 36, 8),
  ] });
  regions.push({ n: 10, d: [blob(444, 342, 13, rng, 8, 0.2), blob(556, 342, 13, rng, 8, 0.2)] });
  regions.push({ n: 11, d: [drop(500, 408, 13, 90)] });
  /* 嘴：W 形小弧块 */
  regions.push({ n: 12, d: closedCurve([
    { x: 482, y: 434 }, { x: 500, y: 452 }, { x: 518, y: 434 },
  ], 0.6) });
  /* 胸毛 + 前爪 */
  regions.push({ n: 13, d: [oval(500, 640, 84, 110)] });
  regions.push({ n: 14, d: [
    oval(436, 858, 52, 26), oval(564, 858, 52, 26),
  ] });
  /* 虎斑条 */
  if (detail > 0.25) {
    regions.push({ n: 5, d: [
      arcBand(500, 350, 132, -152, -128, 30), arcBand(500, 350, 138, -110, -86, 32),
      arcBand(500, 350, 132, -52, -28, 30), arcBand(500, 350, 138, -14, 14, 32),
    ] });
  }
  return { bg: "spice", regions };
}

/* ============================ 14 火箭星空 ============================ */
function tRocket(rng, detail) {
  const regions = [{ n: 1, d: frame(rng, 26, 10) }];
  /* 星空点 + 大行星环 */
  const stars = [];
  for (let i = 0; i < 10; i++) {
    const x = rng.range(90, 910), y = rng.range(90, 910);
    if (y > 380 && x > 330 && x < 670) continue;
    stars.push(softStar(x, y, rng.range(10, 22), rng.range(4, 9), 5, rng.range(0, 72)));
  }
  regions.push({ n: 2, d: stars });
  regions.push({ n: 3, d: blob(760, 260, 120, rng, 14, 0.06) });
  regions.push({ n: 4, d: arcBand(760, 260, 158, -18, 22, 26) });
  regions.push({ n: 5, d: [blob(724, 226, 26, rng, 8, 0.3), blob(796, 292, 20, rng, 8, 0.3)] });
  /* 月球 */
  regions.push({ n: 6, d: blob(170, 700, 92, rng, 13, 0.08) });
  regions.push({ n: 7, d: [blob(146, 676, 18, rng, 8, 0.3), blob(196, 724, 13, rng, 8, 0.3), blob(178, 672, 9, rng, 7, 0.3)] });
  /* 火箭：鼻锥 / 身 / 舷窗 / 尾翼 / 喷焰 */
  regions.push({ n: 8, d: closedCurve([
    { x: 500, y: 96 }, { x: 566, y: 210 }, { x: 566, y: 330 }, { x: 434, y: 330 }, { x: 434, y: 210 },
  ], 0.6) });
  regions.push({ n: 9, d: closedCurve([
    { x: 434, y: 330 }, { x: 566, y: 330 }, { x: 578, y: 600 }, { x: 500, y: 650 }, { x: 422, y: 600 },
  ], 0.55) });
  regions.push({ n: 10, d: [
    closedCurve([{ x: 434, y: 330 }, { x: 360, y: 470 }, { x: 396, y: 560 }, { x: 428, y: 540 }], 0.6),
    closedCurve([{ x: 566, y: 330 }, { x: 640, y: 470 }, { x: 604, y: 560 }, { x: 572, y: 540 }], 0.6),
  ] });
  regions.push({ n: 11, d: blob(500, 400, 52, rng, 12, 0.07) });
  regions.push({ n: 12, d: blob(500, 400, 34, rng, 10, 0.1) });
  regions.push({ n: 13, d: closedCurve([
    { x: 422, y: 600 }, { x: 578, y: 600 }, { x: 560, y: 640 },
    { x: 500, y: 668 }, { x: 440, y: 640 },
  ], 0.6) });
  regions.push({ n: 14, d: [
    blob(500, 760, 60, rng, 10, 0.25), blob(500, 850, 42, rng, 9, 0.3),
    drop(418, 720, 16, 155), drop(582, 720, 16, 25),
  ] });
  return { bg: "night", regions };
}

/* ============================ 15 鲸鱼 ============================ */
function tWhale(rng, detail) {
  const regions = [{ n: 1, d: frame(rng, 26, 10) }];
  /* 海面 */
  regions.push({ n: 2, d: closedCurve([
    { x: 26, y: 480 }, { x: 974, y: 480 }, { x: 974, y: 974 }, { x: 26, y: 974 },
  ], 0.5) });
  /* 喷泉 */
  regions.push({ n: 3, d: [
    tube([{ x: 560, y: 300 }, { x: 556, y: 220 }, { x: 560, y: 150 }], 26),
    blob(520, 120, 34, rng, 9, 0.3), blob(590, 108, 30, rng, 9, 0.3),
    blob(556, 60, 24, rng, 9, 0.3),
  ] });
  /* 鲸身 */
  regions.push({ n: 4, d: closedCurve([
    { x: 190, y: 560 }, { x: 300, y: 440 }, { x: 480, y: 380 },
    { x: 660, y: 420 }, { x: 780, y: 540 }, { x: 800, y: 640 },
    { x: 700, y: 760 }, { x: 480, y: 820 }, { x: 300, y: 760 }, { x: 190, y: 660 },
  ], 0.7) });
  /* 尾鳍 */
  regions.push({ n: 5, d: closedCurve([
    { x: 762, y: 560 }, { x: 870, y: 460 }, { x: 920, y: 500 },
    { x: 880, y: 580 }, { x: 930, y: 650 }, { x: 850, y: 680 }, { x: 795, y: 640 },
  ], 0.7) });
  /* 腹条 */
  regions.push({ n: 6, d: [
    arcBand(490, 640, 190, 40, 130, 24), arcBand(490, 640, 226, 45, 122, 22),
    arcBand(490, 640, 258, 52, 114, 18),
  ] });
  /* 眼 + 鳍 + 肚皮 */
  regions.push({ n: 7, d: [blob(285, 545, 15, rng, 8, 0.2)] });
  regions.push({ n: 8, d: closedCurve([
    { x: 350, y: 640 }, { x: 300, y: 720 }, { x: 360, y: 780 }, { x: 420, y: 720 }, { x: 415, y: 665 },
  ], 0.7) });
  regions.push({ n: 9, d: blob(300, 480, 60, rng, 10, 0.12) });
  /* 水泡 */
  regions.push({ n: 10, d: [
    blob(700, 480, 16, rng, 8, 0.3), blob(742, 440, 11, rng, 8, 0.3),
    blob(660, 440, 10, rng, 8, 0.3),
  ] });
  /* 云 + 太阳 */
  regions.push({ n: 11, d: cloud(rng, 210, 220, 100) });
  regions.push({ n: 12, d: blob(830, 180, 62, rng, 12, 0.08) });
  regions.push({ n: 13, d: waveband(60, 400, 900, 18, 2, 30) });
  if (detail > 0.5) {
    regions.push({ n: 14, d: [softStar(640, 200, 22, 10, 5, -90), softStar(90, 400, 18, 8, 5, -90)] });
  }
  return { bg: "ocean", regions };
}

/* ============================ 16 茶壶茶杯 ============================ */
function tTeapot(rng, detail) {
  const regions = [{ n: 1, d: frame(rng, 26, 12) }];
  /* 桌布带 */
  regions.push({ n: 2, d: closedCurve([
    { x: 26, y: 760 }, { x: 974, y: 760 }, { x: 974, y: 974 }, { x: 26, y: 974 },
  ], 0.5) });
  /* 蒸汽 ×2 */
  regions.push({ n: 3, d: [
    tube([{ x: 620, y: 560 }, { x: 648, y: 480 }, { x: 616, y: 410 }, { x: 646, y: 340 }], 18),
    tube([{ x: 690, y: 560 }, { x: 718, y: 490 }, { x: 690, y: 425 }, { x: 716, y: 360 }], 16),
  ] });
  /* 壶身 + 壶盖 + 顶珠 */
  regions.push({ n: 4, d: blob(420, 560, 195, rng, 14, 0.08) });
  regions.push({ n: 5, d: closedCurve([
    { x: 330, y: 382 }, { x: 420, y: 352 }, { x: 510, y: 382 },
    { x: 496, y: 412 }, { x: 344, y: 412 },
  ], 0.6) });
  regions.push({ n: 6, d: blob(420, 322, 30, rng, 9, 0.2) });
  /* 壶嘴 */
  regions.push({ n: 7, d: closedCurve([
    { x: 596, y: 520 }, { x: 700, y: 430 }, { x: 744, y: 452 },
    { x: 664, y: 580 }, { x: 610, y: 590 },
  ], 0.6) });
  /* 壶把 */
  regions.push({ n: 8, d: arcBand(248, 540, 118, 90, 270, 40) });
  /* 壶花饰 */
  regions.push({ n: 9, d: [heart(420, 560, 60, 0)] });
  /* 茶杯 + 托 + 茶汤 */
  regions.push({ n: 10, d: closedCurve([
    { x: 760, y: 640 }, { x: 920, y: 640 }, { x: 900, y: 750 },
    { x: 840, y: 762 }, { x: 780, y: 750 },
  ], 0.55) });
  regions.push({ n: 11, d: closedCurve([
    { x: 770, y: 646 }, { x: 910, y: 646 }, { x: 896, y: 690 }, { x: 784, y: 690 },
  ], 0.5) });
  regions.push({ n: 12, d: [
    arcBand(842, 700, 96, 10, 170, 26),
    oval(842, 782, 88, 20),
  ] });
  /* 杯把 */
  regions.push({ n: 13, d: arcBand(930, 690, 44, -80, 80, 22) });
  /* 桌面圆点纹 */
  if (detail > 0.35) {
    const dots = [];
    for (let i = 0; i < 6; i++) dots.push(blob(rng.range(80, 920), rng.range(800, 940), rng.range(10, 17), rng, 7, 0.4));
    regions.push({ n: 14, d: dots });
  }
  return { bg: "pastel", regions };
}

/* ============================ 17 云中城堡 ============================ */
function tCastle(rng, detail) {
  const regions = [{ n: 1, d: frame(rng, 26, 10) }];
  /* 太阳与云海 */
  regions.push({ n: 2, d: blob(190, 200, 70, rng, 12, 0.08) });
  regions.push({ n: 3, d: cloud(rng, 820, 190, 105) });
  regions.push({ n: 4, d: cloud(rng, 200, 760, 120) });
  regions.push({ n: 5, d: cloud(rng, 810, 740, 110) });
  /* 山基 */
  regions.push({ n: 6, d: closedCurve([
    { x: 130, y: 940 }, { x: 260, y: 700 }, { x: 500, y: 620 },
    { x: 740, y: 700 }, { x: 870, y: 940 },
  ], 0.6) });
  /* 主堡体 */
  regions.push({ n: 7, d: closedCurve([
    { x: 360, y: 660 }, { x: 640, y: 660 }, { x: 640, y: 460 }, { x: 360, y: 460 },
  ], 0.35) });
  /* 城齿 */
  regions.push({ n: 8, d: closedCurve([
    { x: 360, y: 460 }, { x: 360, y: 410 }, { x: 412, y: 410 }, { x: 412, y: 452 },
    { x: 466, y: 452 }, { x: 466, y: 410 }, { x: 534, y: 410 }, { x: 534, y: 452 },
    { x: 588, y: 452 }, { x: 588, y: 410 }, { x: 640, y: 410 }, { x: 640, y: 460 },
  ], 0.35) });
  /* 两侧塔楼（锥顶） */
  regions.push({ n: 9, d: [
    closedCurve([{ x: 290, y: 680 }, { x: 290, y: 380 }, { x: 354, y: 380 }, { x: 354, y: 680 }], 0.4),
    closedCurve([{ x: 646, y: 680 }, { x: 646, y: 380 }, { x: 710, y: 380 }, { x: 710, y: 680 }], 0.4),
  ] });
  regions.push({ n: 10, d: [
    closedCurve([{ x: 274, y: 380 }, { x: 322, y: 268 }, { x: 370, y: 380 }], 0.5),
    closedCurve([{ x: 630, y: 380 }, { x: 678, y: 268 }, { x: 726, y: 380 }], 0.5),
  ] });
  /* 中央高塔 */
  regions.push({ n: 11, d: closedCurve([
    { x: 452, y: 460 }, { x: 452, y: 260 }, { x: 548, y: 260 }, { x: 548, y: 460 },
  ], 0.35) });
  regions.push({ n: 12, d: closedCurve([
    { x: 434, y: 260 }, { x: 500, y: 140 }, { x: 566, y: 260 },
  ], 0.5) });
  /* 旗 ×3 */
  regions.push({ n: 13, d: [
    closedCurve([{ x: 500, y: 140 }, { x: 500, y: 96 }, { x: 560, y: 112 }, { x: 500, y: 128 }], 0.6),
    closedCurve([{ x: 322, y: 268 }, { x: 322, y: 232 }, { x: 372, y: 246 }, { x: 322, y: 262 }], 0.6),
    closedCurve([{ x: 678, y: 268 }, { x: 678, y: 232 }, { x: 728, y: 246 }, { x: 678, y: 262 }], 0.6),
  ] });
  /* 门 + 窗 */
  regions.push({ n: 14, d: [
    closedCurve([{ x: 462, y: 660 }, { x: 462, y: 560 }, { x: 500, y: 520 }, { x: 538, y: 560 }, { x: 538, y: 660 }], 0.5),
    oval(500, 340, 22, 26), oval(322, 470, 16, 20), oval(678, 470, 16, 20),
  ] });
  return { bg: "sunset", regions };
}

/* ============================ 18 蜂鸟花 ============================ */
function tHummingbird(rng, detail) {
  const regions = [{ n: 1, d: frame(rng, 26, 12) }];
  /* 大木槿：花瓣环 ×2 + 花芯 */
  const fx = 700, fy = 660;
  const petals = [];
  for (let i = 0; i < 7; i++) petals.push(petal(fx, fy, 210, 24, 360 / 7 * i + rng.range(-4, 4), 0.18));
  regions.push({ n: 2, d: petals });
  const petals2 = [];
  for (let i = 0; i < 7; i++) petals2.push(petal(fx, fy, 135, 19, 360 / 7 * i + 26, 0.2));
  regions.push({ n: 3, d: petals2 });
  regions.push({ n: 4, d: blob(fx, fy, 58, rng, 11, 0.14) });
  regions.push({ n: 5, d: [
    tube([{ x: 700, y: 660 }, { x: 716, y: 760 }, { x: 748, y: 830 }], 10),
  ] });
  /* 蜂鸟身体（悬停姿态，头朝下俯花） */
  regions.push({ n: 6, d: closedCurve([
    { x: 300, y: 180 }, { x: 420, y: 220 }, { x: 500, y: 320 },
    { x: 520, y: 430 }, { x: 470, y: 520 }, { x: 390, y: 540 },
    { x: 320, y: 480 }, { x: 280, y: 350 },
  ], 0.7) });
  /* 头 */
  regions.push({ n: 7, d: blob(322, 200, 62, rng, 11, 0.09) });
  regions.push({ n: 8, d: [blob(306, 190, 11, rng, 7, 0.3)] });
  /* 长喙探花 */
  regions.push({ n: 9, d: tube([{ x: 356, y: 226 }, { x: 470, y: 330 }, { x: 596, y: 480 }, { x: 660, y: 600 }], 11) });
  /* 翅膀（上扬） */
  regions.push({ n: 10, d: closedCurve([
    { x: 470, y: 350 }, { x: 600, y: 240 }, { x: 740, y: 200 },
    { x: 700, y: 320 }, { x: 580, y: 420 },
  ], 0.65) });
  /* 尾羽 */
  regions.push({ n: 11, d: [
    leaf(430, 590, 150, 26, 130, 0.35), leaf(390, 600, 135, 24, 105, 0.45),
    leaf(470, 600, 140, 24, 150, 0.25),
  ] });
  /* 喉羽 */
  regions.push({ n: 12, d: [blob(340, 250, 34, rng, 9, 0.2)] });
  /* 环绕叶 */
  regions.push({ n: 13, d: [
    leaf(180, 420, 130, 22, 120, 0.4), leaf(200, 620, 120, 21, 60, -0.4),
    leaf(840, 380, 110, 20, -30, 0.4),
  ] });
  if (detail > 0.5) {
    regions.push({ n: 14, d: [
      drop(560, 560, 13, 120), drop(520, 620, 10, 130),
      blob(160, 820, 20, rng, 8, 0.35),
    ] });
  }
  return { bg: "sunset", regions };
}

/* ============================ 19 风车郁金香 ============================ */
function tWindmill(rng, detail) {
  const regions = [{ n: 1, d: frame(rng, 26, 10) }];
  /* 天空 */
  regions.push({ n: 2, d: closedCurve([
    { x: 26, y: 26 }, { x: 974, y: 26 }, { x: 974, y: 560 }, { x: 26, y: 560 },
  ], 0.5) });
  regions.push({ n: 3, d: cloud(rng, 760, 160, 95) });
  regions.push({ n: 4, d: cloud(rng, 200, 240, 80) });
  /* 郁金香田三条 */
  regions.push({ n: 5, d: closedCurve([
    { x: 26, y: 560 }, { x: 974, y: 560 }, { x: 974, y: 700 }, { x: 26, y: 700 },
  ], 0.5) });
  regions.push({ n: 6, d: closedCurve([
    { x: 26, y: 700 }, { x: 974, y: 700 }, { x: 974, y: 840 }, { x: 26, y: 840 },
  ], 0.5) });
  regions.push({ n: 7, d: closedCurve([
    { x: 26, y: 840 }, { x: 974, y: 840 }, { x: 974, y: 974 }, { x: 26, y: 974 },
  ], 0.5) });
  /* 风车塔（锥形身）+ 顶帽 */
  regions.push({ n: 8, d: closedCurve([
    { x: 410, y: 580 }, { x: 452, y: 270 }, { x: 548, y: 270 }, { x: 590, y: 580 },
  ], 0.4) });
  regions.push({ n: 9, d: closedCurve([
    { x: 434, y: 270 }, { x: 500, y: 190 }, { x: 566, y: 270 },
  ], 0.5) });
  regions.push({ n: 10, d: blob(500, 208, 16, rng, 8, 0.25) });
  /* 门 + 窗 */
  regions.push({ n: 11, d: [
    closedCurve([{ x: 470, y: 580 }, { x: 470, y: 496 }, { x: 500, y: 466 }, { x: 530, y: 496 }, { x: 530, y: 580 }], 0.5),
    oval(500, 350, 18, 22), oval(466, 430, 12, 16), oval(534, 430, 12, 16),
  ] });
  /* 四叶桨 */
  regions.push({ n: 12, d: [
    closedCurve([{ x: 500, y: 250 }, { x: 500, y: 96 }, { x: 528, y: 88 }, { x: 534, y: 244 }], 0.5),
    closedCurve([{ x: 500, y: 250 }, { x: 500, y: 96 }, { x: 472, y: 88 }, { x: 466, y: 244 }], 0.5),
  ] });
  regions.push({ n: 13, d: [
    closedCurve([{ x: 500, y: 250 }, { x: 660, y: 300 }, { x: 668, y: 272 }, { x: 508, y: 226 }], 0.5),
    closedCurve([{ x: 500, y: 250 }, { x: 340, y: 300 }, { x: 332, y: 272 }, { x: 492, y: 226 }], 0.5),
  ] });
  regions.push({ n: 14, d: [blob(500, 250, 26, rng, 9, 0.2)] });
  /* 田里郁金香 */
  if (detail > 0.2) {
    const tulips = [];
    const leafArr = [];
    for (let i = 0; i < 8; i++) {
      const x = 90 + i * 115 + rng.range(-16, 16);
      const y = 640 + (i % 3) * 100 + rng.range(-10, 10);
      tulips.push(drop(x, y - 30, 26, -90));
      tulips.push(petal(x, y - 30, 44, 30, -90 + 40, 0.2));
      leafArr.push(leaf(x, y + 40, 60, 12, -110, 0.4));
      leafArr.push(leaf(x, y + 40, 60, 12, -70, -0.4));
    }
    regions.push({ n: 7, d: leafArr });
    regions.push({ n: 14, d: tulips });
  }
  return { bg: "garden", regions };
}

/* ============================ 模板注册表 ============================ */

export const TEMPLATES = {
  butterfly: tButterfly,
  mandala: tMandala,
  flowerpot: tFlowerpot,
  balloon: tBalloon,
  koi: tKoi,
  icecream: tIcecream,
  owl: tOwl,
  sailboat: tSailboat,
  mushroom: tMushroom,
  snail: tSnail,
  bee: tBee,
  lighthouse: tLighthouse,
  cat: tCat,
  rocket: tRocket,
  whale: tWhale,
  teapot: tTeapot,
  castle: tCastle,
  hummingbird: tHummingbird,
  windmill: tWindmill,
};

export const THEME_COUNT = Object.keys(TEMPLATES).length;
