import React, { useState } from 'react';
import {
  ShieldCheck, IndianRupee, CreditCard, MapPin, Languages, Receipt, Construction, ChevronDown,
  CheckCircle2, ArrowRight, Smartphone, HardHat, Briefcase, Navigation, Wallet, ClipboardCheck,
} from 'lucide-react';
import HeroArt from './HeroArt';
import { SITE, CRANE_TYPES, STEPS, FEATURES, FAQ } from './siteConfig';

const ICONS = { shield: ShieldCheck, rupee: IndianRupee, card: CreditCard, pin: MapPin, lang: Languages, receipt: Receipt };

const CAPACITIES = ['Up to 10 Ton', '10 to 25 Ton', '25 to 50 Ton', '50 to 100 Ton', 'Above 100 Ton'];

const PlayButton = ({ dark }) => (
  <a className={`cz-btn ${dark ? 'cz-btn-light' : 'cz-btn-dark'} cz-store`} href={SITE.playStoreUrl} target="_blank" rel="noopener noreferrer">
    <Smartphone size={20} />
    <span><small>Get it on</small>Google Play</span>
  </a>
);

export const HomePage = ({ onNavigate }) => {
  const [type, setType] = useState(CRANE_TYPES[0].name);
  const [capacity, setCapacity] = useState(CAPACITIES[0]);
  const [place, setPlace] = useState('');
  const [sent, setSent] = useState(false);
  const [faqOpen, setFaqOpen] = useState(0);

  // the booking itself happens in the app: the form leads there
  const onQuote = (e) => {
    e.preventDefault();
    setSent(true);
    const el = document.getElementById('download');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      {/* ------------------------------------------------------------------ hero */}
      <section className="cz-hero">
        <div className="cz-container cz-hero-grid">
          <div>
            <span className="cz-pill"><Construction size={14} /> Cranes for every site</span>
            <h1>Book the right crane, <span className="cz-accent">on time.</span></h1>
            <p className="cz-lead">Tell us the crane, the place and the time. Verified owners near your site are asked at once, and you follow your crane live on the map.</p>

            <form className="cz-quote" onSubmit={onQuote}>
              <div className="cz-quote-row">
                <label>
                  <span>Crane type</span>
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    {CRANE_TYPES.map((c) => <option key={c.name}>{c.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>Capacity</span>
                  <select value={capacity} onChange={(e) => setCapacity(e.target.value)}>
                    {CAPACITIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
              </div>
              <label>
                <span>Where is your site?</span>
                <input type="text" placeholder="Town or area, for example Kakinada" value={place} onChange={(e) => setPlace(e.target.value)} />
              </label>
              <button type="submit" className="cz-btn cz-btn-primary cz-btn-lg">Check cranes near me <ArrowRight size={18} /></button>
              {sent && <p className="cz-quote-note"><CheckCircle2 size={16} /> Great choice. Open the Cranezo app to see your price and send the request.</p>}
            </form>

            <ul className="cz-trust">
              <li><ShieldCheck size={16} /> Verified operators</li>
              <li><CreditCard size={16} /> Pay online safely</li>
              <li><Navigation size={16} /> Live tracking</li>
            </ul>
          </div>

          <div className="cz-hero-art">
            <HeroArt />
            <span className="cz-chip cz-chip-a"><MapPin size={14} /> Crane 4 min away</span>
            <span className="cz-chip cz-chip-b"><ShieldCheck size={14} /> Operator verified</span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ numbers */}
      <section className="cz-strip">
        <div className="cz-container cz-strip-grid">
          <div><strong>7</strong><span>crane types to choose from</span></div>
          <div><strong>100%</strong><span>operators checked before they work</span></div>
          <div><strong>3</strong><span>languages: English, Hindi, Telugu</span></div>
          <div><strong>Live</strong><span>GPS tracking from start to site</span></div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ crane types */}
      <section className="cz-section" id="cranes">
        <div className="cz-container">
          <div className="cz-head">
            <span className="cz-eyebrow">Crane types</span>
            <h2>A crane for every kind of job</h2>
            <p>Not sure which one you need? Pick a capacity in the app and a short note explains what it is used for.</p>
          </div>
          <div className="cz-grid cz-grid-4">
            {CRANE_TYPES.map((c) => (
              <article key={c.name} className="cz-card cz-card-type">
                <span className="cz-icon"><Construction size={22} /></span>
                <h3>{c.name}</h3>
                <p>{c.text}</p>
              </article>
            ))}
            <article className="cz-card cz-card-cta">
              <h3>Not sure?</h3>
              <p>Tell us about your load and the app helps you choose.</p>
              <a className="cz-link" href="#download" onClick={(e) => { e.preventDefault(); document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' }); }}>Get the app <ArrowRight size={16} /></a>
            </article>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ how it works */}
      <section className="cz-section cz-soft" id="how">
        <div className="cz-container">
          <div className="cz-head">
            <span className="cz-eyebrow">How it works</span>
            <h2>From request to finished job in four steps</h2>
          </div>
          <ol className="cz-steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="cz-step-no">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------------ why */}
      <section className="cz-section" id="why">
        <div className="cz-container">
          <div className="cz-head">
            <span className="cz-eyebrow">Why Cranezo</span>
            <h2>Built for trust, speed and clarity</h2>
          </div>
          <div className="cz-grid cz-grid-3">
            {FEATURES.map((f) => {
              const Icon = ICONS[f.icon];
              return (
                <article key={f.title} className="cz-card">
                  <span className="cz-icon cz-icon-blue"><Icon size={22} /></span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ partners */}
      <section className="cz-section cz-soft" id="partners">
        <div className="cz-container">
          <div className="cz-head">
            <span className="cz-eyebrow">For owners and operators</span>
            <h2>Own a crane or run one? Grow with Cranezo</h2>
          </div>
          <div className="cz-grid cz-grid-2">
            <article className="cz-card cz-partner">
              <span className="cz-icon"><Briefcase size={22} /></span>
              <h3>Crane owners</h3>
              <ul>
                <li><CheckCircle2 size={16} /> Your first month is free</li>
                <li><CheckCircle2 size={16} /> Get requests from customers near your cranes</li>
                <li><CheckCircle2 size={16} /> Set your own rates and charges</li>
                <li><CheckCircle2 size={16} /> Assign operators and see what you earn and owe</li>
              </ul>
            </article>
            <article className="cz-card cz-partner">
              <span className="cz-icon cz-icon-blue"><HardHat size={22} /></span>
              <h3>Operators</h3>
              <ul>
                <li><CheckCircle2 size={16} /> Get jobs from the owner you work with</li>
                <li><CheckCircle2 size={16} /> Navigate to the site and mark every step in the app</li>
                <li><CheckCircle2 size={16} /> Keep your licence and ID verified in one place</li>
                <li><CheckCircle2 size={16} /> See your earnings and payments</li>
              </ul>
            </article>
          </div>
          <div className="cz-center">
            <a className="cz-btn cz-btn-primary" href="#download" onClick={(e) => { e.preventDefault(); document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' }); }}>
              Join in the app <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ app */}
      <section className="cz-section cz-app" id="download">
        <div className="cz-container cz-app-grid">
          <div>
            <span className="cz-eyebrow cz-eyebrow-light">Get the app</span>
            <h2>Everything happens in the Cranezo app</h2>
            <p>Book a crane, follow it live, pay securely and keep every receipt. Owners and operators manage their work in the same app.</p>
            <ul className="cz-app-points">
              <li><Wallet size={18} /> Pay by UPI, card or net banking</li>
              <li><ClipboardCheck size={18} /> Receipts and booking history</li>
              <li><Navigation size={18} /> Live map and arrival time</li>
            </ul>
            <PlayButton dark />
          </div>
          <div className="cz-phone" aria-hidden="true">
            <div className="cz-phone-screen">
              <div className="cz-phone-top">Book a Crane</div>
              <div className="cz-phone-dots"><i className="on" /><i className="on" /><i /><i /></div>
              <div className="cz-phone-tiles">
                {['Mobile', 'Crawler', 'Tower', 'Pick & Carry'].map((t, i) => (
                  <div key={t} className={i === 0 ? 'sel' : ''}><Construction size={18} />{t}</div>
                ))}
              </div>
              <div className="cz-phone-btn">Continue</div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ faq */}
      <section className="cz-section" id="faq">
        <div className="cz-container cz-narrow">
          <div className="cz-head">
            <span className="cz-eyebrow">Questions</span>
            <h2>Frequently asked questions</h2>
          </div>
          <div className="cz-faq">
            {FAQ.map((item, i) => (
              <div key={item.q} className={`cz-faq-item ${faqOpen === i ? 'open' : ''}`}>
                <button type="button" onClick={() => setFaqOpen(faqOpen === i ? -1 : i)} aria-expanded={faqOpen === i}>
                  {item.q}
                  <ChevronDown size={20} />
                </button>
                {faqOpen === i && <p>{item.a}</p>}
              </div>
            ))}
          </div>
          <p className="cz-center cz-muted">Still have a question? <a className="cz-link" href="/contact" onClick={(e) => { e.preventDefault(); onNavigate('/contact'); }}>Contact us</a></p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ closing */}
      <section className="cz-closing">
        <div className="cz-container cz-closing-inner">
          <h2>Your next lift starts here</h2>
          <p>Download the app and book your first crane in minutes.</p>
          <PlayButton />
        </div>
      </section>
    </>
  );
};

export default HomePage;
