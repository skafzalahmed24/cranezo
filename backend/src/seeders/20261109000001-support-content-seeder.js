'use strict';

// Starter Help & Support content. Everything here is editable in the admin panel (Support).
// NOTE: the phone numbers are intentionally empty, set them in Admin > Support > Settings.

const CATEGORIES = [
  { code: 'booking_help', name: 'Booking Help', description: 'Get help with bookings, modifications and more.', sort_order: 1 },
  { code: 'payment_help', name: 'Payment Help', description: 'Support for payments, refunds and invoices.', sort_order: 2 },
  { code: 'jobs', name: 'Jobs & Work', description: 'Starting, running and finishing a job.', sort_order: 3 },
  { code: 'account', name: 'Account & Profile', description: 'Your profile, documents and settings.', sort_order: 4 },
  { code: 'general', name: 'General', description: 'Everything else about Cranezo.', sort_order: 5 }
];

// audience: all, customer, operator or owner
const FAQS = [
  ['booking_help', 'customer', 'How do I book a crane?', 'Choose the crane type and capacity, set the job location, pick Now or a later date and time, choose the duration, then select a crane from the list and confirm. The crane owner has a few minutes to accept your request.'],
  ['booking_help', 'customer', 'What happens after I send a booking request?', 'The owner of the crane you selected is notified and has a few minutes to accept. You will get a notification when the booking is confirmed. If the owner declines or does not answer, you can choose another crane.'],
  ['booking_help', 'customer', 'Can I cancel a booking?', 'Yes. You can cancel while the booking is waiting for the owner or confirmed, before the crane starts its journey. Open My Jobs, choose the booking and tap Cancel Booking.'],
  ['booking_help', 'customer', 'How do I track my crane?', 'Open My Jobs or Track My Cranes and tap View Live Tracking once the operator has started the journey. You will see the crane on the map with the distance and arrival time.'],
  ['booking_help', 'owner', 'How do I accept a crane request?', 'When a customer requests one of your cranes you get a New Crane Request alert. Open Jobs, go to New Requests and tap Accept or Decline. If you do not answer in time the request expires.'],
  ['booking_help', 'owner', 'Why can customers not find my crane?', 'A crane is shown to customers only when it is Verified, set to Available, has a location, and is within 20 km of the job site. Check your crane in My Cranes.'],
  ['payment_help', 'customer', 'How do I pay for a booking?', 'For now payment is Cash on Delivery. When the job is completed, open the booking, tap Complete Payment, pay the amount in cash to the operator and confirm in the app.'],
  ['payment_help', 'customer', 'How is the final amount calculated?', 'The final amount is the booked amount plus any extra time approved during the job. You can see the breakdown on the Job Completed screen.'],
  ['payment_help', 'customer', 'Where can I find my receipt?', 'After you complete the payment, open the booking in My Jobs and tap View Receipt.'],
  ['payment_help', 'owner', 'When do I get my earnings?', 'Completed jobs are settled to you a few days after completion, after the Cranezo platform fee. You can see settled and pending amounts on the Earnings screen.'],
  ['payment_help', 'operator', 'How are my earnings shown?', 'Your completed jobs appear in Earnings with their amount and settlement status. Pending jobs are settled by the Cranezo team.'],
  ['jobs', 'customer', 'How do I ask for extra time?', 'While the job is in progress, tap Request Extra Time, choose how much you need and send the request. The operator answers within 5 minutes. Approved extra time is added to your final amount.'],
  ['jobs', 'operator', 'How do I start a job?', 'Accept the job, start the journey, mark that you have arrived, take site photos and complete the safety checklist. After the customer confirms your arrival you can start the job.'],
  ['jobs', 'operator', 'What if the crane breaks down?', 'In Job Monitoring tap Break Down, choose the breakdown type and add details and photos. The owner and the Cranezo team are notified straight away.'],
  ['jobs', 'operator', 'How do I complete a job?', 'Finish the work, add final photos and notes, then request customer confirmation. The customer receives a 6 digit code, enter it to complete the job.'],
  ['account', 'all', 'How do I update my profile or documents?', 'Open Profile, then Personal Information. You can change your details and upload new documents. Changed documents are checked again by the Cranezo team.'],
  ['account', 'all', 'How do I change the app language or theme?', 'Open Profile and choose Language or Appearance. Your choice is saved to your account.'],
  ['general', 'all', 'How do I contact Cranezo support?', 'Open Help & Support. You can call us, chat with the support team, or report an issue. Your requests are listed under My Support Requests.']
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const q = async (sql, replacements) => (await queryInterface.sequelize.query(sql, { replacements }))[0];

    // settings row (once)
    const [{ n }] = await q('SELECT COUNT(*)::int AS n FROM support_settings');
    if (!n) await queryInterface.bulkInsert('support_settings', [{ created_at: now, updated_at: now }]);

    // categories and FAQs, only what is missing (never overwrites admin edits)
    for (const c of CATEGORIES) {
      const exists = await q('SELECT id FROM faq_categories WHERE code = :code', { code: c.code });
      if (!exists.length) await queryInterface.bulkInsert('faq_categories', [{ ...c, is_active: 0, created_at: now, updated_at: now }]);
    }
    const categories = await q('SELECT id, code FROM faq_categories');
    const idOf = Object.fromEntries(categories.map((c) => [c.code, c.id]));

    let order = 0;
    for (const [code, audience, question, answer] of FAQS) {
      order += 1;
      const exists = await q('SELECT id FROM faqs WHERE question = :question', { question });
      if (exists.length) continue;
      await queryInterface.bulkInsert('faqs', [{
        category_id: idOf[code], question, answer, audience, sort_order: order, is_active: 0,
        helpful_yes: 0, helpful_no: 0, created_at: now, updated_at: now
      }]);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query('DELETE FROM faqs');
    await queryInterface.sequelize.query('DELETE FROM faq_categories');
    await queryInterface.sequelize.query('DELETE FROM support_settings');
  }
};
