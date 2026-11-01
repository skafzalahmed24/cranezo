// Notification Settings screen: groups and toggles, in display order.
// `default` is used until the user saves their own choice.
const NOTIFICATION_GROUPS = [
  {
    group: 'Booking Updates',
    items: [
      { key: 'booking_confirmations', title: 'Booking Confirmations', subtitle: 'Get notified when your booking is confirmed', default: true },
      { key: 'job_updates', title: 'Job Updates', subtitle: 'Receive updates about your ongoing jobs', default: true }
    ]
  },
  {
    group: 'Payments',
    items: [
      { key: 'payment_alerts', title: 'Payment Alerts', subtitle: 'Get notified about payments and receipts', default: true },
      { key: 'invoice_receipts', title: 'Invoice Receipts', subtitle: 'Receive invoices and payment receipts', default: true }
    ]
  },
  {
    group: 'Offers & Updates',
    items: [
      { key: 'offers_promotions', title: 'Offers & Promotions', subtitle: 'Get notified about special offers and discounts', default: false },
      { key: 'product_updates', title: 'Product Updates', subtitle: 'Be the first to know about new features', default: false }
    ]
  },
  {
    group: 'Communication',
    items: [
      { key: 'important_announcements', title: 'Important Announcements', subtitle: 'Receive important updates from our team', default: true },
      { key: 'support_messages', title: 'Support Messages', subtitle: 'Get notified about your support requests', default: true }
    ]
  }
];

const NOTIFICATION_KEYS = NOTIFICATION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

module.exports = { NOTIFICATION_GROUPS, NOTIFICATION_KEYS };
