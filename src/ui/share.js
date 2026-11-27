/**
 * 社媒分享 —— 移动端原生分享 / 桌面端平台 URL / 图片卡片
 * =====================================================================
 * 平台：Facebook、X、Reddit、WhatsApp、Telegram、LinkedIn、YouTube、
 *       TikTok、Instagram（共 9 个，需求锁定）。
 * TikTok / Instagram / YouTube 没有可用的「带图分享」Web 端点
 *   → 生成分享卡片（比赛截图 + 昵称 + 排名 + 站点水印）+ 复制链接。
 * 移动端优先 navigator.share（Web Share API），拿不到才退回平台 URL。
 * 分享前可填昵称，产生裂变文案「@{昵称} 邀请你来玩 …」。
 * 卡片由 src/art/ui_art.js 的 drawShareCard 程序化绘制（可带比赛截图），
 * 全程本地 Canvas —— file:// 下也不会被跨源污染。
 * =====================================================================
 */

import { $, $$ } from "./ui.js";
import { drawShareCard } from "../art/ui_art.js";

/** 九个平台：id 用于逻辑分支，labelKey 用于 i18n，icon 是手绘 path（非字体图标） */
export const PLATFORMS = [
  {
    id: "facebook", labelKey: "share_platform_facebook", color: "#1877F2",
    icon: '<path d="M13.5 21v-7.3h2.6l.4-3h-3V8.9c0-.9.2-1.5 1.5-1.5h1.6V4.7c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.1H8v3h2.6V21z"/>',
  },
  {
    id: "twitter", labelKey: "share_platform_x", color: "#e7e9ea",
    icon: '<path d="M17.3 3h3.3l-7.2 8.2L21 21h-5.6l-4-5.4L6.3 21H3l7.5-8.6L2.6 3h5.7l3.8 5.1zM16.2 19.2h1.8L7.9 4.7H6z"/>',
  },
  {
    id: "reddit", labelKey: "share_platform_reddit", color: "#FF4500",
    icon: '<path d="M12 3.5c4.4 0 8 1.4 8 3.2 0 .8-.7 1.6-1.9 2.2.1.5.2 1 .2 1.6 0 3-2.8 5.5-6.3 5.5s-6.3-2.5-6.3-5.5c0-.6.1-1.1.2-1.6C3.7 8.3 3 7.5 3 6.7c0-1.8 3.6-3.2 8-3.2zM9 11.2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zm6 0a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zm-5.9 4.4c.8.7 1.9 1.1 2.9 1.1s2.1-.4 2.9-1.1a.7.7 0 0 0-.9-1c-.6.5-1.3.7-2 .7s-1.4-.2-2-.7a.7.7 0 0 0-.9 1z"/>',
  },
  {
    id: "whatsapp", labelKey: "share_platform_whatsapp", color: "#25D366",
    icon: '<path d="M12 3a8.7 8.7 0 0 0-7.4 13.3L3.4 21l4.8-1.2A8.7 8.7 0 1 0 12 3zm4.5 11.6c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.7-.1-1.4-.4-3-1.5-3.9-2.8-.6-.9-1-1.9-.9-2.6 0-.6.5-1.4 1-1.7.3-.2.7-.1.9.3l.7 1.3c.1.3.1.4 0 .6l-.4.5c-.1.2-.2.3 0 .5.5.8 1.2 1.4 2 1.7.2.1.4.1.5-.1l.5-.6c.2-.2.3-.2.6-.1l1.3.6c.3.2.4.4.3.7z"/>',
  },
  {
    id: "telegram", labelKey: "share_platform_telegram", color: "#26A5E4",
    icon: '<path d="M21.3 4.3 2.9 11.5c-.9.3-.9.9-.2 1.1l4.6 1.4 1.8 5.4c.2.6.4.7 1 .3l2.6-1.9 4.5 3.3c.8.5 1.3.2 1.5-.7l2.8-13.2c.2-1-.4-1.5-1.2-1.1zM8.9 13.8l8.9-5.6c.4-.3.8-.1.5.2l-7.6 6.9-.3 3.2z"/>',
  },
  {
    id: "linkedin", labelKey: "share_platform_linkedin", color: "#0A66C2",
    icon: '<path d="M6.9 8.6H4V20h2.9zM5.4 4a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4zM20 13.6c0-3-1.6-4.4-3.8-4.4-1.7 0-2.5.9-3 1.6V8.6H10.4V20h2.9v-6.2c0-1.3.7-2.1 1.8-2.1s1.7.7 1.7 2.1V20H20z"/>',
  },
  {
    id: "youtube", labelKey: "share_platform_youtube", color: "#FF0033", card: true,
    icon: '<path d="M21 8.2c-.2-1.3-.8-2-2.1-2.2C16.9 5.7 12 5.7 12 5.7s-4.9 0-6.9.3C3.8 6.2 3.2 6.9 3 8.2c-.2 1.3-.3 2.6-.3 3.8s.1 2.5.3 3.8c.2 1.3.8 2 2.1 2.2 2 .3 6.9.3 6.9.3s4.9 0 6.9-.3c1.3-.2 1.9-.9 2.1-2.2.2-1.3.3-2.6.3-3.8s-.1-2.5-.3-3.8zM10.2 15.4V8.6l5.9 3.4z"/>',
  },
  {
    id: "tiktok", labelKey: "share_platform_tiktok", color: "#FE2C55", card: true,
    icon: '<path d="M16.2 3h-2.8v11.5a2.4 2.4 0 1 1-1.8-2.3V9.3a5.3 5.3 0 1 0 4.6 5.2V8.9a6 6 0 0 0 3.4 1.1V7.2a3.4 3.4 0 0 1-3.4-3.4z"/>',
  },
  {
    id: "instagram", labelKey: "share_platform_instagram", color: "#E1306C", card: true,
    icon: '<path d="M12 7.6A4.4 4.4 0 1 0 12 16.4 4.4 4.4 0 0 0 12 7.6zm0 7.2a2.8 2.8 0 1 1 0-5.6 2.8 2.8 0 0 1 0 5.6zM17.9 7.4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM20 8.8c-.1-1.4-.4-2.6-1.4-3.6S16.4 4 15 3.8c-1.4-.1-5.6-.1-7 0-1.4.1-2.6.4-3.6 1.4S3.1 7.4 3 8.8c-.1 1.4-.1 5.6 0 7 .1 1.4.4 2.6 1.4 3.6s2.2 1.3 3.6 1.4c1.4.1 5.6.1 7 0 1.4-.1 2.6-.4 3.6-1.4s1.3-2.2 1.4-3.6c.1-1.4.1-5.6 0-7z"/>',
  },
];

