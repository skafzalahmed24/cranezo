/**
 * Login OTP. Real codes are sent and checked by Twilio Verify (SMS). Nothing is stored in our database:
 * Twilio makes the code, sends it, expires it (10 minutes) and rate-limits sending and wrong guesses.
 *
 * .env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID (starts with VA).
 * Without them the app uses the fixed test code (DEFAULT_OTP, 123456), but never when NODE_ENV=production.
 */
const VERIFY_URL = 'https://verify.twilio.com/v2/Services';

class OtpError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const config = () => ({
  sid: process.env.TWILIO_ACCOUNT_SID,
  token: process.env.TWILIO_AUTH_TOKEN,
  service: process.env.TWILIO_VERIFY_SERVICE_SID
});

const twilioConfigured = () => {
  const c = config();
  return !!(c.sid && c.token && c.service);
};

const call = async (path, fields) => {
  const c = config();
  const res = await fetch(`${VERIFY_URL}/${c.service}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${c.sid}:${c.token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(fields).toString(),
    signal: AbortSignal.timeout(15000)
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
};

/** +91 and 9876543210 -> +919876543210 */
const e164 = (countryCode, phone) => `+${String(countryCode || '+91').replace(/\D/g, '')}${String(phone).replace(/\D/g, '')}`;

class OtpService {
  /** True when real SMS codes are used (the response must then never contain the code) */
  isLive() {
    return twilioConfigured();
  }

  /** The fixed test code, or null when it must not be used (production, or real SMS is on) */
  testCode() {
    if (twilioConfigured() || process.env.NODE_ENV === 'production') return null;
    return process.env.DEFAULT_OTP || '123456';
  }

  async send(countryCode, phone) {
    if (!twilioConfigured()) {
      if (process.env.NODE_ENV === 'production') {
        throw new OtpError('The OTP service is not set up. Please contact support.', 503);
      }
      return { sent: false, test: true };
    }
    let result;
    try {
      result = await call('Verifications', { To: e164(countryCode, phone), Channel: 'sms' });
    } catch (error) {
      console.warn(`[OTP] Twilio request failed: ${error.message}`);
      throw new OtpError('Could not send the OTP right now. Please try again.', 503);
    }
    if (result.status >= 200 && result.status < 300) return { sent: true };
    console.warn(`[OTP] Twilio ${result.status} (${result.body.code}): ${result.body.message}`);
    if (result.status === 429) throw new OtpError('Too many OTP requests. Please wait a few minutes and try again.', 429);
    if (result.body.code === 60200) throw new OtpError('This mobile number is not valid.');
    throw new OtpError('Could not send the OTP. Please check the number and try again.', 503);
  }

  /** true when the code is right */
  async check(countryCode, phone, code) {
    const test = this.testCode();
    if (test) return String(code).trim() === test;
    if (!twilioConfigured()) return false;
    let result;
    try {
      result = await call('VerificationCheck', { To: e164(countryCode, phone), Code: String(code).trim() });
    } catch (error) {
      console.warn(`[OTP] Twilio check failed: ${error.message}`);
      throw new OtpError('Could not check the OTP right now. Please try again.', 503);
    }
    if (result.status === 429) throw new OtpError('Too many wrong attempts. Please request a new OTP.', 429);
    // 404: the code expired or was already used
    return result.status === 200 && result.body.status === 'approved';
  }
}

module.exports = { otpService: new OtpService(), OtpError };
