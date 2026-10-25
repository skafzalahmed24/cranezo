import React, { useState, useEffect } from 'react';
import backgroundImg from '../assets/background.png';
import logoImg from '../assets/logo.png';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import './WelcomePage.css';

export const WelcomePage = ({ onNavigateToAdmin }) => {
  // Set launch target: 70 days, 13 hours, 59 mins, 15 secs
  const [timeLeft, setTimeLeft] = useState(() => {
    return {
      days: 70,
      hours: 13,
      minutes: 59,
      seconds: 15,
    };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

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

      {/* Top Bar with Admin Portal Access */}
      <header className="cranezo-welcome-top-nav">
        <button
          type="button"
          className="cranezo-admin-pill-link"
          onClick={onNavigateToAdmin}
        >
          <ShieldCheck size={16} />
          <span>Admin Portal</span>
          <ArrowRight size={14} />
        </button>
      </header>

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
