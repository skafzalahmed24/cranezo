import React, { useState } from 'react';
import {
  ArrowLeft,
  RotateCw,
  Search,
  ChevronRight,
  Truck,
  Clock,
  Calendar,
  MapPin,
  FileCheck,
  Users,
  Compass,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import craneThumbnailImg from '../../assets/crane_thumbnail.jpg';

export const CraneMatching = ({ bookingId = 'CRZ10245', onBack, onSelectCraneDetails }) => {
  const [selectedCraneId, setSelectedCraneId] = useState('CRN-1045');
  const [searchQuery, setSearchQuery] = useState('');
  const [craneTypeFilter, setCraneTypeFilter] = useState('All');
  const [capacityFilter, setCapacityFilter] = useState('50');
  const [distanceFilter, setDistanceFilter] = useState('20');
  const [availabilityFilter, setAvailabilityFilter] = useState('Available');
  const [documentsFilter, setDocumentsFilter] = useState('Valid');
  const [operatorFilter, setOperatorFilter] = useState('Eligible');
  const [gpsFilter, setGpsFilter] = useState('All');

  const cranesList = [
    {
      id: 1,
      craneId: 'CRN-1045',
      regNumber: 'TS-09-AB-1234',
      type: 'Mobile Crane',
      capacity: '50 Ton',
      distance: '4.2 km',
      owner: 'ABC Cranes',
      operator: 'Ravi Kumar (OP-1001)',
      availability: 'Available',
      documents: 'Valid',
      gps: 'Online',
    },
    {
      id: 2,
      craneId: 'CRN-1046',
      regNumber: 'TS-09-CD-5678',
      type: 'Mobile Crane',
      capacity: '60 Ton',
      distance: '7.8 km',
      owner: 'XYZ Lifting',
      operator: 'Arun Kumar (OP-1002)',
      availability: 'Available',
      documents: 'Valid',
      gps: 'Online',
    },
    {
      id: 3,
      craneId: 'CRN-1051',
      regNumber: 'AP-05-EF-9021',
      type: 'Mobile Crane',
      capacity: '50 Ton',
      distance: '9.5 km',
      owner: 'Reddy Cranes',
      operator: 'Mahesh Reddy (OP-1003)',
      availability: 'Available',
      documents: 'Expired',
      gps: 'Offline',
    },
    {
      id: 4,
      craneId: 'CRN-1058',
      regNumber: 'TS-07-GH-4455',
      type: 'Mobile Crane',
      capacity: '50 Ton',
      distance: '12.4 km',
      owner: 'Prime Cranes',
      operator: 'Sandeep Rao (OP-1004)',
      availability: 'On Job',
      documents: 'Valid',
      gps: 'Online',
    },
  ];

  const selectedCrane = cranesList.find((c) => c.craneId === selectedCraneId) || cranesList[0];

  const resetFilters = () => {
    setSearchQuery('');
    setCraneTypeFilter('All');
    setCapacityFilter('50');
    setDistanceFilter('20');
    setAvailabilityFilter('Available');
    setDocumentsFilter('Valid');
    setOperatorFilter('Eligible');
    setGpsFilter('All');
  };

  return (
    <div className="cranzo-content-view animate-fade-in" style={{ paddingBottom: '90px' }}>
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
        <span
          onClick={onBack}
          style={{ cursor: 'pointer', transition: 'color 0.15s ease' }}
          onMouseEnter={(e) => (e.target.style.color = '#ffffff')}
          onMouseLeave={(e) => (e.target.style.color = '#64748b')}
        >
          Bookings
        </span>
        <ChevronRight size={14} />
        <span style={{ color: '#94a3b8' }}>{bookingId}</span>
        <ChevronRight size={14} />
        <span style={{ color: '#ffffff', fontWeight: '500' }}>Crane Matching</span>
      </div>

      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
            Crane Matching
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
            Find the best eligible crane for this booking.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onBack}
            className="cranzo-btn-secondary"
            style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Booking</span>
          </button>
          <button
            type="button"
            className="cranzo-btn-secondary"
            style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RotateCw size={14} />
            <span>Refresh Results</span>
          </button>
        </div>
      </div>

      {/* Booking Details & Radar Map Card */}
      <div
        className="cranzo-card"
        style={{
          padding: '20px 24px',
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: '24px',
          alignItems: 'center',
        }}
      >
        {/* Left: Booking Details */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
              Booking #{bookingId}
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '600',
                padding: '3px 10px',
                borderRadius: '9999px',
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              Awaiting Crane Match
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>
            Requested by <span style={{ color: '#ffffff', fontWeight: '500' }}>Rahul Kumar</span> | +91 98765 43210
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <div style={{ background: '#050a15', border: '1px solid #142037', borderRadius: '8px', padding: '10px 12px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Truck size={12} style={{ color: '#f59e0b' }} /> Crane Type
              </span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff', display: 'block', marginTop: '4px' }}>
                Mobile Crane
              </span>
            </div>

            <div style={{ background: '#050a15', border: '1px solid #142037', borderRadius: '8px', padding: '10px 12px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ShieldCheck size={12} style={{ color: '#38bdf8' }} /> Required Capacity
              </span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff', display: 'block', marginTop: '4px' }}>
                50 Ton
              </span>
            </div>

            <div style={{ background: '#050a15', border: '1px solid #142037', borderRadius: '8px', padding: '10px 12px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={12} style={{ color: '#10b981' }} /> Job Duration
              </span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff', display: 'block', marginTop: '4px' }}>
                6 Hours
              </span>
            </div>

            <div style={{ background: '#050a15', border: '1px solid #142037', borderRadius: '8px', padding: '10px 12px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={12} style={{ color: '#f59e0b' }} /> Job Date
              </span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff', display: 'block', marginTop: '4px' }}>
                08 Oct 2026
              </span>
            </div>

            <div style={{ background: '#050a15', border: '1px solid #142037', borderRadius: '8px', padding: '10px 12px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={12} style={{ color: '#10b981' }} /> Job Start Time
              </span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff', display: 'block', marginTop: '4px' }}>
                10:30 AM
              </span>
            </div>

            <div style={{ background: '#050a15', border: '1px solid #142037', borderRadius: '8px', padding: '10px 12px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={12} style={{ color: '#ef4444' }} /> Job Location
              </span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff', display: 'block', marginTop: '4px' }}>
                Hyderabad, Telangana
              </span>
            </div>
          </div>
        </div>

        {/* Right: Radar Radius Graphic */}
        <div
          style={{
            height: '175px',
            borderRadius: '12px',
            background: 'radial-gradient(circle at center, #0e1e38 0%, #050a15 100%)',
            border: '1px solid #142037',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Radar Circles */}
          <div
            style={{
              position: 'absolute',
              width: '130px',
              height: '130px',
              borderRadius: '50%',
              border: '1px dashed rgba(245, 158, 11, 0.4)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              pointerEvents: 'none',
            }}
          />

          {/* Central Job Pin */}
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#f59e0b',
              boxShadow: '0 0 14px #f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3,
            }}
          />
          <span
            style={{
              position: 'absolute',
              bottom: '14px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '11px',
              color: '#ffffff',
              fontWeight: '600',
              textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            Hyderabad
          </span>

          {/* Crane Pin Dots around */}
          {/* Available crane 1 (Selected) */}
          <div
            style={{
              position: 'absolute',
              top: '40px',
              right: '90px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
              zIndex: 2,
            }}
          />
          {/* Available crane 2 */}
          <div
            style={{
              position: 'absolute',
              bottom: '45px',
              left: '60px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              zIndex: 2,
            }}
          />
          {/* On Job crane */}
          <div
            style={{
              position: 'absolute',
              top: '60px',
              left: '70px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#38bdf8',
              zIndex: 2,
            }}
          />
          {/* Not available crane */}
          <div
            style={{
              position: 'absolute',
              bottom: '50px',
              right: '65px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#ef4444',
              zIndex: 2,
            }}
          />

          {/* Mini Legend overlay */}
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              fontSize: '9.5px',
              color: '#94a3b8',
              background: 'rgba(5, 10, 21, 0.85)',
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <span style={{ fontWeight: '700', color: '#ffffff', marginBottom: '2px' }}>Legend</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
              Job Location
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              Available Crane
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8' }} />
              On Job
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
              Not Available
            </span>
          </div>
        </div>
      </div>

      {/* 4 Stat Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <div className="cranzo-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Truck size={18} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff' }}>12</div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>Eligible Cranes</div>
          </div>
        </div>

        <div className="cranzo-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Compass size={18} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff' }}>8</div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>Within Matching Radius</div>
          </div>
        </div>

        <div className="cranzo-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileCheck size={18} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff' }}>10</div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>Documents Valid</div>
          </div>
        </div>

        <div className="cranzo-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={18} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff' }}>9</div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>Eligible Operators</div>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <div className="cranzo-filter-card">
        {/* Row 1 */}
        <div className="cranzo-filter-row">
          <div className="cranzo-filter-search-field">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search by Crane ID, Owner or Operator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="cranzo-filter-dropdown"
            value={craneTypeFilter}
            onChange={(e) => setCraneTypeFilter(e.target.value)}
          >
            <option value="All">Crane Type: All Types</option>
            <option value="Mobile Crane">Mobile Crane</option>
            <option value="Tower Crane">Tower Crane</option>
          </select>

          <select
            className="cranzo-filter-dropdown"
            value={capacityFilter}
            onChange={(e) => setCapacityFilter(e.target.value)}
          >
            <option value="50">50 Ton (Min)</option>
            <option value="60">60 Ton (Min)</option>
            <option value="100">100 Ton (Min)</option>
          </select>

          <select
            className="cranzo-filter-dropdown"
            value={distanceFilter}
            onChange={(e) => setDistanceFilter(e.target.value)}
          >
            <option value="20">Within 20 km</option>
            <option value="50">Within 50 km</option>
            <option value="100">Within 100 km</option>
          </select>

          <select
            className="cranzo-filter-dropdown"
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
          >
            <option value="Available">Availability: Available</option>
            <option value="All">All Statuses</option>
          </select>
        </div>

        {/* Row 2 */}
        <div className="cranzo-filter-row">
          <select
            className="cranzo-filter-dropdown"
            value={documentsFilter}
            onChange={(e) => setDocumentsFilter(e.target.value)}
          >
            <option value="Valid">Documents: Valid</option>
            <option value="All">All Documents</option>
          </select>

          <select
            className="cranzo-filter-dropdown"
            value={operatorFilter}
            onChange={(e) => setOperatorFilter(e.target.value)}
          >
            <option value="Eligible">Operator: Eligible</option>
            <option value="All">All Operators</option>
          </select>

          <select
            className="cranzo-filter-dropdown"
            value={gpsFilter}
            onChange={(e) => setGpsFilter(e.target.value)}
          >
            <option value="All">GPS Status: All</option>
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
          </select>

          <button
            type="button"
            className="cranzo-filter-reset-btn"
            onClick={resetFilters}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Eligible Cranes Table */}
      <div className="cranzo-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="cranzo-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: '36px', padding: '14px 12px 14px 18px' }}>
                  <input type="checkbox" checked readOnly />
                </th>
                <th style={{ width: '36px' }}>#</th>
                <th>Crane</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Distance</th>
                <th>Owner</th>
                <th>Operator</th>
                <th>Availability</th>
                <th>Documents</th>
                <th>GPS Status</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {cranesList.map((c) => {
                const isSelected = c.craneId === selectedCraneId;
                const isOnline = c.gps === 'Online';
                const isValidDoc = c.documents === 'Valid';
                const isAvailable = c.availability === 'Available';

                return (
                  <tr
                    key={c.id}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(245, 158, 11, 0.06)' : undefined,
                      borderLeft: isSelected ? '3px solid #f59e0b' : '3px solid transparent',
                    }}
                    onClick={() => setSelectedCraneId(c.craneId)}
                  >
                    <td style={{ padding: '14px 12px 14px 18px' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => setSelectedCraneId(c.craneId)}
                      />
                    </td>
                    <td style={{ color: '#64748b', fontSize: '12.5px' }}>{c.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={craneThumbnailImg}
                          alt={c.craneId}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '6px',
                            objectFit: 'cover',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#ffffff', fontWeight: '600', fontSize: '13px' }}>
                            {c.craneId}
                          </span>
                          <span style={{ color: '#64748b', fontSize: '10.5px' }}>
                            {c.regNumber}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#cbd5e1', fontSize: '13px' }}>{c.type}</td>
                    <td style={{ color: '#ffffff', fontWeight: '600', fontSize: '13px' }}>{c.capacity}</td>
                    <td>
                      <span
                        style={{
                          color: '#10b981',
                          fontWeight: '600',
                          fontSize: '12.5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <ArrowUpRight size={13} />
                        {c.distance}
                      </span>
                    </td>
                    <td style={{ color: '#ffffff', fontSize: '13px' }}>{c.owner}</td>
                    <td style={{ color: '#94a3b8', fontSize: '13px' }}>{c.operator}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          color: isAvailable ? '#10b981' : '#38bdf8',
                          background: isAvailable ? 'rgba(16, 185, 129, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                          border: `1px solid ${isAvailable ? 'rgba(16, 185, 129, 0.28)' : 'rgba(56, 189, 248, 0.28)'}`,
                        }}
                      >
                        {c.availability}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          color: isValidDoc ? '#10b981' : '#ef4444',
                          background: isValidDoc ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          border: `1px solid ${isValidDoc ? 'rgba(16, 185, 129, 0.28)' : 'rgba(239, 68, 68, 0.28)'}`,
                        }}
                      >
                        {isValidDoc ? '✔ Valid' : '● Expired'}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          color: isOnline ? '#10b981' : '#ef4444',
                          background: isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.28)' : 'rgba(239, 68, 68, 0.28)'}`,
                        }}
                      >
                        {c.gps}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => onSelectCraneDetails?.(c.craneId)}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#cbd5e1',
                            fontSize: '11.5px',
                            fontWeight: '600',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCraneId(c.craneId)}
                          style={{
                            background: isSelected ? '#f59e0b' : 'transparent',
                            border: `1px solid ${isSelected ? '#f59e0b' : 'rgba(245, 158, 11, 0.4)'}`,
                            color: isSelected ? '#070d1d' : '#f59e0b',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bottom Dock for Assignment */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '270px',
          right: '24px',
          background: '#070D17',
          border: '1px solid #142037',
          borderRadius: '14px',
          padding: '12px 24px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src={craneThumbnailImg}
              alt="Selected Crane"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                objectFit: 'cover',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>
                  {selectedCrane.craneId}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '600',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                  }}
                >
                  Eligible
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {selectedCrane.regNumber}
              </span>
            </div>
          </div>

          <div style={{ height: '30px', width: '1px', background: '#142037' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '12.5px' }}>
            <div>
              <span style={{ color: '#64748b', fontSize: '10.5px', display: 'block' }}>TYPE</span>
              <span style={{ color: '#ffffff', fontWeight: '600' }}>{selectedCrane.type}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '10.5px', display: 'block' }}>CAPACITY</span>
              <span style={{ color: '#ffffff', fontWeight: '600' }}>{selectedCrane.capacity}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '10.5px', display: 'block' }}>DISTANCE FROM JOB</span>
              <span style={{ color: '#10b981', fontWeight: '700' }}>{selectedCrane.distance}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '10.5px', display: 'block' }}>OWNER</span>
              <span style={{ color: '#ffffff', fontWeight: '500' }}>{selectedCrane.owner}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '10.5px', display: 'block' }}>OPERATOR</span>
              <span style={{ color: '#ffffff', fontWeight: '500' }}>{selectedCrane.operator}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => alert(`Crane ${selectedCrane.craneId} successfully assigned to booking #${bookingId}!`)}
          className="cranzo-btn-primary-amber"
          style={{ height: '42px', padding: '0 24px', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>Continue to Assignment</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
};
