import React, { useState } from 'react';
import {
  Users,
  Briefcase,
  Construction,
  Calendar,
  Wallet,
  CheckCircle2,
  Clock,
  HardHat,
  ArrowUpRight,
  MoreHorizontal,
  CalendarDays,
} from 'lucide-react';

export const DashboardOverview = ({ onNavigate, onSelectUser }) => {
  const [bookingFilter, setBookingFilter] = useState('7 Days');
  const [revenueFilter, setRevenueFilter] = useState('7 Days');
  const [activeTooltip, setActiveTooltip] = useState(null);

  const statCards = [
    {
      id: 'users',
      label: 'Total Users',
      value: '2,458',
      trend: '↑ 12.5%',
      icon: Users,
      route: 'users',
    },
    {
      id: 'owners',
      label: 'Total Owners',
      value: '186',
      trend: '↑ 8.2%',
      icon: Briefcase,
      route: 'owners',
    },
    {
      id: 'cranes',
      label: 'Active Cranes',
      value: '342',
      trend: '↑ 6.4%',
      icon: Construction,
      route: 'cranes',
    },
    {
      id: 'bookings',
      label: 'Active Bookings',
      value: '78',
      trend: '↑ 14.8%',
      icon: Calendar,
      route: 'bookings',
    },
    {
      id: 'revenue',
      label: 'Total Revenue',
      value: '₹ 18,42,500',
      trend: '↑ 16.3%',
      icon: Wallet,
      route: 'payments',
    },
    {
      id: 'jobs',
      label: 'Completed Jobs',
      value: '1,126',
      trend: '↑ 10.7%',
      icon: CheckCircle2,
      route: 'bookings',
    },
    {
      id: 'approvals',
      label: 'Pending Approvals',
      value: '15',
      trend: '↑ 5.1%',
      icon: Clock,
      route: 'bookings',
    },
    {
      id: 'operators',
      label: 'Active Operators',
      value: '274',
      trend: '↑ 9.4%',
      icon: HardHat,
      route: 'operators',
    },
  ];

  const bookingBarData = [
    { day: 'Oct 01', value: 42 },
    { day: 'Oct 02', value: 34 },
    { day: 'Oct 03', value: 56 },
    { day: 'Oct 04', value: 62 },
    { day: 'Oct 05', value: 48 },
    { day: 'Oct 06', value: 68 },
    { day: 'Oct 07', value: 64 },
    { day: 'Oct 08', value: 74 },
  ];

  const revenueLineData = [
    { day: 'Oct 01', value: 16500, label: '₹ 16.5K' },
    { day: 'Oct 02', value: 18200, label: '₹ 18.2K' },
    { day: 'Oct 03', value: 24500, label: '₹ 24.5K' },
    { day: 'Oct 04', value: 23000, label: '₹ 23.0K' },
    { day: 'Oct 05', value: 32000, label: '₹ 32.0K' },
    { day: 'Oct 06', value: 27500, label: '₹ 27.5K' },
    { day: 'Oct 07', value: 34000, label: '₹ 34.0K' },
    { day: 'Oct 08', value: 38500, label: '₹ 38.5K' },
  ];

  const recentBookings = [
    {
      id: '#CRZ10245',
      customer: 'Rahul Kumar',
      userId: 'USR-10245',
      crane: 'Mobile Crane (50 Ton)',
      owner: 'ABC Crane Services',
      date: '08 Oct 2026',
      amount: '₹ 12,500',
      status: 'In Progress',
      statusClass: 'in-progress',
    },
    {
      id: '#CRZ10244',
      customer: 'Priya Sharma',
      userId: 'USR-10246',
      crane: 'Tower Crane (30 Ton)',
      owner: 'XYZ Lifting',
      date: '08 Oct 2026',
      amount: '₹ 18,000',
      status: 'Confirmed',
      statusClass: 'confirmed',
    },
    {
      id: '#CRZ10243',
      customer: 'Suresh Reddy',
      userId: 'USR-10247',
      crane: 'Truck Crane (25 Ton)',
      owner: 'Reddy Cranes',
      date: '07 Oct 2026',
      amount: '₹ 9,500',
      status: 'Completed',
      statusClass: 'completed',
    },
    {
      id: '#CRZ10242',
      customer: 'Anil Gupta',
      userId: 'USR-10248',
      crane: 'Crawler Crane (100 Ton)',
      owner: 'Gupta Infra',
      date: '07 Oct 2026',
      amount: '₹ 45,000',
      status: 'Pending',
      statusClass: 'pending',
    },
    {
      id: '#CRZ10241',
      customer: 'Neha Patel',
      userId: 'USR-10249',
      crane: 'Mobile Crane (40 Ton)',
      owner: 'Patel Heavy Logistics',
      date: '06 Oct 2026',
      amount: '₹ 22,000',
      status: 'Cancelled',
      statusClass: 'cancelled',
    },
  ];

  return (
    <div className="cranzo-content-view animate-fade-in">
      {/* Top Greeting & Date Row */}
      <div className="cranzo-top-greeting-row">
        <div>
          <h2 className="cranzo-greeting-title">
            Good morning, Admin <span role="img" aria-label="wave">👋</span>
          </h2>
          <p className="cranzo-greeting-subtitle">
            Here's what's happening across Cranzo today.
          </p>
        </div>

        <div className="cranzo-date-pill">
          <CalendarDays size={16} color="#f59e0b" />
          <span>Wednesday, 08 Oct 2026</span>
        </div>
      </div>

      {/* 8 Metric KPI Cards Grid */}
      <div className="cranzo-stats-grid-8">
        {statCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <div
              key={card.id}
              className="cranzo-stat-card"
              style={{ cursor: 'pointer' }}
              onClick={() => onNavigate(card.route)}
            >
              <div className="cranzo-stat-card-left">
                <div className="cranzo-stat-icon-box">
                  <IconComponent size={20} />
                </div>
                <div className="cranzo-stat-info">
                  <span className="cranzo-stat-label">{card.label}</span>
                  <span className="cranzo-stat-value">{card.value}</span>
                </div>
              </div>
              <span className="cranzo-trend-pill up">{card.trend}</span>
            </div>
          );
        })}
      </div>

      {/* Charts Row (Booking Overview & Revenue Overview) */}
      <div className="cranzo-charts-row">
        {/* Card 1: Booking Overview */}
        <div className="cranzo-card">
          <div className="cranzo-card-header">
            <div>
              <h3 className="cranzo-card-title">Booking Overview</h3>
            </div>
            <div className="cranzo-filter-pills-group">
              {['Today', '7 Days', '30 Days', '12 Months'].map((pill) => (
                <button
                  key={pill}
                  type="button"
                  className={`cranzo-filter-pill-btn ${
                    bookingFilter === pill ? 'active' : ''
                  }`}
                  onClick={() => setBookingFilter(pill)}
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>

          <div className="cranzo-chart-wrapper">
            <svg
              className="cranzo-chart-svg"
              viewBox="0 0 500 180"
              preserveAspectRatio="none"
            >
              {/* Horizontal Gridlines & Y-Axis values */}
              {[
                { y: 20, label: '100' },
                { y: 55, label: '75' },
                { y: 90, label: '50' },
                { y: 125, label: '25' },
                { y: 160, label: '0' },
              ].map((grid, idx) => (
                <g key={idx}>
                  <text
                    x="25"
                    y={grid.y + 3}
                    textAnchor="end"
                    className="cranzo-chart-axis-label"
                  >
                    {grid.label}
                  </text>
                  <line
                    x1="35"
                    y1={grid.y}
                    x2="480"
                    y2={grid.y}
                    className="cranzo-chart-grid-line"
                  />
                </g>
              ))}

              {/* Bars */}
              {bookingBarData.map((item, idx) => {
                const totalBars = bookingBarData.length;
                const slotWidth = (480 - 45) / totalBars;
                const barWidth = 14;
                const x = 45 + idx * slotWidth + (slotWidth - barWidth) / 2;
                const height = (item.value / 100) * 140;
                const y = 160 - height;

                return (
                  <g key={idx}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={height}
                      className="cranzo-chart-bar"
                      onMouseEnter={() =>
                        setActiveTooltip({
                          type: 'bar',
                          x,
                          y,
                          day: item.day,
                          value: `${item.value} bookings`,
                        })
                      }
                      onMouseLeave={() => setActiveTooltip(null)}
                    />
                    <text
                      x={x + barWidth / 2}
                      y="176"
                      textAnchor="middle"
                      className="cranzo-chart-axis-label"
                    >
                      {item.day}
                    </text>
                  </g>
                );
              })}
            </svg>

            {activeTooltip && activeTooltip.type === 'bar' && (
              <div
                style={{
                  position: 'absolute',
                  top: `${activeTooltip.y - 30}px`,
                  left: `${(activeTooltip.x / 500) * 100}%`,
                  transform: 'translateX(-50%)',
                  background: '#070d1d',
                  border: '1px solid #f59e0b',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  color: '#ffffff',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  zIndex: 20,
                }}
              >
                <strong>{activeTooltip.day}:</strong> {activeTooltip.value}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Revenue Overview */}
        <div className="cranzo-card">
          <div className="cranzo-card-header">
            <div>
              <h3 className="cranzo-card-title">Revenue Overview</h3>
            </div>
            <div className="cranzo-filter-pills-group">
              {['Today', '7 Days', '30 Days', '12 Months'].map((pill) => (
                <button
                  key={pill}
                  type="button"
                  className={`cranzo-filter-pill-btn ${
                    revenueFilter === pill ? 'active' : ''
                  }`}
                  onClick={() => setRevenueFilter(pill)}
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>

          <div className="cranzo-chart-wrapper">
            <svg
              className="cranzo-chart-svg"
              viewBox="0 0 500 180"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="glow" />
                  <feComposite in="SourceGraphic" in2="glow" operator="over" />
                </filter>
              </defs>

              {/* Horizontal Gridlines & Y-Axis values */}
              {[
                { y: 20, label: '40K' },
                { y: 55, label: '30K' },
                { y: 90, label: '20K' },
                { y: 125, label: '10K' },
                { y: 160, label: '0' },
              ].map((grid, idx) => (
                <g key={idx}>
                  <text
                    x="25"
                    y={grid.y + 3}
                    textAnchor="end"
                    className="cranzo-chart-axis-label"
                  >
                    {grid.label}
                  </text>
                  <line
                    x1="35"
                    y1={grid.y}
                    x2="480"
                    y2={grid.y}
                    className="cranzo-chart-grid-line"
                  />
                </g>
              ))}

              {/* Area path & Line path */}
              {(() => {
                const points = revenueLineData.map((d, i) => {
                  const x = 50 + i * ((470 - 50) / (revenueLineData.length - 1));
                  const y = 160 - (d.value / 40000) * 140;
                  return { x, y, ...d };
                });

                // Generate smooth SVG curve
                const pathD = points.reduce((acc, curr, i, arr) => {
                  if (i === 0) return `M ${curr.x} ${curr.y}`;
                  const prev = arr[i - 1];
                  const cx = (prev.x + curr.x) / 2;
                  return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
                }, '');

                const areaD = `${pathD} L ${points[points.length - 1].x} 160 L ${points[0].x} 160 Z`;

                return (
                  <g>
                    <path d={areaD} fill="url(#revenueGradient)" />
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      filter="url(#glow)"
                    />
                    {points.map((pt, idx) => (
                      <g key={idx}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="4"
                          className="cranzo-chart-dot"
                          onMouseEnter={() =>
                            setActiveTooltip({
                              type: 'line',
                              x: pt.x,
                              y: pt.y,
                              day: pt.day,
                              value: pt.label,
                            })
                          }
                          onMouseLeave={() => setActiveTooltip(null)}
                        />
                        <text
                          x={pt.x}
                          y="176"
                          textAnchor="middle"
                          className="cranzo-chart-axis-label"
                        >
                          {pt.day}
                        </text>
                      </g>
                    ))}
                  </g>
                );
              })()}
            </svg>

            {activeTooltip && activeTooltip.type === 'line' && (
              <div
                style={{
                  position: 'absolute',
                  top: `${activeTooltip.y - 30}px`,
                  left: `${(activeTooltip.x / 500) * 100}%`,
                  transform: 'translateX(-50%)',
                  background: '#070d1d',
                  border: '1px solid #f59e0b',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  color: '#ffffff',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  zIndex: 20,
                }}
              >
                <strong>{activeTooltip.day}:</strong> {activeTooltip.value}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Bookings Table Card */}
      <div className="cranzo-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="cranzo-card-header">
          <h3 className="cranzo-card-title">Recent Bookings</h3>
          <button
            type="button"
            className="cranzo-action-link"
            onClick={() => onNavigate('bookings')}
          >
            View All
          </button>
        </div>

        <div className="cranzo-table-container">
          <table className="cranzo-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '110px' }}>BOOKING ID</th>
                <th style={{ minWidth: '150px' }}>CUSTOMER</th>
                <th style={{ minWidth: '170px' }}>CRANE</th>
                <th style={{ minWidth: '160px' }}>OWNER</th>
                <th style={{ minWidth: '110px' }}>DATE</th>
                <th style={{ minWidth: '110px' }}>AMOUNT</th>
                <th style={{ minWidth: '120px' }}>STATUS</th>
                <th style={{ textAlign: 'center', minWidth: '80px' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((row) => (
                <tr key={row.id}>
                  <td className="cranzo-booking-id">{row.id}</td>
                  <td>
                    <span
                      className="cranzo-link-text"
                      onClick={() => onSelectUser(row.userId)}
                    >
                      {row.customer}
                    </span>
                  </td>
                  <td>{row.crane}</td>
                  <td>{row.owner}</td>
                  <td>{row.date}</td>
                  <td style={{ color: '#ffffff', fontWeight: 600 }}>
                    {row.amount}
                  </td>
                  <td>
                    <span className={`cranzo-status-badge ${row.statusClass}`}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="cranzo-action-btn"
                      title="More options"
                      onClick={() => onSelectUser(row.userId)}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
