import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Phone, MessageCircle, MapPin, Wallet, ShieldCheck, Bell, Languages, CalendarClock, Truck, HardHat, Check, ArrowDown } from 'lucide-react';
import logoImg from '../assets/logo.png';
import playImg from '../assets/playstore.png';
import { API_BASE, fileUrl } from '../utils/api';
import { SITE } from './siteConfig';
import './join.css';

const OWNER_EQUIPMENT = [
  ['hydra', 'Hydra Crane (12T / 14T / 15T)'],
  ['mobile_telescopic', 'Mobile / Telescopic Crane (20T - 50T+)'],
  ['crawler_lattice', 'Crawler / Lattice Boom Crane'],
  ['forklift_boom', 'Forklift / Boom Lift'],
  ['flatbed_lowbed', 'Flatbed / Low-Bed Trailer'],
  ['other', 'Other'],
];
const OWNER_OPERATORS = [
  ['with_operator', 'Yes, machine with operator'],
  ['dry_lease', 'Machine only (dry lease)'],
  ['both', 'Both options available'],
];
const OWNER_DOCS = [['rc_book', 'RC Book'], ['insurance', 'Crane Insurance Copy'], ['owner_id', 'Owner ID Proof']];
const OPERATOR_ROLES = [
  ['hydra_operator', 'Hydra Crane Operator'],
  ['mobile_telescopic_operator', 'Mobile / Telescopic Crane Operator'],
  ['forklift_trailer_operator', 'Forklift / Trailer Operator'],
  ['rigger_helper', 'Rigger / Signalman / Helper'],
];
const OPERATOR_LICENSE = [
  ['hmv', 'Valid HMV (Heavy Motor Vehicle) Driving License'],
  ['lmv', 'LMV License only'],
  ['rigger_certified', 'Certified Rigger / Safety Trained (No HMV license)'],
  ['trainee', 'Trainee / Helper'],
];
const OPERATOR_DOCS = [['driving_license', 'Driving License'], ['aadhaar_id', 'Aadhaar / ID Proof'], ['operator_certificate', 'Operator Certificate']];

const HIGHLIGHTS = [
  { icon: Bell, title: 'Jobs come to you', text: 'Nearby customers send a request and your phone rings. Accept, and the job is yours.' },
  { icon: Wallet, title: 'Clear payments', text: 'Every job shows what the customer paid, the platform fee and your share. Owners and operators can see the full history.' },
  { icon: CalendarClock, title: 'Daily, monthly or per job', text: 'Operators can be paid per job or a fixed monthly salary. Customers book by the hour, day or month.' },
  { icon: MapPin, title: 'Live tracking', text: 'The customer watches the crane arrive on the map, so there are fewer calls and no confusion.' },
  { icon: ShieldCheck, title: 'Verified and safe', text: 'Cranes and operators are checked before they work, and every operator reads the safety rules in their own language.' },
  { icon: Languages, title: 'In your language', text: 'The Cranezo app works in English, Hindi and Telugu.' },
];

const empty = {
  owner: { full_name: '', mobile_number: '', location: '', equipment: [], equipment_other: '', fleet_details: '', supplies_operators: '', documents: [] },
  operator: { full_name: '', mobile_number: '', location: '', primary_role: '', experience: '', license_status: '', documents: [] },
};

const toggle = (list, key) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

