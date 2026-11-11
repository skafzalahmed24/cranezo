/**
 * WhatsApp copies of notifications, sent through Twilio (Programmable Messaging, WhatsApp sender).
 *
 * Every notification that goes to the app (notificationService.notify) is also sent to the person's WhatsApp
 * on the mobile number they log in with. WhatsApp only allows business-started messages through templates
 * approved by Meta, so one "utility" template carries every notification:
 *
 *   Cranezo update: *{{1}}*
 *   {{2}}
 *   Open the Cranezo app for details.
 *
 *   {{1}} = the notification title, {{2}} = its text (the same words as the push, in the person's language).
 *
 * .env (all needed, otherwise WhatsApp is off and nothing else changes):
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN      the same as for the login OTP
 *   WHATSAPP_FROM                              the approved WhatsApp sender, e.g. +9198xxxxxxxx
 *                                              (or WHATSAPP_MESSAGING_SERVICE_SID, MG..., instead)
 *   WHATSAPP_TEMPLATE_SID                      the English template's Content SID (HX...)
 * optional:
 *   WHATSAPP_TEMPLATE_SID_HI, WHATSAPP_TEMPLATE_SID_TE   Hindi / Telugu templates (English is used when missing)
 *   WHATSAPP_TYPES                             only these notification types (comma list); default all but announcements
 *   WHATSAPP_ENABLED=false                     switches it off without removing the keys
 *
 * A failed WhatsApp message never stops the app notification; it is only logged.
 */

const API = 'https://api.twilio.com/2010-04-01/Accounts';

// marketing-style messages are not sent through the utility template (Meta would re-classify or block it)
const NEVER = new Set(['announcement']);

const cfg = () => ({
  sid: process.env.TWILIO_ACCOUNT_SID,
  token: process.env.TWILIO_AUTH_TOKEN,
  from: (process.env.WHATSAPP_FROM || '').trim(),
  service: (process.env.WHATSAPP_MESSAGING_SERVICE_SID || '').trim(),
  templates: {
    en: (process.env.WHATSAPP_TEMPLATE_SID || '').trim(),
    hi: (process.env.WHATSAPP_TEMPLATE_SID_HI || '').trim(),
    te: (process.env.WHATSAPP_TEMPLATE_SID_TE || '').trim()
  },
  types: (process.env.WHATSAPP_TYPES || '').split(',').map((t) => t.trim()).filter(Boolean)
});

const enabled = () => {
  if (String(process.env.WHATSAPP_ENABLED || '').toLowerCase() === 'false') return false;
  const c = cfg();
  return !!(c.sid && c.token && (c.from || c.service) && c.templates.en);
};

const wants = (type) => {
  if (!type || NEVER.has(type)) return false;
  const { types } = cfg();
  return types.length === 0 || types.includes(type);
};

/** WhatsApp template values: no new lines or tabs, no more than 4 spaces in a row, not empty, not too long */
const clean = (text, max) => {
  const s = String(text || '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim();
  return (s || '-').slice(0, max);
};

/** +91 and 9876543210 -> whatsapp:+919876543210 */
const address = (countryCode, phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 6) return null;
  return `whatsapp:+${String(countryCode || '+91').replace(/\D/g, '')}${digits}`;
};

// the app's language setting: 1 English, 2 Telugu, 3 Hindi
const templateFor = (languageType) => {
  const t = cfg().templates;
  if (languageType === 3 && t.hi) return t.hi;
  if (languageType === 2 && t.te) return t.te;
  return t.en;
};

class WhatsappService {
  isEnabled() {
    return enabled();
  }

  /** user: { id, countryCode, mobileNumber, languageType }. Resolves to true when Twilio accepted the message. */
  async send(user, { type, title, body }) {
    if (!enabled() || !wants(type) || !user) return false;
    const to = address(user.countryCode, user.mobileNumber);
    if (!to) return false;
    const c = cfg();
    const fields = {
      To: to,
      ContentSid: templateFor(user.languageType),
      ContentVariables: JSON.stringify({ 1: clean(title, 120), 2: clean(body, 700) })
    };
    if (c.service) fields.MessagingServiceSid = c.service;
    else fields.From = c.from.startsWith('whatsapp:') ? c.from : `whatsapp:${c.from}`;
    try {
      const res = await fetch(`${API}/${c.sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${c.sid}:${c.token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(fields).toString(),
        signal: AbortSignal.timeout(15000)
      });
      if (res.ok) return true;
      const err = await res.json().catch(() => ({}));
      console.warn(`[WhatsApp] ${type} to user ${user.id}: Twilio ${res.status} (${err.code}) ${err.message || ''}`);
    } catch (error) {
      console.warn(`[WhatsApp] ${type} to user ${user.id}: ${error.message}`);
    }
    return false;
  }
}

module.exports = { whatsappService: new WhatsappService() };
