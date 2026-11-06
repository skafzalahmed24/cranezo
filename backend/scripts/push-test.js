/* eslint-disable no-console */
/**
 * Send a test push to one user, to check Firebase end to end.
 *
 *   npm run push:test -- 9876543210        (mobile number)
 *   npm run push:test -- OP591097          (member id)
 *
 * It tells you what is wrong when nothing arrives: no Firebase key, the user never registered a
 * device token (they must open the app while signed in), or Firebase refused the token.
 */
require('dotenv').config();
const path = require('path');

const who = String(process.argv[2] || '').trim();
if (!who) {
  console.log('Usage: npm run push:test -- <mobile number or member id>');
  process.exit(1);
}

(async () => {
  const { User } = require(path.join(__dirname, '..', 'src', 'models'));
  const { getMessaging } = require(path.join(__dirname, '..', 'src', 'services', 'notification.service'));

  const fcm = getMessaging();
  if (!fcm) {
    console.log('FAIL: Firebase is not set up. Put the service account json outside src/public and set FIREBASE_SERVICE_ACCOUNT_PATH in .env.');
    process.exit(1);
  }

  const user = await User.findOne({
    where: /^\d{6,}$/.test(who) ? { mobileNumber: who.slice(-10) } : { memberId: who.toUpperCase() },
    attributes: ['id', 'fullName', 'roleId', 'pushToken']
  });
  if (!user) {
    console.log(`FAIL: no user with ${who}.`);
    process.exit(1);
  }
  if (!user.pushToken) {
    console.log(`FAIL: ${user.fullName || user.id} has no device token. Open the app on the phone while signed in (and allow notifications), then try again.`);
    process.exit(1);
  }

  try {
    const id = await fcm.send({
      token: user.pushToken,
      notification: { title: 'Cranezo test', body: 'Push notifications are working.' },
      data: { type: 'test' },
      android: { priority: 'high', notification: { channelId: 'cranezo_updates', sound: 'default' } }
    });
    console.log(`OK: sent to ${user.fullName || user.id} (${id}). It should appear on the phone now.`);
    process.exit(0);
  } catch (error) {
    console.log(`FAIL: Firebase refused it: ${error.code || ''} ${error.message}`);
    if (String(error.code).includes('registration-token')) console.log('The token is old: open the app again on the phone to send a fresh one.');
    if (String(error.code).includes('mismatched-credential') || String(error.code).includes('sender-id')) {
      console.log('The app and this key belong to different Firebase projects: use the key from the same project as google-services.json.');
    }
    process.exit(1);
  }
})();
