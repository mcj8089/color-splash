/**
 * COLOR SPLASH · 关卡表 + 调色板家族
 * =====================================================================
 * · LEVELS：56 关，难度递进（前 8 关 4~6 色，中期 7~10 色，后期 11~14 色）。
 *   - theme  ：src/art/themes.js 里的画稿模板名
 *   - seed   ：随机种子（同一模板 + 不同种子 = 造型/朝向/装饰不同的新画稿）
 *   - pal    ：调色板家族（PALETTES 的键）
 *   - rot    ：色板轮转偏移（同族不同配色）
 *   - detail ：细节密度 0~1（控制装饰区域数量，随关卡推进提高）
 * · PALETTES：每个家族 14 色起，编号 1..K 依序取色；相邻区域编号互异
 *   由模板作者保证（模板里相邻形状用不同槽位号）。
 * =====================================================================
 */

export const PALETTES = {
  /* 清新花园 */
  garden: [
    "#e63946", "#f4a261", "#ffd166", "#2a9d8f", "#264653", "#e76f51",
    "#8ab17d", "#ef476f", "#06d6a0", "#118ab2", "#f78c6b", "#8338ec",
    "#3a86ff", "#fb8500",
  ],
  /* 落日暖沙 */
  sunset: [
    "#ff9f1c", "#ffbf69", "#ff5964", "#6a0572", "#f72c25", "#fde74c",
    "#f45866", "#c1436d", "#fa7d61", "#ffe066", "#9e2a2b", "#e07a5f",
    "#f2cc8f", "#81b29a",
  ],
  /* 海底清凉 */
  ocean: [
    "#00b4d8", "#0077b6", "#90e0ef", "#023e8a", "#48cae4", "#ade8f4",
    "#03045e", "#0096c7", "#caf0f8", "#2ec4b6", "#5eead4", "#0ea5e9",
    "#f7d488", "#ff7b54",
  ],
  /* 糖果甜心 */
  candy: [
    "#ff6b9d", "#ffc2d1", "#ff9770", "#ffd670", "#e9ff70", "#a3f7bf",
    "#4ecdc4", "#5aa9e6", "#f686bd", "#fdedcf", "#b388eb", "#8093f1",
    "#ff8fa3", "#fb6f92",
  ],
  /* 森林晨雾 */
  forest: [
    "#2d6a4f", "#74c69d", "#d8f3dc", "#1b4332", "#95d5b2", "#b7e4c7",
    "#40916c", "#dda15e", "#bc6c25", "#606c38", "#a98467", "#8a817c",
    "#ffe8d6", "#463f3a",
  ],
  /* 静谧星夜 */
  night: [
    "#0d1b2a", "#1b3a4b", "#1b998b", "#2ec4b6", "#f6bd60", "#f28482",
    "#84a59d", "#f5cac3", "#3d5a80", "#98c1d9", "#e0fbfc", "#ee6c4d",
    "#293241", "#c9ada7",
  ],
  /* 马卡龙粉彩 */
  pastel: [
    "#ffd6e0", "#ffefcf", "#c1fba4", "#9bf6ff", "#a0c4ff", "#bdb2ff",
    "#ffc6ff", "#fffffc", "#fdffe0", "#caffbf", "#9bf6ff", "#ffadad",
    "#b9fbc0", "#90dbf4",
  ],
  /* 香料集市 */
  spice: [
    "#9c1f1f", "#d64550", "#f28f3b", "#f7c59f", "#5f0f40", "#fb8b24",
    "#e36414", "#0f4c5c", "#9a031e", "#5aa02e", "#c5d86d", "#e8b04b",
    "#7a4069", "#d7a3e0",
  ],
};

