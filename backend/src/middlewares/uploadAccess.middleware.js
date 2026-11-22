const path = require('path');
const { verifyToken } = require('../utils/jwt');

/**
 * Uploaded files (crane photos, documents, profile pictures, support attachments) are private.
 * A copied link opened in a browser gets a security error; only a signed-in app or admin panel,
 * which sends its token with the request, can open a file.
 *
 * The one exception is a banner picture: banners are shown on the public website before anybody signs in.
 */
const BANNER_TTL_MS = 60 * 1000;
let bannerCache = { at: 0, files: new Set() };

/** The file names of every banner picture (kept for a minute so the database is not asked for each image) */
const publicBannerFiles = async () => {
  if (Date.now() - bannerCache.at < BANNER_TTL_MS) return bannerCache.files;
  try {
    const { Banner } = require('../models');
    const rows = await Banner.findAll({ attributes: ['image'], raw: true });
    bannerCache = { at: Date.now(), files: new Set(rows.map((r) => path.basename(String(r.image || '')))) };
  } catch (error) {
    // the database could not be asked: keep the old list, banners are the only thing that stays open
    bannerCache.at = Date.now();
  }
  return bannerCache.files;
};

const deny = (res) => {
  res.set('Cache-Control', 'no-store');
  return res.status(401).json({
    status: 0,
    success: false,
    message: 'Security error: this file can only be opened inside the Cranezo app after signing in.',
    timestamp: new Date().toISOString()
  });
};

const requireSignedInForUploads = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const decoded = token ? verifyToken(token) : null;
    // a refresh token is not a login; a valid access token (app, admin, owner staff, view-only) is
    if (decoded && decoded.id && decoded.type !== 'refresh') {
      res.set('Cache-Control', 'private, max-age=3600');
      res.set('X-Content-Type-Options', 'nosniff');
      return next();
    }

    const file = path.basename(decodeURIComponent(req.path || ''));
    if (file && (await publicBannerFiles()).has(file)) return next();
    return deny(res);
  } catch (error) {
    return deny(res);
  }
};

module.exports = { requireSignedInForUploads };
