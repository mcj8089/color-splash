/**
 * COLOR SPLASH · 文案包（EN 默认 / ZH 由 URL ?lang=zh 决定）
 * =====================================================================
 * 规则：
 *   · 默认英文；语言只来自 DEFAULT_LOCALE + URL 参数，游戏内无切换按钮；
 *   · 同一页面只渲染单一语言，缺 key 返回 key 本身，绝不混排；
 *   · 插值语法 {var}。
 * =====================================================================
 */

export const DEFAULT_LOCALE = "en";

export const LOCALES = {
  /* ------------------------------------------------------------------ */
  /* English                                                             */
  /* ------------------------------------------------------------------ */
  en: {
    /* ---- 开屏 ---- */
    boot_brand: "pipygames.com",
    boot_loading: "Squeezing the paints",
    boot_stage_scene: "Stretching the canvas",
    boot_stage_palette: "Mixing pigments",
    boot_stage_levels: "Sketching 56 pictures",
    boot_stage_audio: "Tuning the studio",
    boot_stage_ready: "Ready to paint",
    boot_tip_1: "Pick a numbered color from the palette, then tap regions with the same number.",
    boot_tip_2: "Drag to paint several regions in one stroke.",
    boot_tip_3: "Pinch or use the slider to zoom into tiny details.",
    boot_tip_4: "The magnifier shows how many regions of the selected color are left.",
    rotate_hint: "Rotate your device for the full studio view.",

    /* ---- 主菜单 ---- */
    menu_subtitle: "Coloring by numbers, reborn",
    menu_play: "Start Painting",
    menu_continue: "Continue — Picture {n}",
    menu_levels: "Gallery",
    menu_settings: "Settings",
    menu_share: "Invite Friends",
    menu_howto: "How to Play",
    menu_reset: "Erase Save",
    menu_reset_confirm: "Erase all progress? This cannot be undone.",
    menu_reset_done: "Save erased.",
    menu_stats_levels: "Pictures Finished",
    menu_footer: "Free online coloring · no download · plays in your browser",

    /* ---- 画廊（关卡选择） ---- */
    levels_title: "Gallery",
    levels_sub: "{done} of {total} pictures finished",
    levels_locked: "Finish the previous picture to unlock",
    levels_done: "Done",
    levels_page: "Page {a} / {b}",
    levels_back: "Back",

    /* ---- HUD ---- */
    hud_back: "Back to gallery",
    hud_zoom_in: "Zoom in",
    hud_zoom_out: "Zoom out",
    hud_hint: "Find the next region",
    hud_settings: "Settings",
    hud_palette_all_done: "Color finished!",
    hud_level: "Picture {n}",

    /* ---- 完成弹窗 ---- */
    complete_title: "Masterpiece!",
    complete_sub: "Picture {n} finished",
    complete_next: "Next Picture",
    complete_gallery: "Gallery",
    complete_share: "Share It",

    /* ---- 设置 ---- */
    settings_title: "Settings",
    settings_sound: "Sound",
    settings_music: "Music",
    settings_effects: "Sound Effects",
    settings_close: "Close",
    howto_title: "How to Play",
    howto_1: "Tap a numbered paint chip to pick that color.",
    howto_2: "Tap matching numbered regions on the canvas to fill them.",
    howto_3: "Drag across regions of the same number to paint faster.",
    howto_4: "Fill every region to complete the picture.",

    /* ---- 引导 ---- */
    tut_skip: "Skip",
    tut_step1: "Tap this paint chip",
    tut_step2: "Now tap the glowing region",
    tut_step3: "Keep painting to relax!",

    /* ---- 分享 ---- */
    share_title: "Invite Friends",
    share_name_ph: "Your nickname (optional)",
    share_native: "System Share",
    share_copy: "Copy Link",
    share_card: "Make Card",
    share_card_download: "Download card",
    share_copied: "Link copied!",
    share_failed: "Copy failed — long-press to copy.",
    share_saved: "Card ready — download it below.",
    share_platform_facebook: "Facebook",
    share_platform_x: "X (Twitter)",
    share_platform_reddit: "Reddit",
    share_platform_whatsapp: "WhatsApp",
    share_platform_telegram: "Telegram",
    share_platform_linkedin: "LinkedIn",
    share_platform_youtube: "YouTube",
    share_platform_tiktok: "TikTok",
    share_platform_instagram: "Instagram",
    invite_prefix: "@{name} invites you to play {title}",
    share_card_sub: "I just finished picture #{lv} — come color with me!",
    share_card_sub_zero: "Relaxing paint-by-numbers — come try it!",

    /* ---- 域名锁 ---- */
    domain_locked: "Unauthorized site",
    domain_redirect: "Redirecting to pipygames.com in {s}s…",
    domain_go: "Go now",

    /* ---- 杂项 ---- */
    ad_playing: "Ad playing…",
    loading: "Loading…",
  },

  /* ------------------------------------------------------------------ */
  /* 中文                                                                */
  /* ------------------------------------------------------------------ */
  zh: {
    /* ---- 开屏 ---- */
    boot_brand: "pipygames.com",
    boot_loading: "正在挤出颜料",
    boot_stage_scene: "正在绷开画布",
    boot_stage_palette: "正在调和颜料",
    boot_stage_levels: "正在打稿 56 幅画",
    boot_stage_audio: "正在调音工作室",
    boot_stage_ready: "准备开画",
    boot_tip_1: "在色盘上点选编号颜色，再点画稿上相同编号的区域。",
    boot_tip_2: "按住拖动，可以一笔涂满多个同编号区域。",
    boot_tip_3: "双指捏合或用滑杆放大，细小区域也不漏。",
    boot_tip_4: "放大镜会提示当前颜色还剩几块区域。",
    rotate_hint: "横置设备，获得完整工作室视野。",

    /* ---- 主菜单 ---- */
    menu_subtitle: "数字填色，全新演绎",
    menu_play: "开始涂色",
    menu_continue: "继续 — 第 {n} 幅",
    menu_levels: "画廊",
    menu_settings: "设置",
    menu_share: "邀请好友",
    menu_howto: "玩法说明",
    menu_reset: "清除存档",
    menu_reset_confirm: "确定清除全部进度？该操作无法撤销。",
    menu_reset_done: "存档已清除。",
    menu_stats_levels: "已完成画稿",
    menu_footer: "免费在线填色 · 无需下载 · 打开即玩",

    /* ---- 画廊 ---- */
    levels_title: "画廊",
    levels_sub: "已完成 {done} / {total} 幅",
    levels_locked: "完成上一幅即可解锁",
    levels_done: "已完成",
    levels_page: "第 {a} / {b} 页",
    levels_back: "返回",

    /* ---- HUD ---- */
    hud_back: "返回画廊",
    hud_zoom_in: "放大",
    hud_zoom_out: "缩小",
    hud_hint: "寻找下一块区域",
    hud_settings: "设置",
    hud_palette_all_done: "这个颜色涂完啦！",
    hud_level: "第 {n} 幅",

    /* ---- 完成弹窗 ---- */
    complete_title: "大功告成！",
    complete_sub: "第 {n} 幅画作完成",
    complete_next: "下一幅",
    complete_gallery: "画廊",
    complete_share: "晒一晒",

    /* ---- 设置 ---- */
    settings_title: "设置",
    settings_sound: "声音",
    settings_music: "音乐",
    settings_effects: "音效",
    settings_close: "关闭",
    howto_title: "玩法说明",
    howto_1: "点选底部色盘中带编号的颜料。",
    howto_2: "点击画稿上相同编号的区域完成填色。",
    howto_3: "按住拖过同编号区域，涂色更快。",
    howto_4: "涂满全部区域即可完成画作。",

    /* ---- 引导 ---- */
    tut_skip: "跳过",
    tut_step1: "点一下这块颜料",
    tut_step2: "再点亮闪烁的区域",
    tut_step3: "继续涂色，放松一下！",

    /* ---- 分享 ---- */
    share_title: "邀请好友",
    share_name_ph: "你的昵称（可选）",
    share_native: "系统分享",
    share_copy: "复制链接",
    share_card: "生成卡片",
    share_card_download: "下载卡片",
    share_copied: "链接已复制！",
    share_failed: "复制失败，请长按复制。",
    share_saved: "卡片已生成，点击下方保存。",
    share_platform_facebook: "Facebook",
    share_platform_x: "X (推特)",
    share_platform_reddit: "Reddit",
    share_platform_whatsapp: "WhatsApp",
    share_platform_telegram: "Telegram",
    share_platform_linkedin: "领英",
    share_platform_youtube: "YouTube",
    share_platform_tiktok: "抖音国际版",
    share_platform_instagram: "Instagram",
    invite_prefix: "@{name} 邀请你来玩 {title}",
    share_card_sub: "我刚涂完第 {lv} 幅画，快来一起填色！",
    share_card_sub_zero: "超解压的数字填色，快来试试！",

    /* ---- 域名锁 ---- */
    domain_locked: "未授权站点",
    domain_redirect: "{s} 秒后跳转至 pipygames.com…",
    domain_go: "立即前往",

    /* ---- 杂项 ---- */
    ad_playing: "广告播放中…",
    loading: "加载中…",
  },
};

export default LOCALES;