/** 56 关：模板 × 种子 × 调色板（难度随关卡号平滑爬坡） */
export const LEVELS = [
  { id: 1,  theme: "butterfly",   seed: 101, pal: "garden",  rot: 0, detail: 0.00 },
  { id: 2,  theme: "flowerpot",   seed: 102, pal: "candy",   rot: 0, detail: 0.00 },
  { id: 3,  theme: "mandala",     seed: 103, pal: "sunset",  rot: 0, detail: 0.00 },
  { id: 4,  theme: "balloon",     seed: 104, pal: "pastel",  rot: 0, detail: 0.00 },
  { id: 5,  theme: "koi",         seed: 105, pal: "ocean",   rot: 0, detail: 0.00 },
  { id: 6,  theme: "icecream",    seed: 106, pal: "candy",   rot: 2, detail: 0.10 },
  { id: 7,  theme: "owl",         seed: 107, pal: "forest",  rot: 0, detail: 0.10 },
  { id: 8,  theme: "butterfly",   seed: 108, pal: "spice",   rot: 1, detail: 0.25 },
  { id: 9,  theme: "sailboat",    seed: 109, pal: "ocean",   rot: 3, detail: 0.10 },
  { id: 10, theme: "mushroom",    seed: 110, pal: "garden",  rot: 2, detail: 0.15 },
  { id: 11, theme: "snail",       seed: 111, pal: "pastel",  rot: 1, detail: 0.15 },
  { id: 12, theme: "mandala",     seed: 112, pal: "night",   rot: 0, detail: 0.30 },
  { id: 13, theme: "flowerpot",   seed: 113, pal: "sunset",  rot: 1, detail: 0.30 },
  { id: 14, theme: "rocket",      seed: 114, pal: "night",   rot: 2, detail: 0.15 },
  { id: 15, theme: "bee",         seed: 115, pal: "garden",  rot: 4, detail: 0.20 },
  { id: 16, theme: "lighthouse",  seed: 116, pal: "ocean",   rot: 1, detail: 0.20 },
  { id: 17, theme: "cat",         seed: 117, pal: "spice",   rot: 3, detail: 0.15 },
  { id: 18, theme: "koi",         seed: 118, pal: "ocean",   rot: 5, detail: 0.35 },
  { id: 19, theme: "balloon",     seed: 119, pal: "sunset",  rot: 2, detail: 0.35 },
  { id: 20, theme: "whale",       seed: 120, pal: "ocean",   rot: 2, detail: 0.20 },
  { id: 21, theme: "teapot",      seed: 121, pal: "pastel",  rot: 3, detail: 0.20 },
  { id: 22, theme: "castle",      seed: 122, pal: "garden",  rot: 1, detail: 0.20 },
  { id: 23, theme: "owl",         seed: 123, pal: "night",   rot: 1, detail: 0.35 },
  { id: 24, theme: "mandala",     seed: 124, pal: "candy",   rot: 4, detail: 0.50 },
  { id: 25, theme: "icecream",    seed: 125, pal: "sunset",  rot: 4, detail: 0.35 },
  { id: 26, theme: "windmill",    seed: 126, pal: "garden",  rot: 5, detail: 0.25 },
  { id: 27, theme: "snail",       seed: 127, pal: "forest",  rot: 2, detail: 0.40 },
  { id: 28, theme: "hummingbird", seed: 128, pal: "sunset",  rot: 5, detail: 0.25 },
  { id: 29, theme: "sailboat",    seed: 129, pal: "sunset",  rot: 0, detail: 0.45 },
  { id: 30, theme: "butterfly",   seed: 130, pal: "pastel",  rot: 2, detail: 0.55 },
  { id: 31, theme: "mushroom",    seed: 131, pal: "forest",  rot: 4, detail: 0.45 },
  { id: 32, theme: "rocket",      seed: 132, pal: "spice",   rot: 2, detail: 0.40 },
  { id: 33, theme: "bee",         seed: 133, pal: "candy",   rot: 1, detail: 0.50 },
  { id: 34, theme: "lighthouse",  seed: 134, pal: "night",   rot: 4, detail: 0.50 },
  { id: 35, theme: "cat",         seed: 135, pal: "night",   rot: 3, detail: 0.40 },
  { id: 36, theme: "whale",       seed: 136, pal: "pastel",  rot: 4, detail: 0.50 },
  { id: 37, theme: "teapot",      seed: 137, pal: "spice",   rot: 1, detail: 0.50 },
  { id: 38, theme: "castle",      seed: 138, pal: "night",   rot: 5, detail: 0.50 },
  { id: 39, theme: "flowerpot",   seed: 139, pal: "spice",   rot: 5, detail: 0.55 },
  { id: 40, theme: "hummingbird", seed: 140, pal: "ocean",   rot: 4, detail: 0.55 },
  { id: 41, theme: "owl",         seed: 141, pal: "spice",   rot: 4, detail: 0.60 },
  { id: 42, theme: "koi",         seed: 142, pal: "candy",   rot: 5, detail: 0.60 },
  { id: 43, theme: "windmill",    seed: 143, pal: "sunset",  rot: 3, detail: 0.60 },
  { id: 44, theme: "mandala",     seed: 144, pal: "ocean",   rot: 2, detail: 0.70 },
  { id: 45, theme: "balloon",     seed: 145, pal: "spice",   rot: 0, detail: 0.65 },
  { id: 46, theme: "snail",       seed: 146, pal: "sunset",  rot: 4, detail: 0.70 },
  { id: 47, theme: "butterfly",   seed: 147, pal: "night",   rot: 2, detail: 0.70 },
  { id: 48, theme: "sailboat",    seed: 148, pal: "forest",  rot: 1, detail: 0.65 },
  { id: 49, theme: "rocket",      seed: 149, pal: "ocean",   rot: 0, detail: 0.70 },
  { id: 50, theme: "hummingbird", seed: 150, pal: "forest",  rot: 3, detail: 0.75 },
  { id: 51, theme: "castle",      seed: 151, pal: "spice",   rot: 3, detail: 0.75 },
  { id: 52, theme: "whale",       seed: 152, pal: "night",   rot: 0, detail: 0.75 },
  { id: 53, theme: "lighthouse",  seed: 153, pal: "sunset",  rot: 2, detail: 0.80 },
  { id: 54, theme: "bee",         seed: 154, pal: "night",   rot: 1, detail: 0.80 },
  { id: 55, theme: "teapot",      seed: 155, pal: "ocean",   rot: 3, detail: 0.85 },
  { id: 56, theme: "mandala",     seed: 156, pal: "garden",  rot: 3, detail: 0.90 },
];

/** 按 id 取关卡定义（越界取最后一关，永不返回 undefined） */
export function levelDef(id) {
  const i = Math.max(0, Math.min(LEVELS.length, id | 0) - 1);
  return LEVELS[i] || LEVELS[0];
}

export default LEVELS;
