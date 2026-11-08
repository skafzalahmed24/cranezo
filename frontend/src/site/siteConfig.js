// What the public website says about Cranezo. Change the contact details and the store link here.

// The website is not live yet: every public address shows the simple "coming soon" page.
// Set SITE_LIVE to true to open Home, About and Contact (the pages are built and ready).
// LEGAL_LIVE opens only the Privacy and Terms pages (the Play Store needs a privacy policy link).
export const SITE_LIVE = false;

// The "coming soon" countdown on the welcome page counts down to this moment (70 days from 8 Nov 2026)
export const LAUNCH_AT = '2027-01-17T19:00:00+05:30';
export const LEGAL_LIVE = false;

export const SITE = {
  name: 'Cranezo',
  // the Play Store page of the app
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.cranezo',
  // shown in the footer and on the Contact page; a field left empty is simply not shown
  email: 'support@cranezo.com',
  phone: '',
  address: '',
};

export const CRANE_TYPES = [
  { name: 'Mobile Crane', text: 'Mounted on a truck, quick to reach the site. The all-round choice for most building and city jobs.' },
  { name: 'Rough Terrain Crane', text: 'Four-wheel drive for uneven, muddy or unfinished sites where other cranes cannot go.' },
  { name: 'Crawler Crane', text: 'Runs on tracks that spread the weight. Made for heavy lifts on soft or rough ground.' },
  { name: 'Truck Mounted Crane', text: 'Drives on the road at normal speed and sets up fast. Good for short, frequent jobs.' },
  { name: 'All Terrain Crane', text: 'Road speed with off-road ability, for large projects spread over a big area.' },
  { name: 'Tower Crane', text: 'Tall fixed cranes that lift to great heights, built for high-rise construction.' },
  { name: 'Pick & Carry Crane', text: 'Compact and able to move with the load, ideal for factories and tight work yards.' },
];

export const STEPS = [
  { title: 'Choose your crane', text: 'Pick the crane type and the capacity in tons. A short note under each size tells you what it is used for.' },
  { title: 'Set the site and time', text: 'Drop a pin on the map, choose now or a later date, and how many hours or days you need.' },
  { title: 'Owners respond fast', text: 'Nearby owners get your request at the same moment. The first to accept gets the job, and you pay a small advance online.' },
  { title: 'Track and finish', text: 'Watch the crane arrive on the map, share a one-time code to complete the job, and get your receipt.' },
];

export const FEATURES = [
  { icon: 'shield', title: 'Verified owners and operators', text: 'Licences and IDs are checked by our team before an operator can take a job.' },
  { icon: 'rupee', title: 'Clear prices', text: 'You see the estimate before you send the request. No surprise charges at the end.' },
  { icon: 'card', title: 'Safe online payment', text: 'Pay by UPI, card or net banking. The small online payment fee is shown upfront.' },
  { icon: 'pin', title: 'Live tracking', text: 'See where your crane is, how far it is and when it will reach your site.' },
  { icon: 'lang', title: 'In your language', text: 'The app works in English, Hindi and Telugu.' },
  { icon: 'receipt', title: 'Receipts and support', text: 'Every job has a receipt, and help is one tap away in the app.' },
];

export const FAQ = [
  { q: 'How quickly can I get a crane?', a: 'Your request goes to every suitable owner near your site at the same time, and the first owner who accepts gets the job. How soon the crane arrives depends on how close it is, and you can follow it live on the map.' },
  { q: 'How is the price decided?', a: 'The price is the crane hire for your hours or days, a distance charge when the site is far, any extra charges the owner has set, and taxes where they apply. You see the estimate before you send the request.' },
  { q: 'Do I have to pay in advance?', a: 'Once an owner accepts, you pay a small advance online to confirm the booking. You pay the rest after the job is done.' },
  { q: 'Are the operators trained and checked?', a: 'Yes. Operators upload their licence and ID, and our team verifies them before they can take any job.' },
  { q: 'Can I book a crane for a later date?', a: 'Yes. Choose "Now" for an urgent job, or pick a date and time for later.' },
  { q: 'Which languages does the app support?', a: 'English, Hindi and Telugu. You can change the language any time in the app.' },
];
