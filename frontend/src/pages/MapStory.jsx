import React, { memo, useMemo, useRef } from 'react';
import logoImg from '../assets/logo.png';

/* ==========================================================================
   The map behind the welcome page: a city seen from above.
   The page scroll progress p (0..1) tells the story: a customer needs a crane, Cranezo books it, the owner assigns
   an operator, the crane drives across the city, lifts a beam onto the site, the payment arrives, and the crane
   goes back to work. The camera follows the crane, and the map turns from day to night on the way.
   Map units: one street cell is 240. Streets run on the lines x or y = 120 + 240 n.
   ========================================================================== */

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lin = (p, a, b) => clamp((p - a) / (b - a));
const seg = (p, a, b) => ease(lin(p, a, b));
const rad = (d) => (d * Math.PI) / 180;
const seeded = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mix3 = (a, b, c, m) => {
  const [x0, y0, t] = m < 0.5 ? [a, b, m * 2] : [b, c, (m - 0.5) * 2];
  const x = hex(x0); const y = hex(y0);
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], t))).join(',')})`;
};

/* ---------------------------------------------------------------- places and the two routes */
const GRID = 240;
const YARD = { x: 480, y: 480 };               // the crane owner's yard
const SITE = { x: 1440, y: 1440 };             // the customer's site (a block)
const BUILD = { x: 1490, y: 1440, w: 96, h: 120 }; // the building going up inside the site
const WORK_AT = { x: 1370, y: 1440 };          // where the crane stands to work, facing east
const PICK = { x: 1432, y: 1384 };             // the beam waits here
const HUB = { x: 920, y: 960 };                // Cranezo, between the customer and the owner

const unit = (a, b) => { const dx = b[0] - a[0]; const dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l, l]; };
const roundRoute = (pts, r) => {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [d1x, d1y, l1] = unit(pts[i - 1], pts[i]); const [d2x, d2y, l2] = unit(pts[i], pts[i + 1]);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const a = [pts[i][0] - d1x * rr, pts[i][1] - d1y * rr]; const b = [pts[i][0] + d2x * rr, pts[i][1] + d2y * rr];
    out.push(a);
    for (let k = 1; k <= 7; k++) { const t = k / 7; const u = 1 - t; out.push([u * u * a[0] + 2 * u * t * pts[i][0] + t * t * b[0], u * u * a[1] + 2 * u * t * pts[i][1] + t * t * b[1]]); }
  }
  out.push(pts[pts.length - 1]);
  return out;
};
const mkRoute = (pts) => {
  const poly = roundRoute(pts, 56); const cum = [0];
  for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
  return { poly, cum, len: cum[cum.length - 1], d: 'M' + poly.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L') };
};
const ROUTE_A = mkRoute([[YARD.x, YARD.y], [360, 480], [360, 840], [840, 840], [840, 1080], [1320, 1080], [1320, 1440], [WORK_AT.x, WORK_AT.y]]);
const ROUTE_B = mkRoute([[WORK_AT.x, WORK_AT.y], [1320, 1440], [1320, 1560], [360, 1560], [360, 480], [YARD.x, YARD.y]]); // back home
const posAt = (R, f) => {
  const s = clamp(f) * R.len; let lo = 0; let hi = R.cum.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (R.cum[mid] <= s) lo = mid; else hi = mid; }
  const a = R.poly[lo]; const b = R.poly[hi]; const t = (s - R.cum[lo]) / Math.max(1e-6, R.cum[hi] - R.cum[lo]);
  return { x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t), h: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI };
};
const quad = (a, c, b, t) => { const u = 1 - t; return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }; };

/* ---------------------------------------------------------------- the crane, seen from above (it faces east) */
export const CraneBody = ({ outr = 0, ang = 0, len = 70, night = 0, blink = false }) => (
  <g>
    <rect x="-60" y="-10" width="132" height="40" rx="10" fill="#000" opacity="0.22" />
    {[-38, 36].map((x) => [-1, 1].map((sy) => {
      const L = 17 + 30 * outr;
      return (
        <g key={x + '_' + sy} opacity={outr > 0.02 ? 1 : 0}>
          <rect x={x - 3.5} y={sy > 0 ? 0 : -L} width="7" height={L} fill="#9aa1b0" />
          <circle cx={x} cy={sy * L} r="8" fill="#2a2d36" stroke="#c9ced9" strokeWidth="2" />
        </g>
      );
    }))}
    <rect x="-62" y="-17" width="130" height="34" rx="8" fill="#23262d" />
    {[-42, -20, 24, 46].map((x) => (<g key={x}><rect x={x - 9} y="-22" width="18" height="7" rx="3" fill="#0e0e10" /><rect x={x - 9} y="15" width="18" height="7" rx="3" fill="#0e0e10" /></g>))}
    <rect x="-66" y="-13" width="14" height="26" rx="3" fill="#1f2229" />
    <rect x="-66" y="-13" width="14" height="26" rx="3" fill="url(#cmHz)" opacity="0.85" />
    <rect x="-54" y="-17" width="62" height="34" rx="9" fill="url(#cmY)" stroke="#7a4d00" strokeWidth="1.5" />
    {[-8, -2, 4, 10].map((y) => <line key={y} x1="-34" y1={y} x2="-8" y2={y} stroke="#8a5600" strokeWidth="2" strokeLinecap="round" />)}
    <rect x="32" y="-15" width="28" height="30" rx="8" fill="url(#cmY)" stroke="#7a4d00" strokeWidth="1.5" />
    <rect x="49" y="-11" width="8" height="22" rx="2" fill="#16264a" />
    <rect x="36" y="-12" width="10" height="24" rx="2" fill="#223a63" />
    <circle cx="66" cy="-9" r="3.2" fill="#fff6cf" /><circle cx="66" cy="9" r="3.2" fill="#fff6cf" />
    <polygon points="68,-8 190,-46 190,46 68,8" fill="url(#cmBeam)" opacity={night * 0.8} />
    <g transform={`translate(-8 0) rotate(${ang})`}>
      <rect x="0" y="-7.5" width={len * 0.62} height="15" rx="3" fill="url(#cmY)" stroke="#7a4d00" strokeWidth="1.5" />
      <rect x={len * 0.5} y="-5" width={len * 0.5} height="10" rx="2.5" fill="#e6a000" stroke="#7a4d00" strokeWidth="1.2" />
      <rect x={len - 11} y="-5.5" width="9" height="11" fill="url(#cmHz)" />
      <circle cx={len} cy="0" r="6" fill="#1a1a1a" stroke="#F6F1E0" strokeWidth="2" />
    </g>
    <circle cx="-8" cy="0" r="8" fill="#222" stroke="#F6F1E0" strokeWidth="2" />
    <circle cx="-22" cy="-12" r="3.4" fill="#ff8a00" className={blink ? 'cz3-blink' : ''} opacity={blink ? 1 : 0.5} />
  </g>
);

/* ---------------------------------------------------------------- the city (drawn once; colours come from CSS variables) */
const SPECIAL = { '1,4': 'hospital', '3,1': 'mall', '4,3': 'school', '5,2': 'petrol', '7,5': 'market', '3,5': 'tennis', '7,8': 'parking', '5,9': 'park' };
const drawSpecial = (kind, x, y, cx, cy, key, rnd) => {
  const o = []; const bg = <rect key={key()} x={x} y={y} width="196" height="196" rx="10" style={{ fill: 'var(--blk)' }} />;
  o.push(bg);
  if (kind === 'hospital') {
    o.push(<rect key={key()} x={x + 14} y={y + 26} width="168" height="144" rx="8" fill="#f6f8fc" stroke="#c3cbdb" strokeWidth="3" />, <rect key={key()} x={cx - 8} y={cy - 38} width="16" height="76" fill="#B8554F" />, <rect key={key()} x={cx - 38} y={cy - 8} width="76" height="16" fill="#B8554F" />, <rect key={key()} x={x + 24} y={y + 36} width="36" height="20" rx="3" fill="#dfe6f3" />);
  } else if (kind === 'mall') {
    o.push(<rect key={key()} x={x + 10} y={y + 10} width="176" height="124" rx="8" fill="#D2C3BC" stroke="#A89A91" strokeWidth="3" />);
    for (let a = 0; a < 5; a++) o.push(<rect key={key()} x={x + 22 + a * 33} y={y + 28} width="22" height="88" rx="3" fill="#fff" opacity="0.6" />);
    for (let a = 0; a < 8; a++) o.push(<rect key={key()} x={x + 14 + a * 22} y={y + 148} width="14" height="26" rx="2" fill="#9aa3b6" />);
  } else if (kind === 'school') {
    o.push(<rect key={key()} x={x + 12} y={y + 12} width="172" height="60" rx="6" fill="#DCD1B4" stroke="#A69A78" strokeWidth="3" />, <rect key={key()} x={x + 12} y={y + 12} width="50" height="120" rx="6" fill="#DCD1B4" stroke="#A69A78" strokeWidth="3" />, <ellipse key={key()} cx={x + 128} cy={y + 130} rx="52" ry="40" fill="#9CC08E" />, <ellipse key={key()} cx={x + 128} cy={y + 130} rx="40" ry="28" fill="none" stroke="#fff" strokeWidth="3" />);
  } else if (kind === 'petrol') {
    o.push(<rect key={key()} x={x + 22} y={y + 34} width="152" height="70" rx="10" fill="#B8554F" stroke="#8E7E78" strokeWidth="3" />, <rect key={key()} x={x + 60} y={y + 44} width="12" height="50" fill="#fff" />, <rect key={key()} x={x + 124} y={y + 44} width="12" height="50" fill="#fff" />, <rect key={key()} x={x + 56} y={y + 128} width="84" height="38" rx="6" fill="#dfe3ec" stroke="#9aa3b6" strokeWidth="2" />);
  } else if (kind === 'market') {
    const cols = ['#CDBFA8', '#BFC9B8', '#B7C4D0', '#D3C0B6', '#C2BCCB', '#D0CBB2'];
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) o.push(<rect key={key()} x={x + 14 + a * 44} y={y + 14 + b * 44} width="36" height="34" rx="4" fill={cols[(a * 4 + b) % cols.length]} />);
  } else if (kind === 'tennis') {
    o.push(<rect key={key()} x={x + 12} y={y + 12} width="172" height="80" rx="4" fill="#92B4D6" stroke="#fff" strokeWidth="3" />, <line key={key()} x1={x + 98} y1={y + 12} x2={x + 98} y2={y + 92} stroke="#fff" strokeWidth="3" />, <rect key={key()} x={x + 12} y={y + 104} width="172" height="80" rx="4" fill="#9CC08E" stroke="#fff" strokeWidth="3" />, <line key={key()} x1={x + 98} y1={y + 104} x2={x + 98} y2={y + 184} stroke="#fff" strokeWidth="3" />);
  } else if (kind === 'parking') {
    o.push(<rect key={key()} x={x + 8} y={y + 8} width="180" height="180" rx="6" fill="#8C919E" />);
    const cc = ['#A9A9A9', '#7F90A9', '#EDEDED', '#C8B77E', '#8DA58B'];
    for (let a = 0; a < 6; a++) for (let b = 0; b < 2; b++) { o.push(<line key={key()} x1={x + 20 + a * 28} y1={y + 20 + b * 100} x2={x + 20 + a * 28} y2={y + 76 + b * 100} stroke="#fff" strokeWidth="2" />); if (rnd() < 0.7) o.push(<rect key={key()} x={x + 24 + a * 28} y={y + 28 + b * 100} width="16" height="30" rx="4" fill={cc[(a + b) % 5]} />); }
  } else if (kind === 'park') {
    o.push(<rect key={key()} x={x} y={y} width="196" height="196" rx="14" style={{ fill: 'var(--park)' }} />, <ellipse key={key()} cx={cx} cy={cy} rx="62" ry="44" style={{ fill: 'var(--water)' }} />, <path key={key()} d={`M${x + 10} ${y + 100} Q${cx} ${y + 30} ${x + 186} ${y + 100}`} fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="7" strokeLinecap="round" />);
    for (let t = 0; t < 12; t++) o.push(<circle key={key()} cx={x + 14 + rnd() * 168} cy={y + 14 + rnd() * 168} r={10 + rnd() * 7} style={{ fill: 'var(--tree)' }} />);
  }
  return <g key={key()} className="cm-sp">{o}</g>;
};
const Decor = memo(() => {
  const els = useMemo(() => {
    const out = []; const rnd = seeded(7); let k = 0;
    const key = () => 'd' + (k++);
    const tree = (x, y, r) => { out.push(<circle key={key()} cx={x + 3} cy={y + 4} r={r} fill="#000" opacity="0.16" />, <circle key={key()} cx={x} cy={y} r={r} style={{ fill: 'var(--tree)' }} />, <circle key={key()} cx={x - r * 0.25} cy={y - r * 0.25} r={r * 0.5} fill="#fff" opacity="0.1" />); };
    for (let i = -1; i <= 9; i++) for (let j = -1; j <= 13; j++) {
      const cx = GRID * i; const cy = GRID * j; const x = cx - 98; const y = cy - 98; const s = 196;
      if (i === 2 && j === 2) continue;
      if (i === 6 && j === 6) continue;
      const r = rnd();
      if (i === 8 && j === 3) { // a stadium
        out.push(<rect key={key()} x={x} y={y} width={s} height={s} rx="10" style={{ fill: 'var(--blk)' }} />, <ellipse key={key()} cx={cx} cy={cy} rx="86" ry="70" style={{ fill: 'var(--roof2)' }} />, <ellipse key={key()} cx={cx} cy={cy} rx="62" ry="46" style={{ fill: 'var(--park)' }} />, <rect key={key()} x={cx - 40} y={cy - 24} width="80" height="48" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="2" />);
        continue;
      }
      if (i === 0 && j === 5) { // a helipad
        out.push(<rect key={key()} x={x} y={y} width={s} height={s} rx="10" style={{ fill: 'var(--blk)' }} />, <circle key={key()} cx={cx} cy={cy} r="62" fill="#9AA0AD" />, <circle key={key()} cx={cx} cy={cy} r="54" fill="none" stroke="#F6F1E0" strokeWidth="4" />, <text key={key()} x={cx} y={cy + 20} textAnchor="middle" fontSize="58" fontWeight="900" fill="#F6F1E0">H</text>);
        continue;
      }
      if (SPECIAL[i + ',' + j]) { out.push(drawSpecial(SPECIAL[i + ',' + j], x, y, cx, cy, key, rnd)); continue; }
      if (r < 0.22) {
        out.push(<rect key={key()} x={x} y={y} width={s} height={s} rx="14" style={{ fill: 'var(--park)' }} />);
        if (rnd() < 0.4) out.push(<ellipse key={key()} cx={cx + (rnd() - 0.5) * 40} cy={cy + (rnd() - 0.5) * 40} rx="52" ry="36" style={{ fill: 'var(--water)' }} />);
        const n = 9 + Math.floor(rnd() * 6);
        for (let t = 0; t < n; t++) tree(x + 14 + rnd() * (s - 28), y + 14 + rnd() * (s - 28), 9 + rnd() * 8);
      } else {
        out.push(<rect key={key()} x={x} y={y} width={s} height={s} rx="10" style={{ fill: 'var(--blk)' }} />);
        const cols = rnd() < 0.5 ? 2 : 1; const rows = rnd() < 0.5 ? 2 : 1;
        const cw = (s - 16) / cols; const ch = (s - 16) / rows;
        for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) {
          const bx = x + 8 + a * cw + 3; const by = y + 8 + b * ch + 3; const bw = cw - 6; const bh = ch - 6;
          out.push(<rect key={key()} x={bx + 3} y={by + 4} width={bw} height={bh} rx="4" fill="#000" opacity="0.14" />);
          out.push(<rect key={key()} x={bx} y={by} width={bw} height={bh} rx="4" style={{ fill: (() => { const q = rnd(); return q < 0.13 ? 'var(--roofA)' : q < 0.26 ? 'var(--roofB)' : q < 0.38 ? 'var(--roofC)' : (a + b) % 2 ? 'var(--roof)' : 'var(--roof2)'; })() }} />);
          out.push(<rect key={key()} x={bx + bw * 0.18} y={by + bh * 0.2} width={bw * 0.28} height={bh * 0.22} rx="2" fill="#000" opacity="0.1" />);
          if (rnd() < 0.55) out.push(<rect key={key()} x={bx + bw * 0.55} y={by + bh * 0.55} width={bw * 0.25} height={bh * 0.25} rx="2" className="cm-lit" />);
        }
      }
    }
    // other jobs around the city (pulsing amber)
    [[1800, 360], [240, 1680], [1560, 2040], [720, 2040], [1920, 1560], [120, 120], [960, 1680], [1800, 960]].forEach(([x, y]) => out.push(<g key={key()}><circle cx={x} cy={y} r="22" fill="none" stroke="#f5a000" strokeWidth="4" className="cz3-ping-s" /><circle cx={x} cy={y} r="12" fill="#f5a000" stroke="#fff" strokeWidth="3" /></g>));
    // the owner's yard: fenced, with two parked cranes
    out.push(<rect key={key()} x={YARD.x - 98} y={YARD.y - 98} width="196" height="196" rx="10" style={{ fill: 'var(--yard)' }} stroke="#f5a000" strokeWidth="3" strokeDasharray="10 7" />);
    out.push(<g key={key()} transform={`translate(${YARD.x - 20} ${YARD.y - 52}) scale(0.5)`}><CraneBody /></g>, <g key={key()} transform={`translate(${YARD.x - 20} ${YARD.y + 56}) scale(0.5)`}><CraneBody /></g>);
    // the customer's site: dirt, a fence, beams waiting, cones
    out.push(<rect key={key()} x={SITE.x - 98} y={SITE.y - 98} width="196" height="196" rx="10" style={{ fill: 'var(--dirt)' }} stroke="#f5a000" strokeWidth="3" strokeDasharray="10 7" />);
    [[-8, 0], [0, 10], [-8, 20]].forEach(([dx, dy]) => out.push(<rect key={key()} x={PICK.x - 30 + dx - 6} y={PICK.y - 7 + dy - 14} width="44" height="14" rx="2" fill="url(#cmHz)" stroke="#111" strokeWidth="1.5" />));
    [[1360, 1500], [1380, 1508], [1520, 1380], [1530, 1500]].forEach(([x, y]) => out.push(<circle key={key()} cx={x} cy={y} r="6" fill="#ff6a1a" stroke="#fff" strokeWidth="1.5" />));
    // the river with bridges
    out.push(<rect key={key()} x="-500" y="1765" width="3300" height="70" style={{ fill: 'var(--water)' }} />, <line key={key()} x1="-500" y1="1790" x2="2800" y2="1790" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="30 40" />);
    for (let a = -1; a <= 9; a++) { const x = 120 + 240 * a; out.push(<rect key={key()} x={x - 28} y="1756" width="56" height="88" style={{ fill: 'var(--street)' }} />, <line key={key()} x1={x - 28} y1="1756" x2={x - 28} y2="1844" stroke="#8a93a6" strokeWidth="3" />, <line key={key()} x1={x + 28} y1="1756" x2={x + 28} y2="1844" stroke="#8a93a6" strokeWidth="3" />); }
    out.push(<g key={key()} className="cm-boat"><ellipse cx="0" cy="1800" rx="34" ry="11" fill="#fff" /><ellipse cx="6" cy="1800" rx="14" ry="6" fill="#f5a000" /></g>);
    // lane marks on the streets
    for (let b = -1; b <= 13; b++) out.push(<line key={key()} x1="-500" y1={120 + 240 * b} x2="2800" y2={120 + 240 * b} className="cm-lane" />);
    for (let a = -1; a <= 9; a++) out.push(<line key={key()} x1={120 + 240 * a} y1="-400" x2={120 + 240 * a} y2="3400" className="cm-lane" />);
    // moving cars
    const colors = ['#B35B57', '#6F8DB5', '#F1F1EF', '#C9B574', '#7FA085', '#8E86A8'];
    for (let n = 0; n < 22; n++) {
      const horiz = n % 2 === 0; const lane = 120 + 240 * (1 + Math.floor(rnd() * 12)); const off = 7;
      const len = horiz ? 2800 : 3300; const dir = rnd() < 0.5 ? 1 : -1;
      const from = dir > 0 ? -500 : len - 500 - 300; const to = dir > 0 ? len - 500 - 300 : -500;
      const vars = horiz ? { '--x0': from + 'px', '--y0': (lane + dir * off) + 'px', '--x1': to + 'px', '--y1': (lane + dir * off) + 'px' } : { '--x0': (lane + dir * off) + 'px', '--y0': from + 'px', '--x1': (lane + dir * off) + 'px', '--y1': to + 'px' };
      out.push(
        <g key={key()} className="cm-car" style={{ ...vars, '--dur': (60 + rnd() * 40).toFixed(0) + 's', animationDelay: '-' + (rnd() * 60).toFixed(0) + 's' }}>
          <rect x={horiz ? -13 : -6} y={horiz ? -6 : -13} width={horiz ? 26 : 12} height={horiz ? 12 : 26} rx="4" fill={colors[n % colors.length]} />
          <rect x={horiz ? -4 : -4} y={horiz ? -4 : -5} width={horiz ? 10 : 8} height={horiz ? 8 : 10} rx="2" fill="#0b1224" opacity="0.55" />
        </g>,
      );
    }
    // street lights (they glow at night)
    const lamps = [];
    for (let a = -1; a <= 9; a++) for (let b = -1; b <= 13; b++) lamps.push(<circle key={'l' + a + '_' + b} cx={120 + 240 * a + 14} cy={120 + 240 * b + 14} r="34" fill="url(#cmLamp)" />);
    out.push(<g key={key()} className="cm-lamps">{lamps}</g>);
    return out;
  }, []);
  return <g>{els}</g>;
});

/* ---------------------------------------------------------------- people, seen from above */
export const Person = ({ x, y, shirt = '#3b82f6', hat = null, s = 2, phone = false, ring = null, bob = 0 }) => (
  <g transform={`translate(${x} ${y + bob}) scale(${s * 0.62})`}>
    {ring && <circle r="17" fill="none" stroke={ring} strokeWidth="2.5" className="cz3-ping-s" />}
    <circle cx="1.5" cy="2.5" r="11" fill="#000" opacity="0.22" />
    <circle r="11" fill={shirt} stroke="#fff" strokeWidth="2.6" />
    <circle cy="-3" r="3.2" fill="#fff" />
    <path d="M-6 6.5 Q-6 1 0 1 Q6 1 6 6.5 Z" fill="#fff" />
    {hat && <path d="M-4.2 -4.4 Q0 -10 4.2 -4.4 Z" fill={hat} stroke="#fff" strokeWidth="0.8" />}
    {phone && <rect x="6.6" y="-1" width="4.6" height="8.4" rx="1.2" fill="#0b1630" stroke="#fff" strokeWidth="1" />}
  </g>
);
const Bubble = ({ x, y, dx = 0, text, color, u, show }) => {
  const fs = 13 * u; const w = text.length * fs * 0.56 + 46 * u; const h = 34 * u; const bx = x + dx; const by = y - 30 * u - h;
  return (
    <g style={{ opacity: show ? 1 : 0, transform: `translateY(${show ? 0 : 10 * u}px)`, transition: 'opacity .35s, transform .35s' }}>
      <path d={`M${x} ${y - 22 * u} L${x - 7 * u} ${by + h - 1} L${x + 7 * u} ${by + h - 1} Z`} fill="#fff" />
      <rect x={bx - w / 2} y={by} width={w} height={h} rx={10 * u} fill="#fff" stroke="rgba(11,22,48,0.14)" strokeWidth={1.2 * u} style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.2))' }} />
      <circle cx={bx - w / 2 + 17 * u} cy={by + h / 2} r={5 * u} fill={color} />
      <text x={bx - w / 2 + 30 * u} y={by + h / 2 + fs * 0.35} fontSize={fs} fontWeight="700" fill="#0b1630">{text}</text>
    </g>
  );
};
const LANDMARKS = [
  [240, 960, 'CITY HOSPITAL'], [720, 240, 'MALL'], [960, 720, 'SCHOOL'], [1200, 480, 'PETROL'], [1680, 1200, 'MARKET'],
  [720, 1200, 'SPORTS CLUB'], [1680, 1920, 'PARKING'], [1920, 720, 'STADIUM'], [0, 1200, 'HELIPAD'], [1200, 2160, 'CITY PARK'],
];
const Landmarks = ({ u }) => LANDMARKS.map(([x, y, t]) => (
  <text key={t} x={x} y={y + 4 * u} textAnchor="middle" fontSize={11 * u} fontWeight="700" letterSpacing={0.6 * u} fill="var(--lbl)" stroke="var(--lblh)" strokeWidth={3.2 * u} paintOrder="stroke" strokeLinejoin="round">{t}</text>
));

/* ---------------------------------------------------------------- the pins and labels */
const Pin = ({ x, y, color, text, u, show = true, ping = false }) => {
  const fs = 12 * u; const w = text.length * fs * 0.62 + 40 * u; const h = 30 * u;
  return (
    <g style={{ opacity: show ? 1 : 0, transition: 'opacity .4s' }}>
      {ping && <circle cx={x} cy={y} r={14 * u} fill="none" stroke={color} strokeWidth={3 * u} className="cz3-ping" />}
      <circle cx={x} cy={y} r={8 * u} fill={color} stroke="#fff" strokeWidth={3 * u} />
      <rect x={x - w / 2} y={y - 20 * u - h} width={w} height={h} rx={8 * u} fill="#fff" stroke="rgba(11,22,48,0.14)" strokeWidth={1.2 * u} style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.18))' }} />
      <circle cx={x - w / 2 + 15 * u} cy={y - 20 * u - h / 2} r={4.5 * u} fill={color} />
      <text x={x - w / 2 + 27 * u} y={y - 20 * u - h / 2 + fs * 0.36} fontSize={fs} fontWeight="700" letterSpacing={0.4 * u} fill="#0b1630">{text}</text>
    </g>
  );
};

/* ---------------------------------------------------------------- one frame */
export const MapStory = ({ p, stage, portrait }) => {
  const hd = useRef(null);

  // ----- where the crane is, and what it is doing
  const aMove = seg(p, 0.38, 0.58); const bMove = seg(p, 0.91, 0.99);
  const onA = p < 0.905;
  const pos = onA ? posAt(ROUTE_A, aMove) : posAt(ROUTE_B, bMove);
  const driving = (p > 0.38 && p < 0.58) || (p > 0.91 && p < 0.99);
  const targetH = (!onA || aMove > 0.999) && p < 0.905 ? 0 : pos.h;
  if (hd.current === null) hd.current = targetH;
  const dH = ((targetH - hd.current + 540) % 360) - 180; hd.current += dH * 0.2;
  const H = hd.current;

  const outr = seg(p, 0.58, 0.62) - seg(p, 0.84, 0.88);
  let ang = 0; let len = 70;
  ang = lerp(ang, -38.7, seg(p, 0.62, 0.66)); len = lerp(len, 89.6, seg(p, 0.62, 0.66));
  ang = lerp(ang, 0, seg(p, 0.70, 0.76)); len = lerp(len, 126, seg(p, 0.70, 0.76));
  ang = lerp(ang, 0, seg(p, 0.84, 0.88)); len = lerp(len, 70, seg(p, 0.84, 0.88));
  const tipL = { x: -8 + len * Math.cos(rad(ang)), y: len * Math.sin(rad(ang)) };
  const hr = rad(H);
  const tipW = { x: pos.x + tipL.x * Math.cos(hr) - tipL.y * Math.sin(hr), y: pos.y + tipL.x * Math.sin(hr) + tipL.y * Math.cos(hr) };
  const attached = p >= 0.66 && p < 0.77; const placed = p >= 0.77;
  const g3 = seg(p, 0.77, 0.83); const tick = seg(p, 0.79, 0.85); const coinK = lin(p, 0.82, 0.9);

  // ----- day to night
  const m = seg(p, 0.2, 0.98);
  const night = seg(p, 0.6, 0.85);
  const vars = {
    '--street': mix3('#FBFAF7', '#E6DCCB', '#161C2B', m), '--blk': mix3('#E9E7E0', '#CDC3B4', '#0F1523', m),
    '--roof': mix3('#D8D6CF', '#B9AE9F', '#0C121F', m), '--roof2': mix3('#DFDDD6', '#C4B9AA', '#141B2D', m),
    '--park': mix3('#D3E4C8', '#9FB195', '#0D2A20', m), '--tree': mix3('#86B279', '#6C8F63', '#12402C', m),
    '--water': mix3('#B6D3EA', '#98B4CC', '#0E2D55', m), '--yard': mix3('#F5E8C4', '#D6BF8D', '#33290F', m),
    '--dirt': mix3('#E6DBBF', '#C2AE88', '#26211A', m), '--ground': mix3('#F2F1EC', '#D9CDBB', '#0A0F1C', m),
    '--lanec': mix3('#D2D0C8', '#B3A794', '#2A3350', m),
    '--roofA': mix3('#D9D3CA', '#BDB0A0', '#141A2A', m), '--roofB': mix3('#D3D9D6', '#B3B8AE', '#111B28', m), '--roofC': mix3('#D2D7DE', '#B1B2B0', '#121A2E', m), '--bri': (1 - m * 0.5).toFixed(2),
    '--lbl': mix3('#5A6272', '#4E4538', '#9AA6BD', m), '--lblh': mix3('#FFFFFF', '#E6DCCB', '#161C2B', m),
    '--lamp': night.toFixed(3), '--lit': (night * 0.95).toFixed(3),
  };

  // ----- the booking: customer -> Cranezo -> owner, and the answer back
  const hubA = seg(p, 0.14, 0.2) * (1 - seg(p, 0.35, 0.39));
  const siteP = { x: BUILD.x, y: BUILD.y };
  const ctrlA = { x: 1250, y: 980 }; const ctrlB = { x: 560, y: 900 };
  const along = (t) => (t < 0.5 ? quad(siteP, ctrlA, HUB, t * 2) : quad(HUB, ctrlB, YARD, (t - 0.5) * 2));
  const req = lin(p, 0.17, 0.27); const ack = lin(p, 0.29, 0.36);
  const reqPt = along(req); const ackPt = along(1 - ack);
  const curveD = `M${siteP.x} ${siteP.y} Q${ctrlA.x} ${ctrlA.y} ${HUB.x} ${HUB.y} Q${ctrlB.x} ${ctrlB.y} ${YARD.x} ${YARD.y}`;

  // ----- the camera
  const vw = Math.max(1, stage.w); const vh = Math.max(1, stage.h);
  const crane = { x: pos.x, y: pos.y };
  const mixCam = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t) });
  let cam = { x: 910, y: portrait ? 720 : 980, w: portrait ? 1500 : 2150 };
  cam = mixCam(cam, { ...crane, w: portrait ? 720 : 1000 }, seg(p, 0.33, 0.4));
  cam = mixCam(cam, { x: 1395, y: 1440, w: portrait ? 340 : 560 }, seg(p, 0.57, 0.63));
  cam = mixCam(cam, { x: 1380, y: 1440, w: portrait ? 560 : 900 }, seg(p, 0.8, 0.86));
  cam = mixCam(cam, { ...crane, w: portrait ? 720 : 1000 }, seg(p, 0.89, 0.94));
  cam = mixCam(cam, { x: YARD.x, y: YARD.y, w: portrait ? 560 : 760 }, seg(p, 0.965, 0.995));
  const w = cam.w; const h = (w * vh) / vw; const u = w / vw;
  const cx = cam.x - (portrait ? 0 : 0.1) * w; const cy = cam.y + (portrait ? 0.2 : 0.04) * h;
  const viewBox = `${(cx - w / 2).toFixed(1)} ${(cy - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;

  const doneA = onA ? aMove : 1;
  const ps = clamp(u * 2.6, 1.2, 3.4); // people are drawn bigger when the map is far away
  const bob = Math.sin(p * 120) * 1.2;
  // the operator walks from the owner to the crane, climbs in, and steps out again when the crane is home
  const walk = seg(p, 0.3, 0.37);
  const opWalking = p > 0.28 && p < 0.375;
  const opHome = p > 0.985;
  const opPos = opHome ? { x: 548, y: 520 } : { x: lerp(552, 440, walk), y: lerp(506, 482, walk) };
  return (
    <svg className="cz3-svg" viewBox={viewBox} preserveAspectRatio="xMidYMid slice" style={vars} aria-hidden="true">
      <defs>
        <linearGradient id="cmY" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe27a" /><stop offset="0.5" stopColor="#ffb81a" /><stop offset="1" stopColor="#d98900" /></linearGradient>
        <pattern id="cmHz" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="14" fill="#f5a800" /><rect x="7" width="7" height="14" fill="#141414" /></pattern>
        <linearGradient id="cmBeam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff2b8" stopOpacity="0.9" /><stop offset="1" stopColor="#fff2b8" stopOpacity="0" /></linearGradient>
        <radialGradient id="cmLamp"><stop offset="0" stopColor="#ffd27a" stopOpacity="0.95" /><stop offset="1" stopColor="#ffd27a" stopOpacity="0" /></radialGradient>
      </defs>
      <rect x="-1200" y="-1000" width="4800" height="5200" style={{ fill: 'var(--street)' }} />
      <Decor />

      {/* the route: faint where it is still to come, bright where the crane has been */}
      <path d={ROUTE_A.d} fill="none" stroke="#f5a000" strokeOpacity="0.45" strokeWidth="9" strokeDasharray="22 16" strokeLinecap="round" />
      <path d={ROUTE_A.d} fill="none" stroke="#f5a000" strokeWidth="13" strokeLinecap="round" strokeDasharray={`${doneA * ROUTE_A.len} ${ROUTE_A.len + 10}`} opacity={p > 0.38 ? 1 : 0} />
      <path d={ROUTE_B.d} fill="none" stroke="#f5a000" strokeOpacity={seg(p, 0.86, 0.9) * 0.45} strokeWidth="9" strokeDasharray="22 16" strokeLinecap="round" />
      <path d={ROUTE_B.d} fill="none" stroke="#f5a000" strokeWidth="13" strokeLinecap="round" strokeDasharray={`${bMove * ROUTE_B.len} ${ROUTE_B.len + 10}`} opacity={p > 0.91 ? 1 : 0} />

      {/* Cranezo in the middle: the booking goes up to it and on to the owner */}
      <g opacity={hubA}>
        <path d={curveD} fill="none" stroke="#F6F1E0" strokeWidth={4 * u} strokeDasharray={`${3 * u} ${14 * u}`} strokeLinecap="round" />
        <circle cx={HUB.x} cy={HUB.y} r={64 * u} fill="none" stroke="#f5a000" strokeWidth={4 * u} className="cz3-ping-s" />
        <g transform={`translate(0 ${152 * u})`}><Bubble x={HUB.x} y={HUB.y - 22 * u} text={p < 0.24 ? 'Finding a crane near you…' : 'Crane found ✓ request sent'} color="#f5a000" u={u} show /></g>
        <rect x={HUB.x - 100 * u} y={HUB.y - 30 * u} width={200 * u} height={60 * u} rx={18 * u} fill="#fff" stroke="#f5a000" strokeWidth={3.5 * u} />
        <image href={logoImg} x={HUB.x - 82 * u} y={HUB.y - 22 * u} width={164 * u} height={44 * u} preserveAspectRatio="xMidYMid meet" />
        {req > 0 && req < 1 && <circle cx={reqPt.x} cy={reqPt.y} r={11 * u} fill="#38bdf8" stroke="#fff" strokeWidth={3 * u} />}
        {ack > 0 && ack < 1 && <circle cx={ackPt.x} cy={ackPt.y} r={11 * u} fill="#22c55e" stroke="#fff" strokeWidth={3 * u} />}
      </g>

      {/* the building going up, then the beam on top of it */}
      <g>
        <rect x={BUILD.x - BUILD.w / 2 + 5} y={BUILD.y - BUILD.h / 2 + 6} width={BUILD.w} height={BUILD.h} fill="#000" opacity="0.2" />
        <rect x={BUILD.x - BUILD.w / 2} y={BUILD.y - BUILD.h / 2} width={BUILD.w} height={BUILD.h} fill="#aeb6c6" stroke="#6e7790" strokeWidth="3" />
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => <rect key={a + '' + b} x={BUILD.x + a * (BUILD.w / 2 - 8) - 6} y={BUILD.y + b * (BUILD.h / 2 - 8) - 6} width="12" height="12" fill="#e7ebf3" stroke="#6e7790" strokeWidth="1.5" />)}
        <rect x={BUILD.x - BUILD.w / 2 + 10} y={BUILD.y - BUILD.h / 2 + 10} width={BUILD.w - 20} height={BUILD.h - 20} fill="#dfe4ee" opacity={g3} />
        <line x1={BUILD.x} y1={BUILD.y - BUILD.h / 2} x2={BUILD.x} y2={BUILD.y + BUILD.h / 2} stroke="#6e7790" strokeWidth="2" opacity="0.6" />
        <line x1={BUILD.x - BUILD.w / 2} y1={BUILD.y} x2={BUILD.x + BUILD.w / 2} y2={BUILD.y} stroke="#6e7790" strokeWidth="2" opacity="0.6" />
        {placed && <rect x={BUILD.x - 22} y={BUILD.y - 7} width="44" height="14" rx="2" fill="url(#cmHz)" stroke="#111" strokeWidth="1.5" />}
      </g>

      {/* the beam on the ground, until it is picked up */}
      {p < 0.66 && <rect x={PICK.x - 22} y={PICK.y - 7 - 2} width="44" height="14" rx="2" fill="url(#cmHz)" stroke="#111" strokeWidth="1.5" />}

      {/* the crane */}
      <g transform={`translate(${pos.x.toFixed(1)} ${pos.y.toFixed(1)}) rotate(${H.toFixed(1)})`}>
        {driving && [0, 1, 2, 3].map((i) => <circle key={i} cx={-72 - i * 16} cy={(i % 2 ? 6 : -6)} r={6 + i * 3} fill="#a8927a" opacity={0.28 * (1 - i / 4)} />)}
        <CraneBody outr={outr} ang={ang} len={len} night={night} blink={p > 0.55 && p < 0.9} />
      </g>
      {attached && <rect x={tipW.x - 22} y={tipW.y - 7} width="44" height="14" rx="2" fill="url(#cmHz)" stroke="#111" strokeWidth="1.5" />}

      {/* done, and the payment */}
      <g opacity={tick} transform={`translate(${BUILD.x} ${BUILD.y - 90 - 14 * tick}) scale(${0.6 + 0.4 * tick})`}>
        <circle r="26" fill="#16a34a" stroke="#bbf7d0" strokeWidth="4" />
        <path d="M-11 1 L-4 9 L12 -8" stroke="#fff" strokeWidth="5.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {coinK > 0 && Array.from({ length: 9 }, (_, i) => {
        const ph = clamp(coinK * 1.45 - i * 0.09);
        if (ph <= 0 || ph >= 0.98) return null;
        const sx = 1385; const sy = 1345; const ex = WORK_AT.x + 50; const ey = WORK_AT.y;
        return (
          <g key={i} transform={`translate(${lerp(sx, ex, ph)} ${lerp(sy, ey, ph) - 70 * Math.sin(ph * Math.PI)})`}>
            <circle r="13" fill="#ffc933" stroke="#b86f00" strokeWidth="2.5" />
            <text y="5.5" textAnchor="middle" fontSize="15" fontWeight="900" fill="#7a4d00">₹</text>
          </g>
        );
      })}

      <Landmarks u={u * 0.9} />

      {/* the people */}
      <Person x={1385} y={1345} shirt="#38bdf8" phone s={ps} bob={bob} ring={(p > 0.05 && p < 0.4) || (p > 0.82 && p < 0.92) ? '#38bdf8' : null} />
      <Person x={552} y={468} shirt="#a78bfa" phone s={ps} bob={bob * 0.6} ring={p > 0.17 && p < 0.37 ? '#a78bfa' : null} />
      <Person x={1535} y={1352} shirt="#fb923c" hat="#fbbf24" s={ps} bob={bob} />
      <Person x={1405} y={1522} shirt="#fb923c" hat="#fbbf24" s={ps} bob={-bob} />
      {(opWalking || opHome || p < 0.28) && <Person x={opPos.x} y={opPos.y} shirt="#22c55e" hat="#fbbf24" s={ps} bob={opWalking ? bob * 2 : 0} />}

      {/* what they say */}
      <Bubble x={1385} y={1345} dx={-20 * u} text="I need a crane tomorrow!" color="#38bdf8" u={u} show={p > 0.06 && p < 0.17} />
      <Bubble x={1385} y={1345} dx={-20 * u} text="Booking sent…" color="#38bdf8" u={u} show={p >= 0.17 && p < 0.34} />
      <Bubble x={1385} y={1345} dx={-20 * u} text="Booking confirmed ✓" color="#22c55e" u={u} show={p >= 0.34 && p < 0.42} />
      <Bubble x={1385} y={1345} dx={-20 * u} text="Payment done ✓" color="#22c55e" u={u} show={p > 0.83 && p < 0.92} />
      <Bubble x={552} y={468} dx={70 * u} text="New request! Accept?" color="#a78bfa" u={u} show={p > 0.2 && p < 0.29} />
      <Bubble x={552} y={468} dx={70 * u} text="Accepted ✓ Operator assigned" color="#22c55e" u={u} show={p >= 0.29 && p < 0.37} />
      <Bubble x={552} y={468} dx={70 * u} text="Welcome back! Payment received ₹" color="#22c55e" u={u} show={p > 0.97} />
      <Bubble x={opPos.x} y={opPos.y + 40 * u} text="Got the job!" color="#fbbf24" u={u} show={p > 0.3 && p < 0.36} />

      {/* the places */}
      <Pin x={YARD.x - 40} y={YARD.y - 100} color="#a78bfa" text="OWNER'S YARD" u={u} ping={p > 0.2 && p < 0.37} />
      <Pin x={SITE.x} y={SITE.y + 112} color="#38bdf8" text="CUSTOMER'S SITE" u={u} ping={p > 0.05 && p < 0.6} show={!(p > 0.56 && p < 0.9)} />
    </svg>
  );
};

export default MapStory;
