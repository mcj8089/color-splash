/**
 * COLOR SPLASH · 路径库（有机形状生成 + SVG 路径解析采样）
 * =====================================================================
 * 所有画稿形状一律由三次贝塞尔曲线构造（closedCurve / petal / leaf / blob…），
 * 绝不出现直线段拼接的几何积木感；模板层用这些积木式「曲线笔刷」组合出
 * 花瓣、叶片、动物轮廓、云朵、波浪等有机造型。
 *
 * 两块能力：
 *   1) 形状生成：返回 SVG path 字符串（M/L/C/Q/Z 绝对坐标，设计空间 0~1000）；
 *   2) 解析采样：samplePath() 把 path 字符串压成多边形，算面积/质心/包围盒，
 *      供编号标签摆放、区域面积过滤、引导系统定位使用。
 * =====================================================================
 */

/* ------------------------------ 随机数 ------------------------------ */

/** mulberry32：可复现的小随机源（关卡种子 → 固定画稿） */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 便捷封装：rng.range(a,b) / rng.int(a,b) / rng.pick(arr) / rng.sign() */
export function makeRng(seed) {
  const f = mulberry32(seed);
  return {
    next: f,
    range: (a, b) => a + (b - a) * f(),
    int: (a, b) => Math.floor(a + (b - a + 1) * f()),
    pick: (arr) => arr[Math.floor(f() * arr.length) % arr.length],
    sign: () => (f() < 0.5 ? -1 : 1),
  };
}

/* ------------------------------ 点工具 ------------------------------ */

const P = (x, y) => ({ x, y });
const lerp = (a, b, t) => a + (b - a) * t;
export const lerpPt = (p, q, t) => ({ x: lerp(p.x, q.x, t), y: lerp(p.y, q.y, t) });

/** 极坐标 → 直角（deg，屏幕坐标 y 向下） */
export function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
}

const n2 = (v) => Math.round(v * 10) / 10;
const fmt = (p) => `${n2(p.x)} ${n2(p.y)}`;

/* ------------------------------ 曲线拼装 ------------------------------ */

/**
 * 把一系列锚点连成一条平滑闭合曲线（Catmull-Rom → 贝塞尔）。
 * 这是「有机感」的核心：任意点列都变成饱满的曲线轮廓，无直线硬角。
 * @param {Array<{x,y}>} pts 锚点（按序，不重复首尾）
 * @param {number} [tension=1] 张力（0.6~1.2 常用；小=更圆润松弛）
 */
export function closedCurve(pts, tension = 1) {
  const n = pts.length;
  if (n < 3) return "";
  let d = `M ${fmt(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = { x: p1.x + ((p2.x - p0.x) / 6) * tension, y: p1.y + ((p2.y - p0.y) / 6) * tension };
    const c2 = { x: p2.x - ((p3.x - p1.x) / 6) * tension, y: p2.y - ((p3.y - p1.y) / 6) * tension };
    d += ` C ${fmt(c1)}, ${fmt(c2)}, ${fmt(p2)}`;
  }
  return d + " Z";
}

/**
 * 开放平滑曲线（不闭合）：用于草茎、水流、发丝等线条形区域。
 */
export function openCurve(pts, tension = 1) {
  const n = pts.length;
  if (n < 2) return "";
  let d = `M ${fmt(pts[0])}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const c1 = { x: p1.x + ((p2.x - p0.x) / 6) * tension, y: p1.y + ((p2.y - p0.y) / 6) * tension };
    const c2 = { x: p2.x - ((p3.x - p1.x) / 6) * tension, y: p2.y - ((p3.y - p1.y) / 6) * tension };
    d += ` C ${fmt(c1)}, ${fmt(c2)}, ${fmt(p2)}`;
  }
  return d;
}

/**
 * 有机团块（blob）：中心 + 半径 + 角度扰动，生成圆润不规则形。
 * @param {number} spots 采样角点数（7~12 自然）
 */
export function blob(cx, cy, r, rng, spots = 9, wobble = 0.18) {
  const pts = [];
  for (let i = 0; i < spots; i++) {
    const ang = (360 / spots) * i + rng.range(-8, 8);
    const rr = r * (1 - wobble / 2 + rng.range(0, wobble));
    pts.push(polar(cx, cy, rr, ang));
  }
  return closedCurve(pts, 0.9);
}

