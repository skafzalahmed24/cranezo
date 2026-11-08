import React, { useEffect, useState } from 'react';
import { Menu, X, Mail, Phone, MapPin, Smartphone } from 'lucide-react';
import logoImg from '../assets/logo.png';
import { SITE } from './siteConfig';
import './site.css';

const NAV = [
  { label: 'Crane types', section: 'cranes' },
  { label: 'How it works', section: 'how' },
  { label: 'Owners & operators', section: 'partners' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
];

/** Header, footer and the page between them. [path] is the current page; [onNavigate] changes it without a reload. */
export const SiteLayout = ({ path, onNavigate, children }) => {
  const [open, setOpen] = useState(false);

  // close the mobile menu on every page change
  useEffect(() => setOpen(false), [path]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /** A section of the home page: go there first when on another page */
  const goSection = (id) => {
    setOpen(false);
    if (path === '/') {
      scrollTo(id);
    } else {
      onNavigate('/');
      setTimeout(() => scrollTo(id), 80);
    }
  };

  const link = (to) => (e) => {
    e.preventDefault();
    onNavigate(to);
  };

  return (
    <div className="cz-site">
      <header className="cz-header">
        <div className="cz-container cz-header-inner">
          <a href="/" className="cz-logo" onClick={link('/')} aria-label="Cranezo home">
            <img src={logoImg} alt="Cranezo" />
          </a>

          <nav className={`cz-nav ${open ? 'open' : ''}`} aria-label="Main">
            {NAV.map((item) => (
              item.section ? (
                <button key={item.label} type="button" className="cz-nav-link" onClick={() => goSection(item.section)}>{item.label}</button>
              ) : (
                <a key={item.label} href={item.path} className={`cz-nav-link ${path === item.path ? 'active' : ''}`} onClick={link(item.path)}>{item.label}</a>
              )
            ))}
            <button type="button" className="cz-btn cz-btn-primary cz-nav-cta" onClick={() => goSection('download')}>
              <Smartphone size={16} /> Get the app
            </button>
          </nav>

          <button type="button" className="cz-menu-btn" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <main>{children}</main>

      <footer className="cz-footer">
        <div className="cz-container cz-footer-grid">
          <div className="cz-footer-brand">
            <img src={logoImg} alt="Cranezo" />
            <p>Book cranes online, from verified owners and operators near your site.</p>
          </div>
          <div>
            <h4>Company</h4>
            <a href="/about" onClick={link('/about')}>About us</a>
            <a href="/contact" onClick={link('/contact')}>Contact</a>
            <button type="button" onClick={() => goSection('download')}>Get the app</button>
          </div>
          <div>
            <h4>Legal</h4>
            <a href="/privacy" onClick={link('/privacy')}>Privacy policy</a>
            <a href="/terms" onClick={link('/terms')}>Terms &amp; conditions</a>
          </div>
          <div>
            <h4>Get in touch</h4>
            {SITE.email && <span><Mail size={14} /> {SITE.email}</span>}
            {SITE.phone && <span><Phone size={14} /> {SITE.phone}</span>}
            {SITE.address && <span><MapPin size={14} /> {SITE.address}</span>}
          </div>
        </div>
        <div className="cz-container cz-footer-bottom">
          <span>© {new Date().getFullYear()} Cranezo. All rights reserved.</span>
          <a href="/admin/login" onClick={link('/admin/login')}>Admin login</a>
        </div>
      </footer>
    </div>
  );
};

export default SiteLayout;
