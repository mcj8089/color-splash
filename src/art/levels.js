/**
 * COLOR SPLASH · 关卡装配（模板 → 可玩关卡数据）
 * =====================================================================
 * buildLevel(def) 把 config/levels.js 的一条定义变成完整关卡：
 *   · 调用 themes.js 模板（种子可复现）得到区域名册；
 *   · 每个区域生成 Path2D（命中测试）、面积/质心/包围盒（编号摆放/引导）；
 *   · 从 PALETTES 家族按 rot 轮转取色，编号 1..maxN。
 * 生成结果按 (theme, seed, detail) 做内存缓存——画廊缩略图与进关共用一份数据。
 * =====================================================================
 */

import { makeRng, measurePath, samplePath, polyContains, blob, softStar, oval } from "./paths.js";
import { TEMPLATES } from "./themes.js";
import { PALETTES } from "../../config/levels.js";

/* Path2D 兼容垫片（极老内核兜底：解析失败时用多边形退化，正常环境不触发） */
const HasPath2D = typeof Path2D === "function";

function makePath(d) {
  if (HasPath2D) {
    try {
      return new Path2D(d);
    } catch (e) { /* 语法兜底：忽略坏子路径 */ }
  }
  return null;
}

const cache = new Map();

/* --------------------------------------------------------------------- */
/* 细节点缀后处理（detail → 小装饰区域）                                    */
/* 原作的高阶画作区域明显更多；模板本体只有 11~16 块，这里按 detail 系数     */
/* 往「大区域」里撒小圆点 / 软星星 / 椭圆装饰，最多 +SPRINKLE_CAP 块：       */
/*   · 位置必须完全落在宿主区域内、不与任何现区域相交（纯多边形点内测试）；  */
/*   · 编号取「宿主编号 +1 环绕」，保证与宿主异号（相邻异号由不相交保证）；  */
/*   · 避开宿主编号的摆放点（质心 70px 内不落子），不遮数字；               */
/*   · 全程走同一条 rng 链：同一关定义永远生成同一份画稿。                  */
/* --------------------------------------------------------------------- */
const SPRINKLE_CAP = 14;       // detail=1 时最多追加的装饰区域数
const HOST_MIN_AREA = 5200;    // 面积低于此值的区域不当宿主（放不下）
const LABEL_CLEAR_R = 70;      // 宿主编号质心的避让半径

/** 把 detail 系数变成追加的装饰区域（就地修改 rawRegions） */
function sprinkleRegions(rawRegions, rng, detail, maxN) {
  const extra = Math.round((detail || 0) * SPRINKLE_CAP);
  if (extra <= 0 || !rawRegions.length) return;

  /* 候选宿主：面积最大的前 6 块（背景/大片最耐点缀） */
  const hosts = rawRegions
    .map((r) => {
      const ds = Array.isArray(r.d) ? r.d.filter(Boolean) : [r.d];
      return { r, m: measurePath(ds.join(" ")) };
    })
    .filter((h) => h.m.area >= HOST_MIN_AREA && h.m.pts.length >= 3)
    .sort((a, b) => b.m.area - a.m.area)
    .slice(0, 6);
  if (!hosts.length) return;

  /* 已有多边形（点内测试用；新装饰也会加进来，防互相叠压） */
  const polys = rawRegions.map((r) => {
    const ds = Array.isArray(r.d) ? r.d.filter(Boolean) : [r.d];
    return { r, pts: samplePath(ds.join(" "), 7) };
  });

  let added = 0;
  let tries = 0;
  while (added < extra && tries < extra * 80) {
    tries++;
    const h = hosts[Math.floor(rng.next() * hosts.length) % hosts.length];
    const bb = h.m.bbox;
    const x = rng.range(bb.x0 + 34, Math.max(bb.x0 + 35, bb.x1 - 34));
    const y = rng.range(bb.y0 + 34, Math.max(bb.y0 + 35, bb.y1 - 34));
    if (!polyContains(h.m.pts, x, y)) continue;
    /* 避开宿主编号的摆放点，别让装饰盖住数字 */
    const c = h.m.centroid;
    if (c && Math.hypot(x - c.x, y - c.y) < LABEL_CLEAR_R) continue;

    /* 三种小装饰随机出一种，尺寸缩到 20~38 世界单位 */
    const rr = rng.range(20, 38);
    const kind = rng.int(0, 2);
    const n = h.r.n >= maxN ? 1 : h.r.n + 1;
    const d = kind === 0
      ? blob(x, y, rr, rng)
      : kind === 1
        ? softStar(x, y, rr, rr * 0.55, rng.int(5, 6), rng.range(0, 72))
        : oval(x, y, rr * 0.92, rr * 0.7, rng.range(0, 180));

    /* 新形状的全部采样点都要落在宿主内、且不碰任何现区域 */
    const np = samplePath(d, 7);
    if (np.length < 3) continue;
    if (!np.every((p) => polyContains(h.m.pts, p.x, p.y))) continue;
    let clash = false;
    for (const o of polys) {
      if (o.r === h.r) continue;
      if (np.some((p) => polyContains(o.pts, p.x, p.y))) { clash = true; break; }
    }
    if (clash) continue;

    const item = { n, d };
    rawRegions.push(item);
    polys.push({ r: item, pts: np });
    added++;
  }
}