/** 圆滑椭圆（非几何圆：曲线拟合，边缘带极轻微呼吸感） */
export function oval(cx, cy, rx, ry, rotDeg = 0) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const ang = (36 * i * Math.PI) / 180;
    const px = Math.cos(ang) * rx;
    const py = Math.sin(ang) * ry;
    const a = (rotDeg * Math.PI) / 180;
    pts.push({
      x: cx + px * Math.cos(a) - py * Math.sin(a),
      y: cy + px * Math.sin(a) + py * Math.cos(a),
    });
  }
  return closedCurve(pts, 1.0);
}

/**
 * 花瓣：从基点出发的两条对称贝塞尔弧，尖端收拢。
 * @param {number} len 长、wid 宽、ang 朝向（deg）
 */
export function petal(cx, cy, len, wid, ang, curve = 0) {
  const a = (ang * Math.PI) / 180;
  const tip = polar(cx, cy, len, ang);
  const side = (s, m) => {
    const base = polar(cx, cy, len * 0.08, ang + 180 + s * wid * 0.35);
    const mid = polar(cx, cy, len * m, ang + s * wid);
    mid.x += Math.cos(a + Math.PI / 2) * curve * len * 0.12;
    mid.y += Math.sin(a + Math.PI / 2) * curve * len * 0.12;
    return [base, mid, tip];
  };
  const r = side(1, 0.5);
  const l = side(-1, 0.5).reverse();
  // 用二次曲线手感的三次段拼两侧弧，尖端一点过渡，避免折角
  const c1 = polar(cx, cy, len * 0.45, ang + wid * 1.1);
  const c2 = polar(cx, cy, len * 0.95, ang + wid * 0.4);
  const c3 = polar(cx, cy, len * 0.95, ang - wid * 0.4);
  const c4 = polar(cx, cy, len * 0.45, ang - wid * 1.1);
  const base1 = polar(cx, cy, len * 0.06, ang + 180 + wid * 0.3);
  const base2 = polar(cx, cy, len * 0.06, ang + 180 - wid * 0.3);
  return (
    `M ${fmt(base1)}` +
    ` C ${fmt(c1)}, ${fmt(c2)}, ${fmt(tip)}` +
    ` C ${fmt(c3)}, ${fmt(c4)}, ${fmt(base2)} Z`
  );
}

/** 叶片：尖椭圆 + 中脉留白可选；curve 让叶片有弯垂感 */
export function leaf(cx, cy, len, wid, ang, curve = 0.4) {
  const tip = polar(cx, cy, len, ang);
  const a = (ang * Math.PI) / 180;
  const bow = curve * wid * 0.9;
  const c1 = polar(cx, cy, len * 0.4, ang + wid);
  c1.x += Math.cos(a + Math.PI / 2) * bow;
  c1.y += Math.sin(a + Math.PI / 2) * bow;
  const c2 = polar(cx, cy, len * 0.85, ang + wid * 0.45);
  const c3 = polar(cx, cy, len * 0.85, ang - wid * 0.45);
  const c4 = polar(cx, cy, len * 0.4, ang - wid);
  c4.x -= Math.cos(a + Math.PI / 2) * bow;
  c4.y -= Math.sin(a + Math.PI / 2) * bow;
  const b1 = polar(cx, cy, len * 0.05, ang + 180 + wid * 0.25);
  const b2 = polar(cx, cy, len * 0.05, ang + 180 - wid * 0.25);
  return (
    `M ${fmt(b1)}` +
    ` C ${fmt(c1)}, ${fmt(c2)}, ${fmt(tip)}` +
    ` C ${fmt(c3)}, ${fmt(c4)}, ${fmt(b2)} Z`
  );
}

