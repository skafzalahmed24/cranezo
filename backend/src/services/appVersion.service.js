/**
 * Force update. The rules live in .env, so an update can be forced with a restart and no new app build:
 *   APP_MIN_VERSION_CODE     apps older than this must update (hard block)
 *   APP_LATEST_VERSION_CODE  apps older than this are asked to update (can be skipped)
 *   APP_LATEST_VERSION_NAME  shown to the user, e.g. 1.0.5
 *   APP_STORE_URL            where the update button goes (Play Store page)
 *   APP_UPDATE_MESSAGE       optional text for the update screen
 */
const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};

const settings = () => {
  const min = num(process.env.APP_MIN_VERSION_CODE, 0);
  const latest = Math.max(min, num(process.env.APP_LATEST_VERSION_CODE, min));
  return {
    min_version_code: min,
    latest_version_code: latest,
    latest_version_name: process.env.APP_LATEST_VERSION_NAME || null,
    store_url: process.env.APP_STORE_URL || 'https://play.google.com/store/apps/details?id=com.cranezo',
    message: process.env.APP_UPDATE_MESSAGE || 'A new version of Cranezo is available. Please update to continue.'
  };
};

/** What the app should do for the version it is running */
const check = (versionCode) => {
  const s = settings();
  const v = num(versionCode, null);
  return {
    ...s,
    update_required: v !== null && v < s.min_version_code,
    update_available: v !== null && v < s.latest_version_code
  };
};

/** Express middleware: an app that sends its version and is below the minimum gets 426 (Upgrade Required) */
const blockOldApps = (req, res, next) => {
  if (req.path.startsWith('/app/') || req.path === '/health') return next();
  const header = req.get('X-App-Version-Code');
  if (header === undefined) return next(); // web admin panel, Swagger, tools
  const result = check(header);
  if (!result.update_required) return next();
  return res.status(426).json({ success: false, message: result.message, data: { ...result } });
};

module.exports = { check, settings, blockOldApps };
