'use strict';

// Starter Terms & Privacy content that follows the app screens.
// NOTE: this is placeholder wording, have it reviewed by legal counsel before launch.
const PAGES = [
  {
    page_type: 'terms',
    title: 'Terms & Conditions',
    intro: 'Please read these terms carefully before using the app.',
    last_updated: '2025-09-15',
    sections: [
      { title: 'Introduction', subtitle: null, body: 'Welcome to Cranezo. By accessing or using our mobile application, you agree to be bound by these Terms & Conditions. Please read them carefully before using the app.' },
      { title: 'Use of Services', subtitle: null, body: 'Cranezo provides a platform to help you find and book cranes and related services. You agree to use the app only for lawful purposes and in accordance with these terms.' },
      { title: 'User Responsibilities', subtitle: null, body: 'You are responsible for providing accurate information, maintaining the confidentiality of your account, and for all activities that occur under your account.' },
      { title: 'Bookings and Payments', subtitle: null, body: 'All bookings are subject to availability and confirmation. Prices, payment methods, cancellation policies, and refunds are as specified in the app at the time of booking.' },
      { title: 'Cancellation and Refunds', subtitle: null, body: 'Cancellation and refund requests are handled as per our cancellation policy. Refunds, if applicable, will be processed to the original payment method within the specified timeframe.' },
      { title: 'Limitation of Liability', subtitle: null, body: 'Cranezo is not liable for any indirect, incidental, or consequential damages arising from the use of our services.' },
      { title: 'Changes to Terms', subtitle: null, body: 'We may update these Terms & Conditions from time to time. Continued use of the app after changes constitutes your acceptance of the updated terms.' }
    ]
  },
  {
    page_type: 'privacy',
    title: 'Privacy Policy',
    intro: 'We are committed to protecting your personal information and ensuring transparency in how we use it.',
    last_updated: '2025-09-15',
    sections: [
      { title: 'Information We Collect', subtitle: 'Types of information we collect from you', body: 'Depending on how you use Cranezo, we may collect information such as your name, mobile number, email address, location, booking details, payment information, and information you provide when contacting our support team.' },
      { title: 'How We Use Your Information', subtitle: 'Ways we use your data', body: 'We use your information to provide and improve our services, process bookings and payments, verify identity, send important updates, and provide customer support.' },
      { title: 'Information Sharing', subtitle: 'When and with whom we share your data', body: 'We share information with crane owners and operators only as needed to fulfil your bookings, and with service providers or authorities where required by law. We do not sell your personal information.' },
      { title: 'Data Security', subtitle: 'How we protect your information', body: 'We use reasonable technical and organisational safeguards to protect your information against unauthorised access, loss or misuse.' },
      { title: 'Your Rights', subtitle: 'Your choices and controls over your data', body: 'You can view and update your personal information in the app, change your notification preferences, and contact us to request access to or deletion of your data.' },
      { title: 'Cookies and Tracking', subtitle: 'How we use cookies and similar tools', body: 'We may use cookies and similar technologies to keep you signed in, remember your preferences and understand how the app is used.' },
      { title: 'Third-Party Services', subtitle: 'Links to external services', body: 'The app may link to or integrate third-party services such as payment providers and maps. Their use of your information is governed by their own privacy policies.' },
      { title: 'Contact Us', subtitle: 'Get in touch for privacy-related queries', body: 'For questions about this Privacy Policy, contact our support team at support@cranezo.com.' }
    ]
  }
];

module.exports = {
  up: async (queryInterface) => {
    for (const page of PAGES) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM legal_pages WHERE page_type = '${page.page_type}'`
      );
      // never overwrite content someone has already edited
      if (existing.length) continue;

      await queryInterface.bulkInsert('legal_pages', [{
        ...page,
        sections: JSON.stringify(page.sections),
        is_active: 0,
        created_at: new Date(),
        updated_at: new Date()
      }]);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('legal_pages', { page_type: ['terms', 'privacy'] }, {});
  }
};
