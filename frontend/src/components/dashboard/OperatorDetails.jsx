import React, { useState } from 'react';
import {
  ArrowLeft,
  Edit2,
  Ban,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  HardHat,
  Construction,
  Award,
  Check,
} from 'lucide-react';
import operatorAvatarImg from '../../assets/operator_avatar.jpg';
import craneThumbnailImg from '../../assets/crane_thumbnail.jpg';

export const OperatorDetails = ({ operatorId = 'OPR-1003', onBack }) => {
  const [activeTab, setActiveTab] = useState('Overview');

  const tabs = [
    { id: 'Overview', label: 'Overview' },
    { id: 'Documents', label: 'Documents (3)' },
    { id: 'Job History', label: 'Job History' },
    { id: 'Performance', label: 'Performance' },
  ];

  const recentJobs = [
    {
      id: '#CRZ10245',
      craneType: 'Mobile Crane (50 Ton)',
      date: '08 Oct 2026',
      status: 'In Progress',
      statusColor: '#60a5fa',
      statusBg: 'rgba(59, 130, 246, 0.12)',
      statusBorder: 'rgba(59, 130, 246, 0.25)',
    },
    {
      id: '#CRZ10244',
      craneType: 'Tower Crane (30 Ton)',
      date: '05 Oct 2026',
      status: 'Completed',
      statusColor: '#10b981',
      statusBg: 'rgba(16, 185, 129, 0.12)',
      statusBorder: 'rgba(16, 185, 129, 0.25)',
    },
    {
      id: '#CRZ10231',
      craneType: 'Truck Crane (25 Ton)',
      date: '28 Sep 2026',
      status: 'Completed',
      statusColor: '#10b981',
      statusBg: 'rgba(16, 185, 129, 0.12)',
      statusBorder: 'rgba(16, 185, 129, 0.25)',
    },
    {
      id: '#CRZ10220',
      craneType: 'Mobile Crane (60 Ton)',
      date: '18 Sep 2026',
      status: 'Completed',
      statusColor: '#10b981',
      statusBg: 'rgba(16, 185, 129, 0.12)',
      statusBorder: 'rgba(16, 185, 129, 0.25)',
    },
  ];

  return (
    <div className="cranzo-content-view animate-fade-in">
      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 0 8px 0',
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to Operators</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
              Operator Details
            </h2>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: '600',
                padding: '2px 8px',
                borderRadius: '9999px',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.28)',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              Online
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
            View operator profile, license, assigned crane and work history.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="cranzo-btn-secondary"
            style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Edit2 size={14} color="#f59e0b" />
            <span>Edit Operator</span>
          </button>
          <button
            type="button"
            className="cranzo-btn-danger-outline"
            style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Ban size={14} />
            <span>Block Operator</span>
          </button>
        </div>
      </div>

      {/* Operator Profile Card */}
      <div
        className="cranzo-card"
        style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', flexWrap: 'wrap' }}>
          {/* Avatar with golden outline */}
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid #f59e0b',
              boxShadow: '0 0 12px rgba(245, 158, 11, 0.25)',
              flexShrink: 0,
            }}
          >
            <img
              src={operatorAvatarImg}
              alt="Vikram Singh"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '19px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
                Vikram Singh
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Operator • ID : {operatorId}</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.28)',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                  Active
                </span>
              </div>
            </div>

            {/* Contacts Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                marginTop: '12px',
                flexWrap: 'wrap',
                fontSize: '13px',
                color: '#cbd5e1',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={14} color="#64748b" />
                <span>+91 98765 43211</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} color="#64748b" />
                <span>vikram.singh@cranes.com</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} color="#ef4444" />
                <span>Hyderabad, Telangana</span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Metadata Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '500' }}>Experience</div>
            <div style={{ fontSize: '13.5px', color: '#ffffff', fontWeight: '600', marginTop: '3px' }}>
              5 Years
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '500' }}>License No.</div>
            <div style={{ fontSize: '13.5px', color: '#ffffff', fontWeight: '600', marginTop: '3px' }}>
              DL-TS-123456789
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '500' }}>Assigned Crane</div>
            <div style={{ fontSize: '13.5px', color: '#f59e0b', fontWeight: '600', marginTop: '3px' }}>
              Mobile Crane (50 Ton)
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          marginTop: '6px',
          paddingBottom: '2px',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '10px 4px 12px',
                fontSize: '13.5px',
                fontWeight: isActive ? '600' : '500',
                color: isActive ? '#f59e0b' : '#94a3b8',
                borderBottom: isActive ? '2px solid #f59e0b' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3 Stat Cards in Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '4px' }}>
        <div className="cranzo-stat-card">
          <div className="cranzo-stat-card-left">
            <div className="cranzo-stat-icon-box" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              <Briefcase size={20} />
            </div>
            <div className="cranzo-stat-info">
              <span className="cranzo-stat-label">Total Jobs</span>
              <span className="cranzo-stat-value">18</span>
            </div>
          </div>
        </div>

        <div className="cranzo-stat-card">
          <div className="cranzo-stat-card-left">
            <div className="cranzo-stat-icon-box green">
              <CheckCircle2 size={20} />
            </div>
            <div className="cranzo-stat-info">
              <span className="cranzo-stat-label">Completed Jobs</span>
              <span className="cranzo-stat-value">16</span>
            </div>
          </div>
        </div>

        <div className="cranzo-stat-card">
          <div className="cranzo-stat-card-left">
            <div className="cranzo-stat-icon-box red">
              <XCircle size={20} />
            </div>
            <div className="cranzo-stat-info">
              <span className="cranzo-stat-label">Cancelled Jobs</span>
              <span className="cranzo-stat-value">2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: License Information & Assigned Crane */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left: License Information */}
        <div className="cranzo-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <Award size={16} color="#f59e0b" />
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
              License Information
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748b' }}>License Type</span>
              <span style={{ color: '#ffffff', fontWeight: '500' }}>Heavy Vehicle (HMV)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748b' }}>License Number</span>
              <span style={{ color: '#ffffff', fontWeight: '500' }}>DL-TS-123456789</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748b' }}>Issue Date</span>
              <span style={{ color: '#ffffff', fontWeight: '500' }}>12 Jan 2022</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ color: '#64748b' }}>Expiry Date</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#ffffff', fontWeight: '500' }}>11 Jan 2027</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.28)',
                  }}
                >
                  <Check size={11} strokeWidth={3} />
                  Valid
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Assigned Crane */}
        <div className="cranzo-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Construction size={16} color="#f59e0b" />
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
              Assigned Crane
            </h4>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px',
              borderRadius: '10px',
              background: '#070D17',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '70px',
                borderRadius: '8px',
                overflow: 'hidden',
                flexShrink: 0,
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <img
                src={craneThumbnailImg}
                alt="Assigned Mobile Crane"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ color: '#64748b', fontSize: '11.5px', fontWeight: '500' }}>Crane ID</div>
              <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700', marginTop: '1px' }}>
                CRN-1045
              </div>
              <div style={{ color: '#64748b', fontSize: '11.5px', marginTop: '4px' }}>Crane Type</div>
              <div style={{ color: '#cbd5e1', fontSize: '13px', fontWeight: '500', marginTop: '1px' }}>
                Mobile Crane (50 Ton)
              </div>
            </div>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: '600',
                padding: '3px 10px',
                borderRadius: '9999px',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.28)',
              }}
            >
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
              Assigned
            </span>
          </div>
        </div>
      </div>

      {/* Recent Job History Table */}
      <div className="cranzo-card" style={{ padding: '22px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color="#f59e0b" />
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
              Recent Job History
            </h4>
          </div>
          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f59e0b',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            View All
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="cranzo-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Crane Type</th>
                <th>Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right', paddingRight: '20px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.map((j) => (
                <tr key={j.id}>
                  <td style={{ color: '#ffffff', fontWeight: '600' }}>{j.id}</td>
                  <td style={{ color: '#cbd5e1' }}>{j.craneType}</td>
                  <td style={{ color: '#94a3b8' }}>{j.date}</td>
                  <td>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: '600',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        color: j.statusColor,
                        background: j.statusBg,
                        border: `1px solid ${j.statusBorder}`,
                      }}
                    >
                      {j.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                    <button
                      type="button"
                      style={{
                        height: '28px',
                        padding: '0 12px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#cbd5e1',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer',
                      }}
                    >
                      View
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

export default OperatorDetails;