function Banners() {
  const [items, setItems] = useState([]);
  const [i, setI] = useState(0);
  useEffect(() => {
    fetch(`${API_BASE}/api/public/banners`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then((r) => r.json()).then((p) => { if (p.status === 1) setItems((p.data || []).filter((b) => b.image)); }).catch(() => {});
  }, []);
  useEffect(() => {
    if (items.length < 2) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items.length]);
  if (!items.length) return null;
  const b = items[Math.min(i, items.length - 1)];
  const go = (e) => {
    const a = b.action || {};
    if (a.type === 'url' && /^https:\/\//.test(a.value || '')) window.open(a.value, '_blank', 'noopener');
  };
  return (
    <section className="jn-banners" aria-label="Offers">
      <div className="jn-banner" onClick={go} role="presentation" style={{ backgroundImage: `url(${fileUrl(b.image)})` }}>
        {(b.title || b.subtitle) && (
          <div className="jn-banner-text">
            {b.title && <h2>{b.title}</h2>}
            {b.subtitle && <p>{b.subtitle}</p>}
          </div>
        )}
      </div>
      {items.length > 1 && (
        <div className="jn-dots">{items.map((x, k) => <button key={x.id} type="button" aria-label={`Banner ${k + 1}`} className={k === i ? 'on' : ''} onClick={() => setI(k)} />)}</div>
      )}
    </section>
  );
}

const Radio = ({ name, value, current, onChange, children }) => (
  <label className={`jn-opt ${current === value ? 'on' : ''}`}>
    <input type="radio" name={name} checked={current === value} onChange={() => onChange(value)} />
    <span>{children}</span>
  </label>
);
const Check2 = ({ checked, onChange, children }) => (
  <label className={`jn-opt ${checked ? 'on' : ''}`}>
    <input type="checkbox" checked={checked} onChange={onChange} />
    <span>{children}</span>
  </label>
);

export default function JoinPage() {
  const [kind, setKind] = useState('owner');
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const formRef = useRef(null);
  const f = form[kind];
  const set = (patch) => setForm({ ...form, [kind]: { ...f, ...patch } });
  const phone = SITE.phone;

  useEffect(() => { setError(''); }, [kind]);

  const ready = useMemo(() => {
    if (!f.full_name.trim() || f.mobile_number.replace(/\D/g, '').length < 10 || !f.location.trim()) return false;
    if (kind === 'owner') return f.equipment.length > 0 && f.fleet_details.trim() && f.supplies_operators;
    return f.primary_role && f.experience.trim() && f.license_status;
  }, [f, kind]);

  const choose = (k) => { setKind(k); setTimeout(() => formRef.current && formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/public/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, ...f }) });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload || payload.status !== 1) throw new Error((payload && payload.message) || 'Could not send. Please try again.');
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="jn">
      <header className="jn-top">
        <a className="jn-logo" href="/" aria-label="Cranezo home"><img src={logoImg} alt="Cranezo" /></a>
        <div className="jn-contact">
          {phone && <a href={`tel:+91${phone}`} className="jn-call"><Phone size={16} aria-hidden="true" /> <span>Call: {phone}</span></a>}
          {phone && <a href={`https://wa.me/91${phone}`} target="_blank" rel="noopener noreferrer" className="jn-wa"><MessageCircle size={16} aria-hidden="true" /> <span>WhatsApp</span></a>}
        </div>
      </header>

      <Banners />

      <section className="jn-hero">
        <p className="jn-eyebrow">Crane owners and operators</p>
        <h1>Join Cranezo. Steady jobs, clear payments.</h1>
        <p className="jn-lead">Register your cranes or your skills with Cranezo. Customers book by the hour, day or month, and you get the jobs on your phone.</p>
        <div className="jn-choose">
          <button type="button" onClick={() => choose('owner')}><Truck size={22} aria-hidden="true" /> <strong>I own cranes</strong><small>Register my fleet</small></button>
          <button type="button" onClick={() => choose('operator')}><HardHat size={22} aria-hidden="true" /> <strong>I am an operator</strong><small>Find crane work</small></button>
        </div>
        <a className="jn-down" href="#join-form"><ArrowDown size={16} aria-hidden="true" /> Fill the short form</a>
      </section>

      <section className="jn-highlights" aria-label="Why Cranezo">
        <h2>Why join Cranezo</h2>
        <div className="jn-grid">
          {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
            <article key={title}><span className="jn-ic"><Icon size={22} aria-hidden="true" /></span><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section className="jn-form-wrap" id="join-form" ref={formRef}>
        {done ? (
          <div className="jn-done">
            <span className="jn-ok"><Check size={30} aria-hidden="true" /></span>
            <h2>Thank you!</h2>
            <p>We received your details. Our team will call you on <strong>{f.mobile_number}</strong> soon.</p>
            {phone && <p>In a hurry? Call or WhatsApp <a href={`tel:+91${phone}`}>{phone}</a>.</p>}
            <button type="button" className="jn-btn" onClick={() => { setDone(false); setForm(empty); }}>Add another registration</button>
          </div>
        ) : (
          <form className="jn-form" onSubmit={submit} noValidate>
            <h2>Registration</h2>
            <p className="jn-muted">Takes about one minute. Fields marked * are needed.</p>

            <fieldset className="jn-kind">
              <legend className="sr">I am</legend>
              <Radio name="kind" value="owner" current={kind} onChange={setKind}>Crane Owner / Fleet</Radio>
              <Radio name="kind" value="operator" current={kind} onChange={setKind}>Crane Operator / Crew</Radio>
            </fieldset>

            <div className="jn-fields">
              <label>{kind === 'owner' ? 'Owner / Business name *' : 'Full name (as on your license / ID) *'}
                <input value={f.full_name} onChange={(e) => set({ full_name: e.target.value })} autoComplete="name" />
              </label>
              <label>Mobile and WhatsApp number *
                <input inputMode="numeric" value={f.mobile_number} onChange={(e) => set({ mobile_number: e.target.value.replace(/[^\d+ ]/g, '').slice(0, 14) })} autoComplete="tel" placeholder="10 digit number" />
              </label>
              <label className="wide">{kind === 'owner' ? 'Base yard location and operating areas *' : 'Current city / home location and work preference *'}
                <input value={f.location} onChange={(e) => set({ location: e.target.value })} placeholder={kind === 'owner' ? 'City or district of your yard, and the areas you serve' : 'Your city or area, and daily shifts, monthly jobs or outstation'} />
              </label>
            </div>

            {kind === 'owner' ? (
              <>
                <fieldset className="jn-set"><legend>Types of equipment you own *</legend>
                  <div className="jn-opts">{OWNER_EQUIPMENT.map(([k, label]) => <Check2 key={k} checked={f.equipment.includes(k)} onChange={() => set({ equipment: toggle(f.equipment, k) })}>{label}</Check2>)}</div>
                  {f.equipment.includes('other') && <input className="jn-other" placeholder="Which other equipment?" value={f.equipment_other} onChange={(e) => set({ equipment_other: e.target.value })} />}
                </fieldset>
                <label className="jn-text">Total fleet count and crane models / tonnage *
                  <textarea rows="3" value={f.fleet_details} onChange={(e) => set({ fleet_details: e.target.value })} placeholder="Example: 2x Escorts Hydra 15T, 1x ACE 30FX Mobile Crane" />
                </label>
                <fieldset className="jn-set"><legend>Do you supply trained operators with your machines? *</legend>
                  <div className="jn-opts">{OWNER_OPERATORS.map(([k, label]) => <Radio key={k} name="ops" value={k} current={f.supplies_operators} onChange={(v) => set({ supplies_operators: v })}>{label}</Radio>)}</div>
                </fieldset>
                <fieldset className="jn-set"><legend>Documents you can share (optional)</legend>
                  <div className="jn-opts">{OWNER_DOCS.map(([k, label]) => <Check2 key={k} checked={f.documents.includes(k)} onChange={() => set({ documents: toggle(f.documents, k) })}>{label}</Check2>)}</div>
                  <p className="jn-muted small">We will ask you to send clear photos on WhatsApp{phone ? ` (${phone})` : ''} for quick verification.</p>
                </fieldset>
              </>
            ) : (
              <>
                <fieldset className="jn-set"><legend>Primary role *</legend>
                  <div className="jn-opts">{OPERATOR_ROLES.map(([k, label]) => <Radio key={k} name="role" value={k} current={f.primary_role} onChange={(v) => set({ primary_role: v })}>{label}</Radio>)}</div>
                </fieldset>
                <label className="jn-text">Crane models and tonnage you have worked on, and years of experience *
                  <textarea rows="3" value={f.experience} onChange={(e) => set({ experience: e.target.value })} placeholder="Example: Escorts Hydra 15T, ACE 30FX, 12T to 40T. 6 years" />
                </label>
                <fieldset className="jn-set"><legend>License and certification status *</legend>
                  <div className="jn-opts">{OPERATOR_LICENSE.map(([k, label]) => <Radio key={k} name="lic" value={k} current={f.license_status} onChange={(v) => set({ license_status: v })}>{label}</Radio>)}</div>
                </fieldset>
                <fieldset className="jn-set"><legend>Documents you can share (optional)</legend>
                  <div className="jn-opts">{OPERATOR_DOCS.map(([k, label]) => <Check2 key={k} checked={f.documents.includes(k)} onChange={() => set({ documents: toggle(f.documents, k) })}>{label}</Check2>)}</div>
                  <p className="jn-muted small">We will ask you to send a clear photo on WhatsApp{phone ? ` (${phone})` : ''}.</p>
                </fieldset>
              </>
            )}

            <input className="jn-hp" tabIndex="-1" autoComplete="off" aria-hidden="true" name="website" value={f.website || ''} onChange={(e) => set({ website: e.target.value })} />
            {error && <div className="jn-error" role="alert">{error}</div>}
            <button type="submit" className="jn-btn jn-submit" disabled={busy || !ready}>{busy ? 'Sending…' : 'Send my details'}</button>
          </form>
        )}
      </section>

      <footer className="jn-foot">
        <div>
          <img src={logoImg} alt="Cranezo" className="jn-foot-logo" />
          <p>Book cranes. Run cranes. Get paid clearly.</p>
        </div>
        <div className="jn-foot-links">
          {phone && <a href={`tel:+91${phone}`}><Phone size={14} aria-hidden="true" /> Call / WhatsApp: {phone}</a>}
          {SITE.email && <a href={`mailto:${SITE.email}`}>{SITE.email}</a>}
          <a href={SITE.playStoreUrl} target="_blank" rel="noopener noreferrer" aria-label="Get it on Google Play"><img src={playImg} alt="Get it on Google Play" className="jn-play" /></a>
        </div>
      </footer>
    </div>
  );
}