/** 心形：四段对称贝塞尔（瓣谷在上、尖端朝下），ang 为整体旋转角 */
export function heart(cx, cy, s, ang = 0) {
  const a = (ang * Math.PI) / 180;
  /* 原型坐标：底尖 (0,0.95s)，瓣谷 (0,-0.75s)，两瓣饱满外扩 */
  const proto = [
    "M 0 0.95",
    "C -1.15 -0.35, -0.95 -1.35, -0.45 -1.35",
    "C -0.15 -1.35, 0 -1.05, 0 -0.75",
    "C 0 -1.05, 0.15 -1.35, 0.45 -1.35",
    "C 0.95 -0.35, 0.95 -0.35, 0 0.95",
    "Z",
  ];
  /* 第四段的控制点补对称：右瓣外扩 */
  proto[4] = "C 0.95 -1.35, 1.15 -0.35, 0 0.95";
  const rot = (vx, vy) => {
    const x = vx * s;
    const y = vy * s;
    return fmt({
      x: cx + x * Math.cos(a) - y * Math.sin(a),
      y: cy + x * Math.sin(a) + y * Math.cos(a),
    });
  };
  return proto
    .map((seg) => seg.replace(/(-?[\d.]+) (-?[\d.]+)/g, (m, vx, vy) => rot(+vx, +vy)))
    .join(" ");
}

/** 水滴：尖头在 ang 方向、球部在中心，用于露珠/雨滴/花苞 */
export function drop(cx, cy, r, ang = -90) {
  const tip = polar(cx, cy, r * 2.1, ang);
  return (
    `M ${fmt(tip)}` +
    ` C ${fmt(polar(cx, cy, r * 1.9, ang + 32))}, ${fmt(polar(cx, cy, r * 1.45, ang + 62))}, ${fmt(polar(cx, cy, r, ang + 92))}` +
    ` C ${fmt(polar(cx, cy, r * 1.22, ang + 152))}, ${fmt(polar(cx, cy, r * 1.22, ang + 208))}, ${fmt(polar(cx, cy, r, ang + 268))}` +
    ` C ${fmt(polar(cx, cy, r * 1.45, ang - 62))}, ${fmt(polar(cx, cy, r * 1.9, ang - 32))}, ${fmt(tip)} Z`
  );
}

/** 圆角星（海星/勋章）：平滑凹凸轮廓，非直线多边形 */
export function softStar(cx, cy, rOut, rIn, points = 5, rot = -90) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    pts.push(polar(cx, cy, r, rot + (180 / points) * i));
  }
  return closedCurve(pts, 0.55);
}

/** 弯月：两段大弧咬合 */
export function crescent(cx, cy, r, ang = 0) {
  const a = (ang * Math.PI) / 180;
  const rx1 = r;
  const p = (t, rr, dir) => ({
    x: cx + Math.cos(a + t) * rr,
    y: cy + Math.sin(a + t) * rr * dir,
  });
  void p;
  const tip1 = polar(cx, cy, r, a - 90);
  const tip2 = polar(cx, cy, r, a + 90);
  const bulge = polar(cx, cy, r * 1.25, a);
  const inner = polar(cx, cy, r * 0.45, a);
  return (
    `M ${fmt(tip1)}` +
    ` C ${fmt(polar(cx, cy, r * 1.3, a - 55))}, ${fmt(bulge)}, ${fmt(tip2)}` +
    ` C ${fmt(polar(cx, cy, r * 0.75, a + 62))}, ${fmt(polar(cx, cy, r * 0.5, a + 30))}, ${fmt(inner)}` +
    ` C ${fmt(polar(cx, cy, r * 0.42, a - 30))}, ${fmt(polar(cx, cy, r * 0.72, a - 62))}, ${fmt(tip1)} Z`
  );
}

/** 波带：上下都是波浪的横向条带（海浪/彩旗带） */
export function waveband(x0, x1, yMid, amp, waves, thick) {
  const steps = Math.max(8, waves * 6);
  const top = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    top.push({
      x: lerp(x0, x1, t),
      y: yMid - thick / 2 + Math.sin(t * Math.PI * 2 * waves) * amp,
    });
  }
  const bot = [];
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    bot.push({
      x: lerp(x0, x1, t),
      y: yMid + thick / 2 + Math.sin(t * Math.PI * 2 * waves) * amp,
    });
  }
  return closedCurve(top.concat(bot), 0.6);
}

/**
 * 沿折线生成等宽闭合「管道」：草茎、触角、绳索、飞行轨迹等细条形区域。
 * 两端圆润（closedCurve 的平滑特性），中段等宽，整体为有机曲线。
 */
