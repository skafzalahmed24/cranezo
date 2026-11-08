import React, { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, ShieldCheck, Eye, Zap, Handshake, ArrowRight, Send } from 'lucide-react';
import { API_BASE } from '../utils/api';
import { SITE } from './siteConfig';

const PageTop = ({ eyebrow, title, text }) => (
  <section className="cz-pagetop">
    <div className="cz-container cz-narrow">
      <span className="cz-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {text && <p className="cz-lead">{text}</p>}
    </div>
  </section>
);

// ---------------------------------------------------------------------------- About
export const AboutPage = ({ onNavigate }) => (
  <>
    <PageTop
      eyebrow="About us"
      title="Making it simple to find a crane you can trust"
      text="Cranezo connects people who need to lift with the crane owners and operators who can do it, in one clear and fair booking."
    />

    <section className="cz-section">
      <div className="cz-container cz-narrow cz-prose">
        <h2>Why we exist</h2>
        <p>Finding a crane is usually a chain of phone calls: who has one free, how far is it, what will it cost, will it come on time? Prices are unclear, and it is hard to know whether the crane and the operator are reliable.</p>
        <p>Cranezo puts that whole chain in one app. A customer chooses the crane and the place. Owners nearby are asked at the same moment. The booking, the payment, the tracking and the receipt all stay in one place, so everyone knows what is happening.</p>

        <h2>Who it is for</h2>
        <p><strong>Customers</strong> such as builders, contractors, factories and site managers book cranes by the hour or the day. <strong>Crane owners</strong> receive requests from customers near their cranes and run their fleet from their phone. <strong>Operators</strong> get their jobs, navigate to the site and keep their documents verified in one place.</p>
      </div>
    </section>

    <section className="cz-section cz-soft">
      <div className="cz-container">
        <div className="cz-head">
          <span className="cz-eyebrow">What we stand for</span>
          <h2>Four promises</h2>
        </div>
        <div className="cz-grid cz-grid-4">
          {[
            [ShieldCheck, 'Trust', 'Owners and operators are checked before they can take a job.'],
            [Eye, 'Clarity', 'You see the price before you send a request.'],
            [Zap, 'Speed', 'Nearby owners are asked at once, and the first to accept gets the job.'],
            [Handshake, 'Fairness', 'Owners set their own rates, and customers pay what they were shown.'],
          ].map(([Icon, title, text]) => (
            <article key={title} className="cz-card">
              <span className="cz-icon cz-icon-blue"><Icon size={22} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="cz-closing">
      <div className="cz-container cz-closing-inner">
        <h2>Ready to lift?</h2>
        <p>Download the app, or tell us how we can help.</p>
        <div className="cz-actions">
          <a className="cz-btn cz-btn-dark" href={SITE.playStoreUrl} target="_blank" rel="noopener noreferrer">Get the app</a>
          <a className="cz-btn cz-btn-outline-light" href="/contact" onClick={(e) => { e.preventDefault(); onNavigate('/contact'); }}>Contact us <ArrowRight size={16} /></a>
        </div>
      </div>
    </section>
  </>
);

// ---------------------------------------------------------------------------- Contact
export const ContactPage = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  // there is no mail server behind this page: the message opens in the visitor's own email app
  const onSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Cranezo enquiry from ${form.name}`);
    const body = encodeURIComponent(`${form.message}\n\nName: ${form.name}\nEmail: ${form.email}`);
    window.location.href = `mailto:${SITE.email}?subject=${subject}&body=${body}`;
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageTop eyebrow="Contact" title="We are here to help" text="Questions about a booking, your crane or your account? Write to us and we will get back to you." />
      <section className="cz-section">
        <div className="cz-container cz-contact-grid">
          <div className="cz-contact-cards">
            {SITE.email && <div className="cz-card"><span className="cz-icon"><Mail size={22} /></span><h3>Email</h3><p><a className="cz-link" href={`mailto:${SITE.email}`}>{SITE.email}</a></p></div>}
            {SITE.phone && <div className="cz-card"><span className="cz-icon"><Phone size={22} /></span><h3>Phone</h3><p>{SITE.phone}</p></div>}
            {SITE.address && <div className="cz-card"><span className="cz-icon"><MapPin size={22} /></span><h3>Address</h3><p>{SITE.address}</p></div>}
            <div className="cz-card">
              <span className="cz-icon cz-icon-blue"><ShieldCheck size={22} /></span>
              <h3>Already using the app?</h3>
              <p>Open Help in the app to raise a support request about a booking. It reaches our team faster.</p>
            </div>
          </div>

          <form className="cz-form" onSubmit={onSubmit}>
            <h2>Send us a message</h2>
            <label><span>Your name</span><input required value={form.name} onChange={set('name')} placeholder="Full name" /></label>
            <label><span>Email</span><input required type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" /></label>
            <label><span>How can we help?</span><textarea required rows={5} value={form.message} onChange={set('message')} placeholder="Write your message" /></label>
            <button type="submit" className="cz-btn cz-btn-primary cz-btn-lg"><Send size={18} /> Send message</button>
            <p className="cz-muted cz-small">This opens your email app with the message ready to send.</p>
          </form>
        </div>
      </section>
    </>
  );
};

// ---------------------------------------------------------------------------- Privacy and Terms (written in the admin panel)
export const LegalPage = ({ type }) => {
  const [page, setPage] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setPage(null);
    setError('');
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/content/legal`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }),
        });
        const json = await res.json();
        if (!res.ok || json.status !== 1) throw new Error(json.message || 'Could not load this page.');
        if (alive) setPage(json.data);
      } catch (err) {
        if (alive) setError(err.message);
      }
    })();
    return () => { alive = false; };
  }, [type]);

  const fallback = type === 'privacy' ? 'Privacy policy' : 'Terms & conditions';
  return (
    <>
      <PageTop eyebrow="Legal" title={page ? page.title : fallback} text={page && page.intro} />
      <section className="cz-section">
        <div className="cz-container cz-narrow cz-prose">
          {!page && !error && <p className="cz-muted">Loading…</p>}
          {error && <p className="cz-muted">{error}</p>}
          {page && (
            <>
              {page.last_updated && <p className="cz-muted cz-small">Last updated: {new Date(page.last_updated).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>}
              {page.sections.map((s) => (
                <div key={s.number}>
                  <h2>{s.number}. {s.title}</h2>
                  {s.subtitle && <h3>{s.subtitle}</h3>}
                  <p style={{ whiteSpace: 'pre-line' }}>{s.body}</p>
                </div>
              ))}
            </>
          )}
        </div>
      </section>
    </>
  );
};
