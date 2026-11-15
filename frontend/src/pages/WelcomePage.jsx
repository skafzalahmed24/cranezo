import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, CalendarDays, BadgeCheck, FileCheck2, KeyRound, Star, User, Briefcase, HardHat, Mail, Phone, MapPin, ShieldCheck, Receipt, Check, ChevronDown, Construction, Share2, MessageCircle, Globe } from 'lucide-react';
import logoImg from '../assets/logo.png';
import phoneImg from '../assets/app_phone.png';
import playImg from '../assets/playstore.png';
import dayImg from '../assets/crane-day.webp';
import nightImg from '../assets/crane-night.webp';
import { SITE, LEGAL_LIVE, CRANE_TYPES, REVIEWS } from '../site/siteConfig';
import MapStory, { CraneBody } from './MapStory';
import './WelcomePage.css';
import './HomeSections.css';

/* ==========================================================================
   Cranezo welcome page: one scroll-driven story.
   A construction site stays on screen while the page scrolls, and p (0..1) drives everything:
   the crane OWNER adds a crane, the CUSTOMER books it, the owner assigns the job, the OPERATOR drives to the site
   and lifts the load, the job is closed and the payment arrives. Dark night turns into a bright morning on the way.
   ========================================================================== */

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lin = (p, a, b) => clamp((p - a) / (b - a));
const seg = (p, a, b) => ease(lin(p, a, b));
const rad = (d) => (d * Math.PI) / 180;

// colours that change from night, to dawn, to day
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mc = (a, b, t, alpha) => {
  const x = hex(a); const y = hex(b);
  const c = x.map((v, i) => Math.round(lerp(v, y[i], t))).join(',');
  return alpha === undefined ? `rgb(${c})` : `rgba(${c},${alpha})`;
};
const mix3 = (night, dawn, day, m) => {
  const [a, b, t] = m < 0.5 ? [night, dawn, m * 2] : [dawn, day, (m - 0.5) * 2];
  const x = hex(a); const y = hex(b);
  return `rgb(${x.map((c, i) => Math.round(lerp(c, y[i], t))).join(',')})`;
};

const CHAPTERS = [
  { start: 0, lines: ['ONE JOB,', 'START TO FINISH.', 'ACROSS THE CITY.'], sub: 'Scroll and follow one real booking across the map: from the customer’s request to the crane’s return.' },
  { start: 0.07, lines: ['A CUSTOMER', 'NEEDS', 'A CRANE.'], sub: 'A site across town needs a lift tomorrow. The customer opens Cranezo and asks for a crane.' },
  { start: 0.17, lines: ['CRANEZO', 'BOOKS', 'IT.'], sub: 'Cranezo finds a verified crane near the site and sends the request to its owner at once.' },
  { start: 0.27, lines: ['THE OWNER', 'ASSIGNS AN', 'OPERATOR.'], sub: 'The owner accepts the request and gives the job to one of their verified operators.' },
  { start: 0.37, lines: ['THE OPERATOR', 'DRIVES TO', 'THE SITE.'], sub: 'The customer watches the crane live on the map, street by street, until it arrives.' },
  { start: 0.6, lines: ['SAFE.', 'PRECISE.', 'ON SITE.'], sub: 'Supports down, boom out. The operator marks every step in the app: arrived, set up, lifting, finished.' },
  { start: 0.8, lines: ['JOB DONE.', 'PAYMENT', 'RECEIVED.'], sub: 'The customer pays online. The operator and the owner see the payment in their own app.' },
  { start: 0.9, lines: ['THE CRANE', 'GOES BACK', 'HOME.'], sub: 'Job closed. The crane drives back to its owner\u2019s yard, ready for the next booking.' },
];
const NAV = [['fleet', 'Cranes'], ['story', 'How it works'], ['pricing', 'Pricing'], ['safety', 'Safety'], ['faq', 'Questions']];
const CROPS = [['day', '56% 72%', 1.45], ['day', '30% 88%', 2.0], ['night', '27% 62%', 1.7], ['night', '34% 82%', 2.2], ['day', '76% 38%', 1.7], ['night', '84% 72%', 2.5], ['day', '10% 86%', 2.3]];
const PHOTO = { day: dayImg, night: nightImg };
const FAQS = [
  { q: 'What is Cranezo?', a: 'A simple way to book cranes. Customers book, owners respond, and operators do the job.' },
  { q: 'How do I book a crane?', a: 'Choose the crane, set the site and the time, and send the request. Owners near you are asked at once.' },
  { q: 'Can I track my crane?', a: 'Yes. Follow it live on the map until it reaches your site.' },
  { q: 'Are the operators verified?', a: 'Yes. Licences and IDs are checked before an operator can take a job.' },
  { q: 'How does payment work?', a: 'Pay online by UPI, card or net banking. Receipts are saved in the app.' },
];
const RAIL = ['Need', 'Book', 'Assign', 'Go', 'Work', 'Paid', 'Home'];