export function tube(ptsIn, w, tension = 0.9) {
  const n = ptsIn.length;
  if (n < 2) return "";
  const left = [];
  const right = [];
  for (let i = 0; i < n; i++) {
    const p0 = ptsIn[Math.max(0, i - 1)];
    const p1 = ptsIn[i];
    const p2 = ptsIn[Math.min(n - 1, i + 1)];
    let dx = p2.x - p0.x;
    let dy = p2.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    /* 端部略收窄，看起来像圆润的笔触收笔 */
    const shrink = i === 0 || i === n - 1 ? 0.45 : 1;
    const hw = (w / 2) * shrink;
    left.push({ x: p1.x - dy * hw, y: p1.y + dx * hw });
    right.push({ x: p1.x + dy * hw, y: p1.y - dx * hw });
  }
  return closedCurve(left.concat(right.reverse()), tension);
}

/** 圆弧带：沿圆弧的一条月牙形色带（鳞片、螺纹、涟漪、蜗牛壳） */
export function arcBand(cx, cy, r, a0deg, a1deg, w) {
  const steps = Math.max(5, Math.round(Math.abs(a1deg - a0deg) / 12));
  const outer = [];
  for (let i = 0; i <= steps; i++) {
    outer.push(polar(cx, cy, r + w / 2, lerp(a0deg, a1deg, i / steps)));
  }
  const inner = [];
  for (let i = steps; i >= 0; i--) {
    inner.push(polar(cx, cy, r - w / 2, lerp(a0deg, a1deg, i / steps)));
  }
  return closedCurve(outer.concat(inner), 0.7);
}

/* --------------------------- 路径解析 / 采样 --------------------------- */

/**
 * 解析 SVG path（支持 M L C Q Z，绝对坐标）并摊平成多边形点列。
 * 我们生成的路径只含这五种命令，解析器保持最小实现。
 */
export function samplePath(d, seg = 10) {
  const tokens = String(d).match(/[MLCQZmlcqz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
  const pts = [];
  let cur = { x: 0, y: 0 };
  let i = 0;
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === "M") {
      cur = { x: num(), y: num() };
      pts.push({ ...cur });
    } else if (cmd === "L") {
      cur = { x: num(), y: num() };
      pts.push({ ...cur });
    } else if (cmd === "C") {
      const c1 = { x: num(), y: num() };
      const c2 = { x: num(), y: num() };
      const p = { x: num(), y: num() };
      for (let s = 1; s <= seg; s++) {
        const t = s / seg;
        const mt = 1 - t;
        pts.push({
          x: mt * mt * mt * cur.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * p.x,
          y: mt * mt * mt * cur.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * p.y,
        });
      }
      cur = p;
    } else if (cmd === "Q") {
      const c = { x: num(), y: num() };
      const p = { x: num(), y: num() };
      for (let s = 1; s <= Math.max(4, seg >> 1); s++) {
        const t = s / Math.max(4, seg >> 1);
        const mt = 1 - t;
        pts.push({
          x: mt * mt * cur.x + 2 * mt * t * c.x + t * t * p.x,
          y: mt * mt * cur.y + 2 * mt * t * c.y + t * t * p.y,
        });
      }
      cur = p;
    } else if (cmd === "Z") {
      /* 闭合：回到子路径起点（我们每条 Z 后必有新 M，无需补点） */
    }
  }
  return pts;
}

/** 鞋带公式面积（绝对值） */
export function polyArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

/** 多边形质心（面积加权；退化时退回均值） */
export function polyCentroid(pts) {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const cross = p.x * q.y - q.x * p.y;
    a += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  a /= 2;
  if (Math.abs(a) < 1e-6) {
    let sx = 0;
    let sy = 0;
    for (const p of pts) {
      sx += p.x;
      sy += p.y;
    }
    return { x: sx / pts.length, y: sy / pts.length };
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

/** 包围盒 */
export function polyBBox(pts) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    if (p.x < x0) x0 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x;
    if (p.y > y1) y1 = p.y;
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

/** 射线法点内测试：点 (x,y) 是否落在多边形 pts 内（含多子路径合并的采样点） */
export function polyContains(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** 一步到位：path 字符串 → {pts, area, centroid, bbox} */
export function measurePath(d) {
  const pts = samplePath(d);
  return { pts, area: polyArea(pts), centroid: polyCentroid(pts), bbox: polyBBox(pts) };
}
