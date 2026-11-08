import React, { useState, useEffect } from 'react';
import backgroundImg from '../assets/background.png';
import logoImg from '../assets/logo.png';
import { LAUNCH_AT } from '../site/siteConfig';
import './WelcomePage.css';

export const WelcomePage = () => {
  // Counts down to the launch date (LAUNCH_AT in site/siteConfig.js), so it keeps going when the page is reloaded
  const remaining = () => {
    const total = Math.max(0, Math.floor((new Date(LAUNCH_AT).getTime() - Date.now()) / 1000));
    return {
      days: Math.floor(total / 86400),
      hours: Math.floor((total % 86400) / 3600),
      minutes: Math.floor((total % 3600) / 60),
      seconds: total % 60,
    };
  };
  const [timeLeft, setTimeLeft] = useState(remaining);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(remaining()), 1000);
    return () => clearInterval(timer);
  }, []);

  const format2 = (val) => String(val).padStart(2, '0');

  return (
    <div className="cranezo-welcome-page animate-fade-in">
      {/* Background with moody construction crane */}
      <div
        className="cranezo-welcome-bg"
        style={{ backgroundImage: `url(${backgroundImg})` }}
      />
      <div className="cranezo-welcome-overlay" />

      {/* Top Telemetry Marquee Bar */}
      <div className="cranezo-telemetry-bar">
        <div className="cranezo-telemetry-content">
          <span className="cranezo-tel-status">
            <span className="cranezo-tel-dot" /> CONNECTED
          </span>
          <span className="cranezo-tel-item">
            • REAL-TIME GPS TELEMETRY: <span className="status-online">ONLINE</span>
          </span>
          <span className="cranezo-tel-item">
            • AUTOMATED LOAD PLANNING ENGINE: <span className="status-calibrated">CALIBRATED</span>
          </span>
          <span className="cranezo-tel-item">
            • HIGH-CAPACITY HEAVY DISPATCH: <strong>20T - 800T</strong>
          </span>
          <span className="cranezo-tel-item">
            • DIGITAL SHIFT LOGS: <span className="status-synced">SYNCHRONIZED</span>
          </span>
          <span className="cranezo-tel-item">
            • SYSTEM DIAGNOSTIC: <strong>99.4% READY</strong>
          </span>
          <span className="cranezo-tel-item">
            • CRANE NODES ACTIVE: <strong>52 FLEETS CONNECTED</strong>
          </span>

          {/* Repeated items for smooth continuous loop */}
          <span className="cranezo-tel-status">
            <span className="cranezo-tel-dot" /> CONNECTED
          </span>
          <span className="cranezo-tel-item">
            • REAL-TIME GPS TELEMETRY: <span className="status-online">ONLINE</span>
          </span>
          <span className="cranezo-tel-item">
            • AUTOMATED LOAD PLANNING ENGINE: <span className="status-calibrated">CALIBRATED</span>
          </span>
          <span className="cranezo-tel-item">
            • HIGH-CAPACITY HEAVY DISPATCH: <strong>20T - 800T</strong>
          </span>
        </div>
      </div>

      {/* Hero Body */}
      <main className="cranezo-welcome-main">
        {/* Brand Logo */}
        <div className="cranezo-welcome-logo-box">
          <img
            src={logoImg}
            alt="Cranezo Heavy Dispatch Platform"
            className="cranezo-welcome-logo-img"
          />
        </div>

        {/* Big Impact Headline */}
        <h1 className="cranezo-welcome-title">
          THE FUTURE OF
          <br />
          <span className="cranezo-gradient-orange">HEAVY LIFTING</span>
          <span className="cranezo-amp">&amp;</span>
          <br />
          <span className="cranezo-gradient-blue">CRANE TELEMETRY</span>
        </h1>

        {/* Subtitle */}
        <p className="cranezo-welcome-desc">
          India's most advanced digital ecosystem for{' '}
          <strong>on-demand crane dispatch</strong>, instant rigging calculations,
          and real-time fleet operations is arriving.
        </p>

        {/* Estimated Launch Pill */}
        <div className="cranezo-launch-pill">
          <span className="cranezo-launch-bullet" />
          <span>ESTIMATED LAUNCH IN • {timeLeft.days} DAYS</span>
        </div>

        {/* 4 Countdown Cards */}
        <div className="cranezo-countdown-row">
          <div className="cranezo-timer-box">
            <span className="cranezo-timer-num">{timeLeft.days}</span>
            <span className="cranezo-timer-label">DAYS</span>
          </div>

          <div className="cranezo-timer-separator">
            <span className="cranezo-separator-dot" />
            <span className="cranezo-separator-dot" />
          </div>

          <div className="cranezo-timer-box">
            <span className="cranezo-timer-num">{format2(timeLeft.hours)}</span>
            <span className="cranezo-timer-label">HOURS</span>
          </div>

          <div className="cranezo-timer-separator">
            <span className="cranezo-separator-dot" />
            <span className="cranezo-separator-dot" />
          </div>

          <div className="cranezo-timer-box">
            <span className="cranezo-timer-num">{format2(timeLeft.minutes)}</span>
            <span className="cranezo-timer-label">MINS</span>
          </div>

          <div className="cranezo-timer-separator">
            <span className="cranezo-separator-dot" />
            <span className="cranezo-separator-dot" />
          </div>

          <div className="cranezo-timer-box">
            <span className="cranezo-timer-num">{format2(timeLeft.seconds)}</span>
            <span className="cranezo-timer-label">SECS</span>
          </div>
        </div>

        {/* Sub-caption */}
        <div className="cranezo-reveal-caption">
          PLATFORM REVEAL &amp; FLEET ACTIVATION
        </div>
      </main>

      {/* Footer */}
      <footer className="cranezo-welcome-footer">
        &copy; 2026 <strong>Cranezo</strong>. All rights reserved.
      </footer>
    </div>
  );
};

export default WelcomePage;
