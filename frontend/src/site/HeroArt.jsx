import React from 'react';

/** A flat illustration for the top of the home page: a skyline, a tower crane and a mobile crane in the brand colours */
export const HeroArt = () => (
  <svg viewBox="0 0 560 470" role="img" aria-label="Cranes lifting at a construction site" className="cz-heroart">
    <defs>
      <linearGradient id="czSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e8f1fd" />
        <stop offset="1" stopColor="#f7fafe" />
      </linearGradient>
    </defs>
    <rect x="10" y="10" width="540" height="450" rx="36" fill="url(#czSky)" />
    <circle cx="455" cy="105" r="46" fill="#fbbf24" opacity="0.9" />
    <circle cx="455" cy="105" r="70" fill="#fbbf24" opacity="0.18" />

    {/* skyline */}
    <g fill="#c9dcf5">
      <rect x="40" y="250" width="70" height="170" rx="4" />
      <rect x="120" y="200" width="60" height="220" rx="4" />
      <rect x="360" y="230" width="80" height="190" rx="4" />
      <rect x="450" y="280" width="60" height="140" rx="4" />
    </g>
    <g fill="#b3cdee">
      <rect x="55" y="268" width="14" height="14" rx="2" /><rect x="80" y="268" width="14" height="14" rx="2" />
      <rect x="55" y="300" width="14" height="14" rx="2" /><rect x="80" y="300" width="14" height="14" rx="2" />
      <rect x="55" y="332" width="14" height="14" rx="2" /><rect x="80" y="332" width="14" height="14" rx="2" />
      <rect x="132" y="220" width="12" height="12" rx="2" /><rect x="154" y="220" width="12" height="12" rx="2" />
      <rect x="132" y="250" width="12" height="12" rx="2" /><rect x="154" y="250" width="12" height="12" rx="2" />
      <rect x="132" y="280" width="12" height="12" rx="2" /><rect x="154" y="280" width="12" height="12" rx="2" />
      <rect x="376" y="250" width="14" height="14" rx="2" /><rect x="402" y="250" width="14" height="14" rx="2" />
      <rect x="376" y="282" width="14" height="14" rx="2" /><rect x="402" y="282" width="14" height="14" rx="2" />
    </g>

    {/* tower crane */}
    <g>
      <rect x="226" y="82" width="14" height="338" fill="#f59e0b" />
      <rect x="262" y="82" width="14" height="338" fill="#f59e0b" />
      <polyline points="233,420 269,380 233,340 269,300 233,260 269,220 233,180 269,140 233,100" fill="none" stroke="#ea7a0b" strokeWidth="6" />
      <rect x="90" y="60" width="330" height="16" rx="3" fill="#f59e0b" />
      <polyline points="100,76 130,60 160,76 190,60 220,76 250,60 280,76 310,60 340,76 370,60 400,76" fill="none" stroke="#ea7a0b" strokeWidth="4" />
      <rect x="90" y="76" width="44" height="26" rx="3" fill="#1f6fd1" />
      <rect x="226" y="40" width="50" height="22" rx="4" fill="#1f6fd1" />
      <polygon points="251,10 226,40 276,40" fill="#f59e0b" />
      <line x1="372" y1="76" x2="372" y2="200" stroke="#0b1f3f" strokeWidth="3" />
      <rect x="360" y="196" width="24" height="10" rx="2" fill="#0b1f3f" />
      <rect x="338" y="206" width="68" height="34" rx="4" fill="#1f6fd1" />
    </g>

    {/* ground */}
    <rect x="10" y="415" width="540" height="45" rx="0" fill="#0b1f3f" />
    <rect x="10" y="415" width="540" height="6" fill="#f59e0b" />

    {/* mobile crane */}
    <g>
      <rect x="290" y="372" width="230" height="30" rx="6" fill="#f59e0b" />
      <rect x="470" y="340" width="50" height="38" rx="6" fill="#ea7a0b" />
      <rect x="480" y="348" width="26" height="16" rx="3" fill="#dbeafe" />
      <rect x="300" y="360" width="150" height="16" rx="3" fill="#ea7a0b" />
      <line x1="330" y1="366" x2="470" y2="222" stroke="#f59e0b" strokeWidth="14" strokeLinecap="round" />
      <line x1="330" y1="366" x2="470" y2="222" stroke="#ea7a0b" strokeWidth="4" strokeDasharray="10 8" strokeLinecap="round" />
      <line x1="470" y1="222" x2="470" y2="312" stroke="#0b1f3f" strokeWidth="3" />
      <rect x="452" y="310" width="36" height="22" rx="3" fill="#1f6fd1" />
      <circle cx="330" cy="408" r="17" fill="#0b1f3f" /><circle cx="330" cy="408" r="7" fill="#9bb4d6" />
      <circle cx="390" cy="408" r="17" fill="#0b1f3f" /><circle cx="390" cy="408" r="7" fill="#9bb4d6" />
      <circle cx="490" cy="408" r="17" fill="#0b1f3f" /><circle cx="490" cy="408" r="7" fill="#9bb4d6" />
    </g>
  </svg>
);

export default HeroArt;
