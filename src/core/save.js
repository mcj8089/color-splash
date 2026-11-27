/**
 * COLOR SPLASH · 本地存档（关卡进度 / 涂色状态 / 设置）
 * =====================================================================
 * 与系列工程同一套「信封 + 校验和」防手改方案：
 *   · 存储 {v, data, sum}，sum = djb2(序列化 data + 盐)；
 *   · 任何异常退默认值，永不抛异常、永不白屏；
 *   · 隐私模式 / file:// 降级内存对象；
 *   · 数值夹取上限来自 src/sdk/sdk.config.js 的 save.guard（level 60 / count 1e6）。
 * 存档字段：
 *   cur       当前进度关卡（下一个要画的画稿 id，1 起）
 *   fills     { [levelId]: { filled:number[], done:boolean } } 每幅画的填色状态
 *   nickname  分享用昵称
 *   seenHowto 是否看过玩法说明
 *   settings  { sound, music, effects }
 * =====================================================================
 */

import { GAME_CONFIG } from "../../config/game.config.js";
import { LEVELS } from "../../config/levels.js";

const SAVE_VERSION = 1;
const SALT = "color-splash.save.v1";
const FALLBACK_GUARD = { level: 60, done: 60, count: 1e6 };
const TEXT_MAX = 24;
const TAG_RE = /<[^>]*>/g;
const ANGLE_RE = /[<>"'`&]/g;
const CONTROL_RE = new RegExp("[\\u0000-\\u001f\\u007f]", "g");

function readGuard() {
  const sdkCfg = typeof globalThis !== "undefined" ? globalThis.SDK_CONFIG : null;
  const g = (sdkCfg && sdkCfg.save && sdkCfg.save.guard) || {};
  return {
    level: Number.isFinite(g.level) ? g.level : FALLBACK_GUARD.level,
    done: Number.isFinite(g.done) ? g.done : FALLBACK_GUARD.done,
    count: Number.isFinite(g.count) ? g.count : FALLBACK_GUARD.count,
  };
}

function readKey(config) {
  const fromCfg = config && config.meta && config.meta.saveKey;
  if (fromCfg) return String(fromCfg);
  return "color-splash.save.v1";
}

const clampInt = (v, min, max, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : def;
};

function toBool(v, def) {
  if (v === true || v === false) return v;
  if (v == null || v === "") return def;
  return !!v;
}

function cleanText(v) {
  return String(v == null ? "" : v)
    .replace(CONTROL_RE, " ")
    .replace(TAG_RE, " ")
    .replace(ANGLE_RE, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TEXT_MAX);
}

function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

const checksum = (body) => djb2(String(body) + SALT);

/** 由 config 推出的默认设置 */
export function defaultSettings(config) {
  const audio = (config && config.audio) || {};
  return {
    sound: toBool(audio.defaultEnabled, true),
    music: true,
    effects: true,
  };
}

/** 默认存档体 */
export function defaultData(config) {
  return {
    cur: 1,
    fills: {},
    nickname: "",
    seenHowto: false,
    seenGuide: false,
    settings: defaultSettings(config),
  };
}

export class SaveStore {
  /**
   * @param {object} [opts] {config, guard, sdk}
   */
  constructor(opts) {
    const o = opts || {};
    this.config = o.config || GAME_CONFIG;
    this.key = readKey(this.config);
    this.guard = Object.assign(readGuard(), o.guard || {});
    this.sdk = o.sdk || null;
    this.persistent = this._detectStorage();
    this._mem = new Map();
    this.data = defaultData(this.config);
    this.lastLoad = { ok: true, reason: "fresh", sum: 0 };
  }

  /* ------------------------------ 存储后端 ------------------------------ */

  _detectStorage() {
    try {
      const ls = this._ls();
      if (!ls) return false;
      const probe = this.key + ".probe";
      ls.setItem(probe, "1");
      ls.removeItem(probe);
      return true;
    } catch (e) {
      return false;
    }
  }

  _ls() {
    try {
      return typeof localStorage !== "undefined" ? localStorage : null;
    } catch (e) {
      return null;
    }
  }

  _getItem(k) {
    if (this.persistent) {
      try {
        return this._ls().getItem(k);
      } catch (e) {
        this.persistent = false;
      }
    }
    return this._mem.get(k) ?? null;
  }

  _setItem(k, v) {
    if (this.persistent) {
      try {
        this._ls().setItem(k, v);
        return true;
      } catch (e) {
        this.persistent = false;
      }
    }
    this._mem.set(k, v);
    return false;
  }

  _removeItem(k) {
    if (this.persistent) {
      try {
        this._ls().removeItem(k);
      } catch (e) {
        this.persistent = false;
      }
    }
    this._mem.delete(k);
  }

  /* ------------------------------ 归一化 ------------------------------ */

  /** 单幅画的填色记录归一化：filled 去重升序、done 布尔化 */
  _normFill(raw) {
    const g = this.guard;
    let arr = Array.isArray(raw && raw.filled) ? raw.filled : [];
    const seen = new Set();
    const out = [];
    for (const v of arr) {
      const n = clampInt(v, 0, g.count, -1);
      if (n >= 0 && !seen.has(n)) {
        seen.add(n);
        out.push(n);
      }
      if (out.length > 4096) break; // 单幅画区域数上限，防御异常数据
    }
    out.sort((a, b) => a - b);
    return { filled: out, done: toBool(raw && raw.done, false) };
  }

  _normalize(raw) {
    const d = raw && typeof raw === "object" ? raw : {};
    const g = this.guard;
    const base = defaultData(this.config);
    const out = {
      cur: clampInt(d.cur, 1, Math.min(g.level, LEVELS.length), 1),
      fills: {},
      nickname: cleanText(d.nickname),
      seenHowto: toBool(d.seenHowto, false),
      seenGuide: toBool(d.seenGuide, false),
      settings: Object.assign(base.settings,
        d.settings && typeof d.settings === "object" ? d.settings : {}),
    };
    const s = out.settings;
    for (const k of Object.keys(base.settings)) s[k] = toBool(s[k], base.settings[k]);
    /* fills 只保留合法关卡 id */
    if (d.fills && typeof d.fills === "object") {
      for (const k of Object.keys(d.fills)) {
        const id = clampInt(k, 1, LEVELS.length, -1);
        if (id > 0) out.fills[id] = this._normFill(d.fills[k]);
      }
    }
    return out;
  }

  _envelope(data) {
    const body = JSON.stringify(data);
    return JSON.stringify({ v: SAVE_VERSION, data, sum: checksum(body) });
  }

  /* ------------------------------ 读 / 写 ------------------------------ */

  load() {
    const rawText = this._getItem(this.key);
    if (!rawText) {
      this.data = defaultData(this.config);
      this.lastLoad = { ok: true, reason: "empty", sum: 0 };
      this.persist();
      return this.snapshot();
    }
    let env = null;
    try {
      env = JSON.parse(rawText);
    } catch (e) {
      env = null;
    }
    if (!env || typeof env !== "object" || !env.data) {
      this.data = defaultData(this.config);
      this.lastLoad = { ok: false, reason: "corrupt", sum: 0 };
      this.persist();
      return this.snapshot();
    }
    const body = JSON.stringify(env.data);
    const expected = checksum(body);
    if (Number(env.sum) !== expected) {
      /* 校验和不符 = 手改过 JSON：整份作废回默认值并回写干净档 */
      this._reportTamper("checksum");
      this.data = defaultData(this.config);
      this.lastLoad = { ok: false, reason: "checksum-mismatch", sum: expected };
      this.persist();
      return this.snapshot();
    }
    this.data = this._normalize(env.data);
    this.lastLoad = { ok: true, reason: "ok", sum: expected };
    this.persist();
    return this.snapshot();
  }

  save(patch) {
    if (patch && typeof patch === "object") {
      const next = Object.assign({}, this.data, patch);
      if (patch.settings && typeof patch.settings === "object") {
        next.settings = Object.assign({}, this.data.settings, patch.settings);
      }
      this.data = this._normalize(next);
    } else {
      this.data = this._normalize(this.data);
    }
    this.persist();
    return this.snapshot();
  }

  persist() {
    const ok = this._setItem(this.key, this._envelope(this.data));
    if (this.sdk && this.sdk.shield) {
      try {
        this.sdk.shield.save(this.data, this.key);
      } catch (e) { /* SDK 缺失不影响存档 */ }
    }
    return { written: ok !== false, persistent: this.persistent };
  }

  reset() {
    this._removeItem(this.key);
    this.data = defaultData(this.config);
    this.lastLoad = { ok: true, reason: "reset", sum: 0 };
    this.persist();
    return this.snapshot();
  }

  /* --------------------------- 关卡进度 API --------------------------- */

  /** 读某幅画的填色记录（无则返回空记录） */
  getFill(levelId) {
    const id = Math.max(1, levelId | 0);
    return this._normFill(this.data.fills[id] || {});
  }

  /** 写某幅画的填色记录（引擎每次填色/完成时调用） */
  setFill(levelId, filled, done) {
    const id = Math.max(1, levelId | 0);
    this.data.fills[id] = this._normFill({ filled: filled || [], done: !!done });
    this.persist();
    return this.data.fills[id];
  }

  /** 完成一幅画：推进 cur（只前进不后退），标记 done */
  completeLevel(levelId) {
    const id = Math.max(1, levelId | 0);
    this.data.fills[id] = this._normFill({
      filled: (this.data.fills[id] && this.data.fills[id].filled) || [],
      done: true,
    });
    const maxCur = Math.min(this.guard.level, LEVELS.length);
    if (id >= this.data.cur && this.data.cur < maxCur) {
      this.data.cur = Math.min(maxCur, id + 1);
    }
    this.persist();
    return this.data.cur;
  }

  /** 已完成画稿数 */
  get doneCount() {
    let n = 0;
    for (const k of Object.keys(this.data.fills)) {
      if (this.data.fills[k] && this.data.fills[k].done) n++;
    }
    return Math.min(n, this.guard.done);
  }

  /** 某幅画是否解锁：id ≤ cur 恒可玩；否则需前面全部完成（即 id ≤ cur） */
  isUnlocked(levelId) {
    return (levelId | 0) <= this.data.cur;
  }

  setNickname(name) {
    this.data.nickname = cleanText(name);
    this.persist();
    return this.data.nickname;
  }

  markSeenHowto() {
    if (!this.data.seenHowto) {
      this.data.seenHowto = true;
      this.persist();
    }
    return this.data.seenHowto;
  }

  /** 标记「已看过进画引导」：之后右上角出现重看按钮 */
  markSeenGuide() {
    if (!this.data.seenGuide) {
      this.data.seenGuide = true;
      this.persist();
    }
    return this.data.seenGuide;
  }

  /* ------------------------------ 设置项 ------------------------------ */

  get settings() {
    return Object.assign({}, this.data.settings);
  }

  setSettings(patch) {
    const p = patch && typeof patch === "object" ? patch : {};
    const next = Object.assign({}, this.data.settings);
    for (const k of Object.keys(next)) if (k in p) next[k] = toBool(p[k], next[k]);
    this.data = this._normalize(Object.assign({}, this.data, { settings: next }));
    this.persist();
    return this.settings;
  }

  setSetting(name, value) {
    return this.setSettings({ [name]: value });
  }

  /* ------------------------------ 便捷读 ------------------------------ */

  get cur() { return this.data.cur; }
  get nickname() { return this.data.nickname; }

  snapshot() {
    return {
      cur: this.data.cur,
      doneCount: this.doneCount,
      nickname: this.data.nickname,
      seenHowto: this.data.seenHowto,
      settings: this.settings,
      persistent: this.persistent,
    };
  }

  verify() {
    const rawText = this._getItem(this.key);
    if (!rawText) return { ok: true, reason: "empty", sum: 0, persistent: this.persistent };
    let env = null;
    try {
      env = JSON.parse(rawText);
    } catch (e) {
      return { ok: false, reason: "corrupt", sum: 0, persistent: this.persistent };
    }
    if (!env || typeof env !== "object" || !env.data) {
      return { ok: false, reason: "corrupt", sum: 0, persistent: this.persistent };
    }
    const sum = checksum(JSON.stringify(env.data));
    const ok = Number(env.sum) === sum;
    return { ok, reason: ok ? "ok" : "checksum-mismatch", sum, persistent: this.persistent };
  }

  _reportTamper(type) {
    if (!this.sdk) return;
    try {
      if (this.sdk.protect && this.sdk.protect.fireTamper) this.sdk.protect.fireTamper({ type, key: this.key });
      else if (this.sdk.track) this.sdk.track("tamper", { type, key: this.key });
    } catch (e) { /* 上报失败不影响游戏 */ }
  }
}

export { SAVE_VERSION, FALLBACK_GUARD as GUARD_CAPS, checksum };

/** 工厂：构造完即已读盘 */
export function createSave(opts) {
  const store = new SaveStore(opts);
  store.load();
  return store;
}

export default SaveStore;
