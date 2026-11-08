/**
 * Force update. The Super Admin sets the versions in the admin panel (Settings > App Versions); they are kept
 * in platform_settings, one row per platform (only android for now). The app sends its version NAME (1.0.4),
 * never the build number.
 *
 *   latest_version         the newest version in the store
 *   min_supported_version  apps below this MUST update (blocked)
 *   force_update           true: apps below latest_version must update too
 *   store_url / update_message  what the update screen shows
 */
const { PlatformSetting } = require('../models');

const PLATFORMS = ['android'];
const DEFAULT_STORE_URL = 'https://play.google.com/store/apps/details?id=com.cranezo';
const CACHE_MS = 60 * 1000;
const keyOf = (platform) => `app_version_${platform}`;

class AppVersionError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const VERSION_RE = /^\d+(\.\d+){1,3}$/;
const parts = (v) => String(v).trim().split('.').map(Number);

/** -1, 0 or 1 like a normal comparison, version by version (1.10.0 is newer than 1.9.0) */
const compare = (a, b) => {
  const x = parts(a);
  const y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
};

const view = (platform, row) => {
  const v = (row && row.value) || {};
  return {
    platform,
    latest_version: v.latest_version || null,
    min_supported_version: v.min_supported_version || null,
    force_update: !!v.force_update,
    store_url: v.store_url || null,
    update_message: v.update_message || null,
    updated_at: row ? new Date(row.updatedAt).toISOString() : null
  };
};

const cache = new Map();
const settingsOf = async (platform) => {
  const hit = cache.get(platform);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const row = await PlatformSetting.findByPk(keyOf(platform));
  const value = view(platform, row);
  cache.set(platform, { value, at: Date.now() });
  return value;
};

class AppVersionService {
  /** Super Admin: every platform's settings */
  async list() {
    cache.clear();
    const out = [];
    for (const platform of PLATFORMS) {
      const row = await PlatformSetting.findByPk(keyOf(platform)); // eslint-disable-line no-await-in-loop
      out.push(view(platform, row));
    }
    return out;
  }

  /** Super Admin: save one platform */
  async save(input = {}, adminId) {
    const platform = String(input.platform || 'android').toLowerCase();
    if (!PLATFORMS.includes(platform)) throw new AppVersionError('platform must be android');
    const latest = String(input.latest_version || '').trim();
    const min = String(input.min_supported_version || '').trim();
    if (!VERSION_RE.test(latest)) throw new AppVersionError('latest_version must look like 1.2.3');
    if (!VERSION_RE.test(min)) throw new AppVersionError('min_supported_version must look like 1.2.3');
    if (compare(min, latest) > 0) throw new AppVersionError('min_supported_version cannot be higher than latest_version.');
    const storeUrl = String(input.store_url || '').trim() || DEFAULT_STORE_URL;
    if (!/^https:\/\/\S+$/i.test(storeUrl)) throw new AppVersionError('store_url must be a link starting with https://');
    const message = String(input.update_message || '').trim();
    if (message.length > 300) throw new AppVersionError('update_message can be up to 300 characters.');
    await PlatformSetting.upsert({
      key: keyOf(platform),
      value: { latest_version: latest, min_supported_version: min, force_update: input.force_update === true || input.force_update === 'true', store_url: storeUrl, update_message: message || null },
      description: `App versions and force update (${platform})`,
      updatedBy: adminId ? String(adminId) : null
    });
    cache.clear();
    return (await this.list()).find((r) => r.platform === platform);
  }

  /** What the app should do for the version it is running (public) */
  async check(input = {}) {
    const platform = String(input.platform || '').toLowerCase();
    if (!PLATFORMS.includes(platform)) throw new AppVersionError('platform must be android');
    const current = String(input.current_version || '').trim();
    if (!VERSION_RE.test(current)) throw new AppVersionError('version must look like 1.2.3');
    const s = await settingsOf(platform);
    const out = {
      platform,
      current_version: current,
      update_required: false,
      update_available: false,
      latest_version: s.latest_version,
      min_supported_version: s.min_supported_version,
      store_url: s.store_url || (s.latest_version ? DEFAULT_STORE_URL : null),
      message: null
    };
    if (!s.latest_version) return { ...out, store_url: null }; // nothing set up for this platform
    out.update_available = compare(current, s.latest_version) < 0;
    out.update_required = (!!s.min_supported_version && compare(current, s.min_supported_version) < 0) || (s.force_update && out.update_available);
    if (out.update_required) out.message = s.update_message || 'Please update to continue.';
    else if (out.update_available) out.message = 'A new version is available.';
    return out;
  }
}

const appVersionService = new AppVersionService();

/** Express middleware: an app below the minimum gets 426 (Upgrade Required) on every call */
const blockOldApps = async (req, res, next) => {
  if (req.path.startsWith('/app/') || req.path === '/health') return next();
  const version = req.get('X-App-Version');
  if (!version || !VERSION_RE.test(version)) return next(); // admin panel, Swagger and tools send no version
  try {
    const result = await appVersionService.check({ platform: (req.get('X-App-Platform') || 'android'), current_version: version });
    if (!result.update_required) return next();
    return res.status(426).json({ success: false, message: result.message, data: result });
  } catch (error) {
    return next(); // a failing check never blocks the app
  }
};

module.exports = { appVersionService, AppVersionError, blockOldApps };
