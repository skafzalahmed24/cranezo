import React from 'react';
import { Mail } from 'lucide-react';
import logoImg from '../assets/logo.png';
import HeroArt from './HeroArt';
import { SITE } from './siteConfig';
import './site.css';

/** The only public page while the website is not live: a simple "coming soon" */
export const ComingSoon = ({ onNavigate }) => (
  <div className="cz-site cz-soon">
    <main className="cz-soon-main">
      <img className="cz-soon-logo" src={logoImg} alt="Cranezo" />
      <span className="cz-pill">Coming soon</span>
      <h1>Cranezo is <span className="cz-accent">on its way</span></h1>
      <p className="cz-lead">Book cranes online from verified owners and operators near your site. We are getting everything ready.</p>
      <div className="cz-soon-art"><HeroArt /></div>
      {SITE.email && (
        <a className="cz-link" href={`mailto:${SITE.email}`}><Mail size={16} /> {SITE.email}</a>
      )}
    </main>
    <footer className="cz-soon-foot">
      <span>© {new Date().getFullYear()} Cranezo</span>
      <a href="/admin/login" onClick={(e) => { e.preventDefault(); onNavigate('/admin/login'); }}>Admin login</a>
    </footer>
  </div>
);

export default ComingSoon;