export class SharePanel {
  /**
   * @param {object} opt
   * @param {object} opt.ui     UI 实例（open/toast/save/audio）
   * @param {object} opt.i18n
   * @param {string} opt.baseUrl 分享落地页
   * @param {()=>object} opt.getState 返回 {lv}（当前画稿编号，0=未开画）
   * @param {Function} [opt.track]
   * @param {()=>HTMLCanvasElement|null} [opt.gameCanvas] 比赛画布（截图用）
   * @param {object} [opt.meta]
   */
  constructor(opt) {
    this.ui = opt.ui;
    this.i18n = opt.i18n;
    this.meta = opt.meta || {};
    this.baseUrl = opt.baseUrl;
    this.getState = opt.getState || (() => ({ lv: 0 }));
    this.track = opt.track || (() => {});
    this.gameCanvas = opt.gameCanvas || (() => null);
    this.el = {
      grid: $("#share-grid"),
      name: $("#share-name"),
      preview: $("#share-preview"),
      native: $("#btn-share-native"),
      copy: $("#btn-share-copy"),
      card: $("#btn-share-card"),
      cardbox: $("#share-cardbox"),
      canvas: $("#share-canvas"),
      download: $("#share-card-download"),
    };
    this._buildTiles();
    this._bind();
  }

  /* ---------------------------------------------------------------- */
  /* 构建                                                              */
  /* ---------------------------------------------------------------- */