/** @returns {{def, regions, palette, maxN, bg}} */
export function buildLevel(def) {
  const key = `${def.theme}|${def.seed}|${def.detail}|${def.rot}|${def.pal}`;
  if (cache.has(key)) return cache.get(key);

  const tpl = TEMPLATES[def.theme] || TEMPLATES.butterfly;
  const rng = makeRng(def.seed);
  const raw = tpl(rng, def.detail || 0);

  /* 模板自身的最大色号（点缀区域取「宿主编号 +1 环绕」要用） */
  const tplMaxN = raw.regions.reduce((m, r) => Math.max(m, r.n | 0), 1);
  /* 细节点缀：按 detail 往大区域里撒小装饰（就地追加；同一 rng 链保证可复现） */
  sprinkleRegions(raw.regions, rng, def.detail, tplMaxN);

  const regions = [];
  let maxN = 1;
  raw.regions.forEach((r, i) => {
    const ds = Array.isArray(r.d) ? r.d.filter(Boolean) : [r.d];
    if (!ds.length) return;
    /* 合并量测：多子路径区域取「最大子路径质心」摆编号，总面积求和 */
    let area = 0;
    let best = null;
    const path2d = makePath(ds.join(" "));
    const measures = ds.map((d) => measurePath(d));
    for (const m of measures) {
      area += m.area;
      if (!best || m.area > best.area) best = m;
    }
    const bbox = measures.reduce(
      (acc, m) => ({
        x0: Math.min(acc.x0, m.bbox.x0), y0: Math.min(acc.y0, m.bbox.y0),
        x1: Math.max(acc.x1, m.bbox.x1), y1: Math.max(acc.y1, m.bbox.y1),
      }),
      { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
    );
    regions.push({
      idx: i,
      n: r.n,
      d: ds.join(" "),
      path2d,
      pts: best.pts,               /* 最大子路径采样点（缩略图/特效用） */
      area,
      centroid: best.centroid,
      labelPt: labelPoint(best),   /* 编号落点：保证在路径内（凹形/环形质心可能落外） */
      bbox,
    });
    if (r.n > maxN) maxN = r.n;
  });

  /* 调色板：家族数组按 rot 轮转，编号 1..maxN 依序取色 */
  const family = PALETTES[def.pal] || PALETTES.garden;
  const rot = ((def.rot || 0) % family.length + family.length) % family.length;
  const palette = family.slice(rot).concat(family.slice(0, rot)).slice(0, Math.max(maxN, 6));

  const level = { def, regions, palette, maxN, bg: raw.bg || "garden" };
  cache.set(key, level);
  return level;
}

/**
 * 编号落点：优先质心；凹形 / 环形（月牙带、圆环）的多边形质心可能落在
 * 路径外或孔洞里，导致数字画在空中、玩家照着数字点却命中不了本区域。
 * 用确定性 8×8 网格在包围盒内找第一个「确实落在路径内」的点兜底。
 */
function labelPoint(m) {
  if (polyContains(m.pts, m.centroid.x, m.centroid.y)) return m.centroid;
  const bb = m.bbox;
  for (let gy = 1; gy <= 7; gy++) {
    for (let gx = 1; gx <= 7; gx++) {
      const x = bb.x0 + ((bb.x1 - bb.x0) * gx) / 8;
      const y = bb.y0 + ((bb.y1 - bb.y0) * gy) / 8;
      if (polyContains(m.pts, x, y)) return { x, y };
    }
  }
  return m.centroid;
}

/** 预热一批关卡（开屏期间后台构建，进关零卡顿） */
export function warmup(defs) {
  for (const d of defs) buildLevel(d);
}

export default buildLevel;
