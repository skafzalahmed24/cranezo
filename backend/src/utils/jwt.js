const jwt = require('jsonwebtoken');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'cranzo_super_secret_jwt_key_2026_heavy_telemetry';
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '1d';

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'cranzo_super_secret_refresh_jwt_key_2026_heavy_telemetry';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

/**
 * Generate Access Token (short-to-medium lived)
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN
  });
};

/**
 * Generate Refresh Token (long lived)
 */
const generateRefreshToken = (payload) => {
  // Only embed essential identifiers in refresh token
  const refreshPayload = {
    id: payload.id,
    type: 'refresh'
  };
  return jwt.sign(refreshPayload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN
  });
};

/**
 * Generate both Access Token and Refresh Token for authentication
 */
const generateAuthTokens = (payload) => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: JWT_ACCESS_EXPIRES_IN
  };
};

/**
 * Backward compatibility alias
 */
const generateToken = (payload) => {
  return generateAccessToken(payload);
};

/**
 * Verify Access Token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET);
  } catch (error) {
    return null;
  }
};

const verifyAccessToken = verifyToken;

/**
 * Verify Refresh Token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  generateAccessToken,
  generateRefreshToken,
  generateAuthTokens,
  verifyToken,
  verifyAccessToken,
  verifyRefreshToken
};