  _buildTiles() {
    const grid = this.el.grid;
    if (!grid) return;
    grid.innerHTML = "";
    this.tiles = PLATFORMS.map((p, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "share-tile";
      btn.dataset.platform = p.id;
      btn.style.animationDelay = `${i * 45}ms`;
      // data-i18n 只挂内部 span：挂按钮本身会让 i18n.apply 覆写掉 SVG 图标
      btn.title = p.id;
      btn.innerHTML =
        `<svg viewBox="0 0 24 24" fill="${p.color}" aria-hidden="true">${p.icon}</svg>` +
        `<span data-i18n="${p.labelKey}"></span>`;
      btn.querySelector("span").textContent = this.i18n.t(p.labelKey);
      grid.appendChild(btn);
      return btn;
    });
    this._refreshPreview();
  }

  _bind() {
    if (this.el.grid) {
      this.el.grid.addEventListener("click", (ev) => {
        const tile = ev.target.closest(".share-tile");
        if (!tile) return;
        if (this.ui.audio) this.ui.blip("ui_click");
        this.share(tile.dataset.platform);
      });
    }
    if (this.el.name) {
      const remember = () => {
        this._refreshPreview();
        if (this.ui.save && this.ui.save.setNickname) this.ui.save.setNickname(this.name);
      };
      this.el.name.addEventListener("input", remember);
      this.el.name.addEventListener("change", remember);
    }
    if (this.el.native) this.el.native.addEventListener("click", () => this.shareNative());
    if (this.el.copy) this.el.copy.addEventListener("click", () => this.copyLink());
    if (this.el.card) this.el.card.addEventListener("click", () => this.showCard());
  }

  /** 语言包重载后重绘平台名 */
  refreshLabels() {
    if (!this.el.grid) return;
    $$(".share-tile", this.el.grid).forEach((tile) => {
      const p = PLATFORMS.find((x) => x.id === tile.dataset.platform);
      if (!p) return;
      const span = tile.querySelector("span");
      if (span) span.textContent = this.i18n.t(p.labelKey);
    });
    this._refreshPreview();
  }

  /* ---------------------------------------------------------------- */
  /* 文案与链接                                                        */
  /* ---------------------------------------------------------------- */

  get name() {
    return (this.el.name && this.el.name.value.trim().slice(0, 18)) || "";
  }

  get shareUrl() {
    const s = this.getState();
    const params = new URLSearchParams();
    params.set("ref", "share");
    if (this.name) params.set("from", this.name);
    if (s.lv > 0) params.set("lv", String(s.lv | 0));
    if (this.i18n.locale === "zh") params.set("lang", "zh");
    const base = this.baseUrl.endsWith("/") ? this.baseUrl : this.baseUrl + "/";
    return `${base}?${params.toString()}`;
  }

  /** 裂变文案：@昵称 邀请你来玩 + 进度炫耀句 */
  get text() {
    const s = this.getState();
    const title = this.i18n.isZh ? this.meta.titleZh || "缤纷调色盘" : this.meta.title || "Color Splash: Paint by Numbers";
    const invite = this.i18n.t("invite_prefix", { name: this.name || "Painter", title });
    const sub = this.i18n.t(s.lv > 0 ? "share_card_sub" : "share_card_sub_zero", { lv: s.lv | 0 });
    return this.name ? `${invite} — ${sub}` : sub;
  }

  _refreshPreview() {
    if (this.el.preview) this.el.preview.textContent = this.text;
  }

  open() {
    if (this.el.name && !this.el.name.value && this.ui.save && this.ui.save.nickname) {
      this.el.name.value = this.ui.save.nickname;
    }
    this._refreshPreview();
    if (this.el.cardbox) this.el.cardbox.hidden = true;
    this.ui.open("share");
    this.track("share_open", { lv: this.getState().lv | 0 });
  }

  /* ---------------------------------------------------------------- */
  /* 分享动作                                                          */
  /* ---------------------------------------------------------------- */

