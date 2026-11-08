const { Op } = require('sequelize');
const { User, Booking } = require('../models');
const { BOOKING_STATUS } = require('../constants/booking');
const { notificationService } = require('./notification.service');

// An operator who forgot to switch Offline should not look available for ever.
const IDLE_MINUTES = Number(process.env.OPERATOR_IDLE_OFFLINE_MINUTES) || 30;
// Warn the owner when an assigned operator is offline and the job starts within this many hours.
const WARN_HOURS = 3;
const warned = new Set(); // booking ids already warned about (a restart may repeat one notice, never more)

class PresenceService {
  /**
   * 1) Online operators who sent nothing for IDLE_MINUTES (no location, no app use) and have no running job
   *    are switched Offline and told so.
   * 2) Owners are warned when the operator of a job starting soon is offline.
   */
  async tick() {
    await this.setIdleOffline();
    await this.warnOwners();
  }

  async setIdleOffline() {
    const cutoff = new Date(Date.now() - IDLE_MINUTES * 60 * 1000);
    const idle = await User.findAll({
      where: { roleId: 2, isOnline: true, onlineUpdatedAt: { [Op.lt]: cutoff } },
      attributes: ['id']
    });
    for (const u of idle) {
      const running = await Booking.count({
        where: { operatorId: u.id, status: { [Op.in]: [BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.IN_PROGRESS] } }
      });
      if (running) continue; // never drop an operator in the middle of a job
      await User.update({ isOnline: false, onlineUpdatedAt: new Date() }, { where: { id: u.id } });
      await notificationService.notify(u.id, {
        type: 'account_status',
        title: 'You were set Offline',
        body: 'You were away for a while, so we switched you to Offline. Turn Online on when you are ready for jobs.',
        data: {},
        i18n: {
          hi: { title: 'आप ऑफ़लाइन कर दिए गए', body: 'आप कुछ देर से सक्रिय नहीं थे, इसलिए हमने आपको ऑफ़लाइन कर दिया। जॉब के लिए तैयार होने पर ऑनलाइन चालू करें।' },
          te: { title: 'మీరు ఆఫ్‌లైన్ చేయబడ్డారు', body: 'మీరు కొంతసేపు యాక్టివ్‌గా లేరు, అందువల్ల మిమ్మల్ని ఆఫ్‌లైన్ చేసాము. జాబ్‌లకు సిద్ధంగా ఉన్నప్పుడు ఆన్‌లైన్ చేయండి.' }
        }
      });
    }
  }

  async warnOwners() {
    const now = new Date();
    const soon = new Date(now.getTime() + WARN_HOURS * 60 * 60 * 1000);
    const jobs = await Booking.findAll({
      where: {
        status: BOOKING_STATUS.CONFIRMED,
        operatorId: { [Op.ne]: null },
        enRouteAt: null,
        startAt: { [Op.gt]: now, [Op.lt]: soon }
      },
      include: [{ model: User, as: 'operator', attributes: ['id', 'fullName', 'isOnline'], where: { isOnline: false } }],
      attributes: ['id', 'bookingCode', 'ownerId']
    });
    for (const b of jobs) {
      if (warned.has(b.id)) continue;
      warned.add(b.id);
      await notificationService.notify(b.ownerId, {
        type: 'operator_offline',
        title: 'Your Operator is Offline',
        body: `${b.bookingCode}: ${b.operator.fullName || 'your operator'} is offline and the job starts soon. Ask them to go online or assign another operator.`,
        data: { booking_id: b.id, booking_code: b.bookingCode },
        i18n: {
          hi: { title: 'आपका ऑपरेटर ऑफ़लाइन है', body: `${b.bookingCode}: ${b.operator.fullName || 'आपका ऑपरेटर'} ऑफ़लाइन है और जॉब जल्द शुरू होगा। उन्हें ऑनलाइन होने को कहें या दूसरा ऑपरेटर चुनें।` },
          te: { title: 'మీ ఆపరేటర్ ఆఫ్‌లైన్‌లో ఉన్నారు', body: `${b.bookingCode}: ${b.operator.fullName || 'మీ ఆపరేటర్'} ఆఫ్‌లైన్‌లో ఉన్నారు మరియు జాబ్ త్వరలో మొదలవుతుంది. ఆన్‌లైన్ అవ్వమని చెప్పండి లేదా మరో ఆపరేటర్‌ను ఎంచుకోండి.` }
        }
      });
    }
    if (warned.size > 5000) warned.clear();
  }
}

module.exports = { presenceService: new PresenceService() };