const go = (id) => (e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

/* ---------------------------------------------------------------- the row of roles */
const ROLES = [
  { key: 'customer', name: 'CUSTOMER', color: '#38bdf8', Icon: User },
  { key: 'cranezo', name: 'CRANEZO', color: '#f5a000', Icon: Construction },
  { key: 'owner', name: 'CRANE OWNER', color: '#a78bfa', Icon: Briefcase },
  { key: 'operator', name: 'OPERATOR', color: '#22c55e', Icon: HardHat },
];
// who is busy in each step
const ACTIVE = { 1: 'customer', 2: 'cranezo', 3: 'owner', 4: 'operator', 5: 'operator', 6: 'customer', 7: 'operator' };

const statusOf = (key, idx, p) => {
  const eta = Math.max(0, Math.round(12 - 12 * lin(p, 0.41, 0.54)));
  const lift = Math.round(lin(p, 0.7, 0.82) * 100);
  const away = eta ? eta + ' min away' : 'Arrived';
  if (key === 'customer') {
    if (idx < 1) return '';
    if (idx === 1) return 'Needs a crane';
    if (idx < 5) return 'Booking sent';
    if (idx === 5) return 'Watching live · ' + away;
    if (idx === 6) return 'Job in progress';
    return 'Paid ₹ 48,000 ✓';
  }
  if (key === 'cranezo') {
    if (idx < 2) return '';
    if (idx === 2) return p < 0.24 ? 'Finding a crane…' : 'Crane found ✓';
    return 'Booked ✓';
  }
  if (key === 'owner') {
    if (idx < 3) return '';
    if (idx === 3) return p < 0.31 ? 'Got the request' : 'Assigned an operator';
    if (idx < 7) return 'Job assigned ✓';
    return 'Earning added ✓';
  }
  if (idx < 3 || (idx === 3 && p < 0.35)) return '';
  if (idx === 3) return 'Got the job';
  if (idx <= 5) return 'On the way · ' + away;
  if (idx === 6) return p < 0.66 ? 'Setting up' : p < 0.84 ? 'Lifting ' + lift + '%' : 'Job complete ✓';
  return 'Payment received ✓';
};

const RoleRow = ({ idx, p }) => {
  const statuses = ROLES.map((r) => statusOf(r.key, idx, p));
  const active = ACTIVE[idx];
  return (
    <div className={`cz5-flow ${idx > 0 ? 'on' : ''}`} aria-hidden="true">
      {ROLES.map((r, i) => {
        const has = !!statuses[i];
        const Icon = r.Icon;
        return (
          <div key={r.key} className={`cz5-node ${has ? 'has' : ''} ${active === r.key ? 'active' : ''}`} style={{ '--c': r.color }}>
            {i > 0 && <span className="cz5-link"><i style={{ width: has ? '100%' : '0%' }} /></span>}
            <span className="cz5-av"><Icon size={26} strokeWidth={2.4} /></span>
            <b className="cz5-name">{r.name}</b>
          </div>
        );
      })}
    </div>
  );
};

export const WelcomePage = () => {
  const storyRef = useRef(null);
  const target = useRef(0);
  const cur = useRef(0);
  const raf = useRef(0);
  const [p, setP] = useState(0);
  const stageRef = useRef(null);
  const [stage, setStage] = useState({ w: 1440, h: 810 });
  const [portrait, setPortrait] = useState(typeof window !== 'undefined' && window.innerWidth < 760);
  useLayoutEffect(() => {
    const measure = () => { const el = stageRef.current; if (el) setStage({ w: el.clientWidth, h: el.clientHeight }); };
    measure(); window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const read = () => {
      const el = storyRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      target.current = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
    };
    // glide to the scroll position, so the crane moves smoothly even when the wheel jumps
    const loop = () => {
      cur.current += (target.current - cur.current) * 0.14;
      if (Math.abs(target.current - cur.current) < 0.0004) cur.current = target.current;
      setP(cur.current);
      raf.current = cur.current === target.current ? 0 : requestAnimationFrame(loop);
    };
    const onScroll = () => { read(); if (!raf.current) raf.current = requestAnimationFrame(loop); };
    const onResize = () => { setPortrait(window.innerWidth < 760); onScroll(); };
    read(); cur.current = target.current; setP(cur.current);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  let idx = 0;
  CHAPTERS.forEach((c, i) => { if (p >= c.start) idx = i; });
  const d = 1 - seg(p, 0.5, 0.58); // 1 in the day, 0 at night
  const theme = {
    '--t1': mc('#ffffff', '#0b1630', d), '--t2': mc('#ffc933', '#b86a00', d), '--t3': mc('#c3cadb', '#41507a', d),
    '--tp': mc('#e1e6f2', '#1b2a47', d), '--tsh': 'none',
    '--cbg': mc('#080d1e', '#ffffff', d, 0.9), '--cink': mc('#ffffff', '#0b1630', d), '--cmute': mc('#9aa3b8', '#5a6784', d),
    '--cline': mc('#ffffff', '#0b1630', d, 0.12), '--cborder': mc('#ffffff', '#0b1630', d, 0.16),
    '--tamber': mc('#ffd34d', '#8a5200', d), '--tblue': mc('#7dd3fc', '#075985', d), '--tgreen': mc('#86efac', '#166534', d),
  };
  const [faqOpen, setFaqOpen] = useState(0);
  const [menu, setMenu] = useState(false);
  const [inStory, setInStory] = useState(false);
  const [railP, setRailP] = useState(0);
  const [form, setForm] = useState({ type: CRANE_TYPES[0].name, place: '', date: '' });
  const [quote, setQuote] = useState(null);
  const row = useRef(null);
  const today = new Date().toISOString().slice(0, 10);
  const headDark = inStory && p > 0.55;
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const st = storyRef.current; const r = st ? st.getBoundingClientRect() : null;
      setInStory(!!r && r.top < 60 && r.bottom > 60);
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setRailP(Math.round(Math.min(1, Math.max(0, window.scrollY / max)) * 400) / 400);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    read(); window.addEventListener('scroll', on, { passive: true }); window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); };
  }, []);
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
    document.querySelectorAll('.hs-rise').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  const submit = (e) => { e.preventDefault(); setQuote({ ...form, place: form.place.trim() }); };

  return (
    <div className="cz3-page">
      <header className={'hs-head' + (headDark ? ' dark' : '')}>
        <a className="hs-logo" href="/" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="Cranezo, back to the top"><img src={logoImg} alt="Cranezo" /></a>
        <nav id="hs-nav" className={menu ? 'open' : ''} aria-label="Main">
          {NAV.map(([id, label]) => <a key={id} href={'#' + id} onClick={(e) => { go(id)(e); setMenu(false); }}>{label}</a>)}
          <a className="hs-btn hs-btn-amber" href="#top" onClick={(e) => { go('top')(e); setMenu(false); }}>Book a crane</a>
        </nav>
        <button type="button" className="hs-burger" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} aria-controls="hs-nav" onClick={() => setMenu(!menu)}><i /><i /><i /></button>
      </header>

      <div className="hs-rail" aria-hidden="true"><i style={{ height: (railP * 100) + '%' }} /><span style={{ top: (railP * 100) + '%' }}><svg viewBox="-56 -100 112 200"><g transform="rotate(90)"><CraneBody night={headDark ? 0.8 : 0} /></g></svg></span></div>

      <section className="hs-hero" id="top" aria-labelledby="hs-h1">
        <div className="hs-wrap hs-hero-grid">
          <div className="hs-hero-copy">
            <span className="hs-eyebrow">CRANE BOOKING · INDIA</span>
            <h1 id="hs-h1">Book the right crane, on time.</h1>
            <p>Verified owners and operators near your site, a clear price before you pay, and live tracking all the way to your door.</p>
            <form className="hs-book" onSubmit={submit} aria-label="Start a booking">
              <label><span>Crane type</span><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{CRANE_TYPES.map((c) => <option key={c.name}>{c.name}</option>)}</select></label>
              <label><span>City or pin</span><span className="hs-field"><MapPin size={18} aria-hidden="true" /><input type="text" required placeholder="City, area or pin code" value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} autoComplete="off" /></span></label>
              <label><span>Date</span><span className="hs-field"><CalendarDays size={18} aria-hidden="true" /><input type="date" required min={today} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></span></label>
              <button type="submit" className="hs-btn hs-btn-amber">See price <ArrowRight size={18} aria-hidden="true" /></button>
            </form>
            {quote && (
              <div className="hs-quote" role="status"><BadgeCheck size={22} aria-hidden="true" /><div><b>Your request is ready.</b><p>{quote.type} · {quote.place} · {new Date(quote.date + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Verified owners near you set the price. Open the Cranezo app to see it and send the request.</p></div></div>
            )}
            <div className="hs-actions">
              <a className="hs-play" href={SITE.playStoreUrl} target="_blank" rel="noopener noreferrer" aria-label="Get it on Google Play"><img src={playImg} alt="Get it on Google Play" width="168" height="56" /></a>
              {SITE.phone && <a className="hs-btn hs-btn-line" href={'tel:' + SITE.phone}><Phone size={18} aria-hidden="true" /> Call us</a>}
            </div>
          </div>
          <div className="hs-hero-media">
            <div className="hs-photo"><img src={dayImg} alt="A yellow mobile crane lifting a concrete beam onto a building under construction" width="1200" height="896" fetchpriority="high" decoding="async" /></div>
            <div className="hs-asphalt" aria-hidden="true" />
            <a className="hs-scrollcue" href="#story" onClick={go('story')}><ArrowDown size={16} aria-hidden="true" /> See how a job works</a>
          </div>
        </div>
      </section>

      <section className="cz3-story" id="story" ref={storyRef} aria-label="How a job works">
        <div className="cz3-stage" ref={stageRef} style={{ background: '#e9efe3', ...theme }}>
          <MapStory p={p} stage={stage} portrait={portrait} />



          <div className="cz3-copy">
            {CHAPTERS.map((c, i) => (
              <div key={i} className={`cz3-chap ${i === idx ? 'on' : i < idx ? 'past' : ''}`}>
                <h2><span className="w">{c.lines[0]}</span><span className="a">{c.lines[1]}</span><span className="g">{c.lines[2]}</span></h2>
                <p>{c.sub}</p>
              </div>
            ))}
          </div>

          <RoleRow idx={idx} p={p} />

          <div className="cz3-rail" aria-hidden="true">
            {RAIL.map((r, i) => (
              <div key={r} className={`cz3-step ${i < idx - 1 ? 'done' : ''} ${i === idx - 1 ? 'now' : ''}`}><i />{r}</div>
            ))}
          </div>

          <div className={`cz3-hint ${p > 0.03 ? 'off' : ''}`}><ArrowDown size={16} /> Scroll</div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- crane types */}
      <section className="hs-sec hs-fleet" id="fleet" aria-labelledby="hs-h-fleet">
        <div className="hs-wrap hs-sec-head hs-rise">
          <div><span className="hs-eyebrow">THE 7 CRANE TYPES</span><h2 id="hs-h-fleet">The right crane for every lift.</h2><p>Capacities offered in the app run from 10 to 300 tonnes. The owner of each crane sets its rate, and you see it before you pay.</p></div>
          <div className="hs-arrows"><button type="button" onClick={() => row.current && row.current.scrollBy({ left: -312, behavior: 'smooth' })} aria-label="Previous cranes"><ArrowLeft size={20} /></button><button type="button" onClick={() => row.current && row.current.scrollBy({ left: 312, behavior: 'smooth' })} aria-label="Next cranes"><ArrowRight size={20} /></button></div>
        </div>
        <ul className="hs-row" ref={row} tabIndex={0} aria-label="Crane types, scroll sideways">
          {CRANE_TYPES.map((c, i) => (
            <li key={c.name} className="hs-spec">
              <div className="hs-spec-img"><img src={PHOTO[CROPS[i][0]]} alt={c.name + ' on a construction site'} loading="lazy" decoding="async" style={{ objectPosition: CROPS[i][1], transform: 'scale(' + CROPS[i][2] + ')', transformOrigin: CROPS[i][1] }} /></div>
              <div className="hs-spec-body">
                <span className="hs-label">TYPE {String(i + 1).padStart(2, '0')}</span>
                <h3>{c.name}</h3>
                <p>{c.text}</p>
                <dl><div><dt className="hs-label">CAPACITY</dt><dd>10 – 300 t</dd></div><div><dt className="hs-label">PRICE / HOUR</dt><dd>In the app</dd></div></dl>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------------------- pricing */}
      <section className="hs-sec hs-light" id="pricing" aria-labelledby="hs-h-pricing">
        <div className="hs-wrap">
          <div className="hs-sec-head hs-rise"><div><span className="hs-eyebrow">PRICING</span><h2 id="hs-h-pricing">A clear price before you pay.</h2><p>Each crane owner sets their own rate. The app shows the price for your crane, date and hours, and nothing is added after you confirm.</p></div></div>
          <div className="hs-table hs-rise" role="table" aria-label="Crane types and where the price comes from">
            <div className="hs-tr hs-th" role="row"><span role="columnheader">Crane type</span><span role="columnheader">Typical use</span><span role="columnheader">Capacity</span><span role="columnheader">Price per hour</span></div>
            {CRANE_TYPES.map((c) => (
              <div className="hs-tr" role="row" key={c.name}><b role="cell">{c.name}</b><span role="cell">{c.text.split('.')[0]}.</span><span className="hs-label" role="cell">10 – 300 T</span><span className="hs-label" role="cell">Set by owner, shown in the app</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- safety */}
      <section className="hs-sec" id="safety" aria-labelledby="hs-h-safety">
        <div className="hs-wrap">
          <div className="hs-sec-head hs-rise"><div><span className="hs-eyebrow">SAFETY AND VERIFICATION</span><h2 id="hs-h-safety">Checked before they work.</h2><p>Nobody takes a job on Cranezo until our team has looked at their documents.</p></div></div>
          <ul className="hs-safe">
            {[[BadgeCheck, 'Operator licence and ID', 'Every operator\u2019s licence and ID are checked and approved by our team.'], [FileCheck2, 'Crane papers', 'A crane is listed only after its registration and other papers are reviewed. Expired papers are sent back.'], [ShieldCheck, 'Approval before listing', 'Owners and operators are approved by our admin team before they can receive bookings.'], [KeyRound, 'Closed with a code', 'A job ends only when you share the one-time code with the operator.'], [Receipt, 'Online payment and receipts', 'You pay inside the app and every receipt is saved.']].map(([Icon, t, d]) => (
              <li key={t} className="hs-rise"><span className="hs-safe-ic"><Icon size={22} aria-hidden="true" /></span><h3>{t}</h3><p>{d}</p></li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------------- reviews */}
      <section className="hs-sec hs-light" id="reviews" aria-labelledby="hs-h-reviews">
        <div className="hs-wrap">
          <div className="hs-sec-head hs-rise"><div><span className="hs-eyebrow">REVIEWS</span><h2 id="hs-h-reviews">What customers say.</h2></div></div>
          {REVIEWS.length === 0 ? (
            <div className="hs-empty hs-rise"><Star size={22} aria-hidden="true" /><div><b>Reviews appear here after the first completed jobs.</b><p>Only real reviews from real customers are shown on this page.</p></div></div>
          ) : (
            <ul className="hs-reviews">{REVIEWS.slice(0, 3).map((r) => <li key={r.name + r.text} className="hs-rise"><p>{'\u201C' + r.text + '\u201D'}</p><b>{r.name}</b><span className="hs-label">{[r.place, r.date].filter(Boolean).join(' · ').toUpperCase()}</span></li>)}</ul>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------------- app */}
      <section className="cz4-app" id="app">
        <div className="cz4-app-card">
          <div className="cz4-phones" aria-hidden="true">
            <img className="p1" src={phoneImg} alt="" />
            <img className="p2" src={phoneImg} alt="" />
          </div>
          <div className="cz4-app-text">
            <span className="cz4-kick">CRANEZO ON MOBILE</span>
            <h2>Your next crane booking is just a tap away.</h2>
            <p>Book, track and pay in one app. Owners and operators run their jobs in it too.</p>
            <div className="cz4-stores">
              <a className="cz4-play" href={SITE.playStoreUrl} target="_blank" rel="noopener noreferrer" aria-label="Get it on Google Play"><img src={playImg} alt="Get it on Google Play" /></a>
            </div>
            <div className="cz4-note"><Check size={14} /> Verified operators and secure online payment</div>
          </div>
        </div>
      </section>

      <section className="cz4-faq" id="faq">
        <span className="cz4-kick">FREQUENTLY ASKED QUESTIONS</span>
        <h2>Got questions? We have answers.</h2>
        <p className="cz4-faq-sub">Short answers about booking, operators and payment.</p>
        <div className="cz4-faq-list">
          {FAQS.map((f, i) => (
            <div key={f.q} className={`cz4-q ${faqOpen === i ? 'open' : ''}`}>
              <button type="button" onClick={() => setFaqOpen(faqOpen === i ? -1 : i)} aria-expanded={faqOpen === i}>
                <span className="dot" />{f.q}<ChevronDown size={16} />
              </button>
              {faqOpen === i && <p>{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="hs-final" aria-labelledby="hs-h-final">
        <img src={nightImg} alt="" loading="lazy" decoding="async" />
        <div className="hs-final-shade" />
        <div className="hs-final-in"><h2 id="hs-h-final">Your next project deserves the right crane.</h2><a className="hs-btn hs-btn-amber hs-btn-lg" href="#top" onClick={go('top')}>Book your crane today <ArrowRight size={18} aria-hidden="true" /></a></div>
      </section>

      {/* ---------------------------------------------------------------- footer */}
      <footer className="cz4-foot">
        <div className="cz4-foot-grid">
          <div className="cz4-brand">
            <div className="cz4-brand-row"><span className="cz4-brand-ic"><Construction size={18} /></span><b>CRANEZO</b></div>
            <span className="cz4-brand-tag">LIFTING A BETTER TOMORROW</span>
            <p>Crane booking made simple: book, track and pay in one app.</p>
          </div>
          <div>
            <h4>Navigation</h4>
            <ul>
              <li><a href="#top" onClick={go('top')}>Home</a></li>
              <li><a href="#app" onClick={go('app')}>The app</a></li>
              <li><a href="#faq" onClick={go('faq')}>Questions</a></li>
            </ul>
          </div>
          <div>
            <h4>Solutions</h4>
            <ul>
              <li>For customers</li>
              <li>For crane owners</li>
              <li>For operators</li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              {SITE.email && <li><a href={`mailto:${SITE.email}`}><Mail size={13} /> {SITE.email}</a></li>}
              <li><MapPin size={13} /> India</li>
            </ul>
          </div>
          <div>
            <h4>Follow</h4>
            <p className="small">Stay in touch with Cranezo.</p>
            <div className="cz4-social"><span><Share2 size={14} /></span><span><MessageCircle size={14} /></span><span><Globe size={14} /></span></div>
          </div>
        </div>
        <div className="cz4-foot-bar">
          <span>&copy; 2026 Cranezo. All rights reserved.</span>
          <span className="links">
            {LEGAL_LIVE && <><a href="/terms">Terms of service</a><a href="/privacy">Privacy policy</a></>}
          </span>
        </div>
        <div className="cz4-mark" aria-hidden="true">CRANEZO</div>
      </footer>
    </div>
  );
};

export default WelcomePage;