  /** 移动端优先原生分享 */
  async shareNative() {
    const payload = {
      title: this.i18n.isZh ? this.meta.titleZh || "缤纷调色盘" : this.meta.title || "Color Splash: Paint by Numbers",
      text: this.text,
      url: this.shareUrl,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(payload);
        this.track("share", { platform: "native", name: this.name, ok: true });
        return true;
      } catch (err) {
        this.track("share", { platform: "native", name: this.name, ok: false, reason: String(err && err.name) });
        return false;
      }
    }
    /* 无原生分享 → 直接退回复制链接 */
    return this.copyLink();
  }

  /** 桌面端：打开官方分享 URL；TikTok/Instagram/YouTube 走卡片方案 */
  share(platform) {
    const url = encodeURIComponent(this.shareUrl);
    const text = encodeURIComponent(this.text);
    const links = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      reddit: `https://www.reddit.com/submit?url=${url}&title=${text}`,
      whatsapp: `https://api.whatsapp.com/send?text=${text}%20${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      youtube: "https://www.youtube.com/upload",
      tiktok: "https://www.tiktok.com/upload?lang=en",
      instagram: "https://www.instagram.com/",
    };
    this.track("share", { platform, name: this.name, lv: this.getState().lv | 0 });
    const target = links[platform];
    if (!target) return false;
    if (this.isMobile()) {
      this.shareNative().then((ok) => {
        if (!ok) this.copyLink();
      });
      return true;
    }
    if (platform === "youtube" || platform === "tiktok" || platform === "instagram") {
      this.showCard();
      this.copyLink();
      window.open(target, "_blank", "noopener,noreferrer");
      return true;
    }
    window.open(target, "_blank", "noopener,noreferrer,width=760,height=640");
    return true;
  }

  /** 触屏 / 小屏 → 优先 Web Share API */
  isMobile() {
    if (typeof navigator === "undefined") return false;
    const coarse = window.matchMedia && window.matchMedia("(pointer:coarse)").matches;
    return coarse || /Android|iPhone|iPad|Mobile|Silk/i.test(navigator.userAgent || "");
  }

  async copyLink() {
    const link = this.shareUrl;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
      } else {
        const ta = document.createElement("textarea");
        ta.value = link;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      this.ui.toast("share_copied", null, "good");
      this.track("share", { platform: "copy", name: this.name, ok: true });
      return true;
    } catch (e) {
      this.ui.toast("share_failed", null, "bad");
      return false;
    }
  }

  /* ---------------------------------------------------------------- */
  /* 分享卡片（ui_art.drawShareCard：截图 + 昵称 + 排名 + 水印）        */
  /* ---------------------------------------------------------------- */

  showCard() {
    const cv = this.el.canvas;
    if (!cv) return null;
    try {
      this.renderCard(cv);
      if (this.el.cardbox) {
        this.el.cardbox.hidden = false;
        if (this.el.download) {
          this.el.download.href = cv.toDataURL("image/png");
          this.el.download.download = "color-splash-share-card.png";
        }
      }
      this.ui.toast("share_saved", null, "good");
      this.track("share", { platform: "card", name: this.name, lv: this.getState().lv | 0 });
      return cv;
    } catch (err) {
      this.ui.toast("share_failed", null, "bad");
      return null;
    }
  }

  /** 把卡片画进任意 canvas（验收脚本也用它做像素断言） */
  renderCard(canvas) {
    const s = this.getState();
    const card = drawShareCard({
      name: this.name,
      lv: s.lv | 0,
      shot: this.gameCanvas(),
    });
    canvas.width = card.width;
    canvas.height = card.height;
    canvas.getContext("2d").drawImage(card, 0, 0);
    return canvas;
  }

  /** 供 OG/预览：卡片导出 dataURL */
  cardDataUrl() {
    const cv = this.el.canvas;
    if (!cv) return "";
    try {
      this.renderCard(cv);
      return cv.toDataURL("image/png");
    } catch (e) {
      return "";
    }
  }
}

export default SharePanel;
