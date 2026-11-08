import React, { useEffect } from 'react';
import SiteLayout from './SiteLayout';
import HomePage from './HomePage';
import { AboutPage, ContactPage, LegalPage } from './InfoPages';
import WelcomePage from '../pages/WelcomePage';
import { SITE_LIVE, LEGAL_LIVE } from './siteConfig';

export const SITE_PATHS = ['/', '/welcome', '/about', '/contact', '/privacy', '/terms'];

const TITLES = {
  '/': 'Cranezo | Book cranes online',
  '/about': 'About Cranezo',
  '/contact': 'Contact Cranezo',
  '/privacy': 'Privacy policy | Cranezo',
  '/terms': 'Terms & conditions | Cranezo',
};

/** The public website: Home, About, Contact, Privacy and Terms */
export const SiteRouter = ({ path, onNavigate }) => {
  const page = path === '/welcome' ? '/' : path;

  const isLegal = page === '/privacy' || page === '/terms';
  // until the website is live every address shows "coming soon" (Privacy and Terms can be opened on their own)
  const soon = !SITE_LIVE && !(LEGAL_LIVE && isLegal);

  useEffect(() => {
    document.title = soon ? 'Cranezo | Launching soon' : (TITLES[page] || TITLES['/']);
    // the admin panel is dark; the website is light
    const before = document.body.style.background;
    document.body.style.background = '#ffffff';
    return () => { document.body.style.background = before; };
  }, [page, soon]);

  // the welcome page with the countdown
  if (soon) return <WelcomePage />;

  let content;
  if (page === '/about') content = <AboutPage onNavigate={onNavigate} />;
  else if (page === '/contact') content = <ContactPage />;
  else if (page === '/privacy') content = <LegalPage type="privacy" />;
  else if (page === '/terms') content = <LegalPage type="terms" />;
  else content = <HomePage onNavigate={onNavigate} />;

  return <SiteLayout path={page} onNavigate={onNavigate}>{content}</SiteLayout>;
};

export default SiteRouter;
