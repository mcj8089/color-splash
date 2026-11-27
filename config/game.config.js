/**
 * COLOR SPLASH · 全局配置（唯一数值权威来源）
 * =====================================================================
 * 玩法：对标「按数字涂色」（Color by Numbers）核心循环——
 *   底部色盘选编号颜色 → 点画稿上相同编号的区域 → 填色 → 全图完成进入下一关。
 * 引擎零硬编码：音量 / 画布 / 关卡数量 / 存档键 全部读这里。
 * =====================================================================
 */

export const GAME_CONFIG = {
  meta: {
    id: "color-splash",
    title: "Color Splash: Paint by Numbers",
    titleZh: "缤纷调色盘：数字填色",
    tagline: "A little color, a lot of calm.",
    taglineZh: "一点色彩，一份宁静。",
    saveKey: "color-splash.save.v1",
    version: "1.0.0",
  },

  /* ---------------- 画布 / 相机 ---------------- */
  view: {
    design: 1000,          // 画稿设计空间边长（所有模板都用 0~1000 坐标）
    minScale: 1,           // 相机最小缩放 = 恰好完整显示画稿
    maxScale: 7,           // 相机最大缩放（细部涂色）
    zoomSliderSteps: 40,   // 右侧缩放滑杆的分档数
    wheelZoomStep: 0.18,   // 桌面滚轮每档缩放增量
    pinchSensitivity: 1.6, // 双指捏合灵敏度
    panDamping: 0.18,      // 摄像机惯性阻尼（越小越跟手）
    clampMargin: 0.12,     // 平移边界余量（画稿外允许看到的比例）
  },

  /* ---------------- 玩法手感 ---------------- */
  play: {
    popScale: 0.22,        // 填色成功时的弹性缩放幅度
    popMs: 260,            // 填色弹跳动画时长
    shakeMs: 240,          // 错误点击时区域抖动时长
    sparkMs: 620,          // 完成一关时星星飞散时长
    confettiCount: 90,     // 通关彩纸数量
    fillDragThrottleMs: 60,// 拖动连涂的节流（毫秒）
    hintPulseMs: 1400,     // 放大镜提示的脉冲圈时长
    labelMinArea: 900,     // 区域面积小于该值（设计空间）不显示编号
    labelFontRatio: 0.16,  // 编号字号 = sqrt(面积) × 比例
  },

  /* ---------------- 进度 / 关卡 ---------------- */
  progress: {
    /* 关卡解锁规则：完成第 N 关解锁第 N+1 关；totalLevels 取 config/levels.js */
    unlockFirst: 1,
  },

  /* ---------------- 音频 ---------------- */
  audio: {
    master: 0.9,
    bgm: 0.55,
    sfx: 0.9,
    defaultEnabled: true,
  },

  /* ---------------- 资源清单 ---------------- */
  assets: {
    audio: {
      base: "assets/audio/",
      sfx: [
        "ui_click", "ui_hover", "ui_back", "ui_open", "ui_error",
        "brush_fill", "brush_drag", "palette_pick", "region_wrong",
        "level_complete", "star_pop", "sparkle",
      ],
      bgm: [
        "bgm_menu", "bgm_paint",
      ],
    },
    images: {
      base: "assets/images/",
    },
  },
};

/** 便捷读取：关卡总数（levels.js 在此只暴露 LEVELS / PALETTES） */
export const TOTAL_LEVELS = 56;

export default GAME_CONFIG;
