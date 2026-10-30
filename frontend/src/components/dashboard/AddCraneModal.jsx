import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  MapPin,
  Crosshair,
  Plus,
  Check,
  Truck,
} from 'lucide-react';

export const AddCraneModal = ({ isOpen, onClose, onCraneAdded }) => {
  const [craneType, setCraneType] = useState('');
  const [capacity, setCapacity] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [assignedOperator, setAssignedOperator] = useState('');
  const [location, setLocation] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [minHours, setMinHours] = useState('4');
  const [availabilityStatus, setAvailabilityStatus] = useState('Available');

  // Documents status
  const [rcUploaded, setRcUploaded] = useState(false);
  const [insuranceUploaded, setInsuranceUploaded] = useState(false);
  const [fitnessUploaded, setFitnessUploaded] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const newCrane = {
      id: Date.now(),
      craneId: regNumber ? `CRN-${regNumber.slice(-4).toUpperCase()}` : `CRN-${Math.floor(1000 + Math.random() * 9000)}`,
      regNumber: regNumber || 'TS-09-XY-9999',
      type: craneType || 'Mobile Crane',
      capacity: capacity ? `${capacity} Ton` : '50 Ton',
      owner: 'Cranzo Fleet Operations',
      operator: assignedOperator || 'Ravi Kumar',
      operatorId: 'OP-1001',
      location: location || 'Hyderabad, Telangana',
      gps: 'Online',
      availability: availabilityStatus,
      documents: rcUploaded && insuranceUploaded ? 'Verified' : 'Pending',
      status: availabilityStatus === 'Available' ? 'Available' : 'Attention',
    };

    onCraneAdded?.(newCrane);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(3, 7, 18, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          backgroundColor: '#080f20',
          border: '1px solid #142037',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
              Add Crane
            </h3>
            <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Register your crane with complete details.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '24px',
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            maxHeight: 'calc(90vh - 150px)',
          }}
        >
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. Crane Information */}
            <div
              style={{
                backgroundColor: '#050a15',
                border: '1px solid #142037',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  1
                </span>
                <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#ffffff' }}>
                  Crane Information
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '6px' }}>
                    Crane Type <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="cranzo-filter-dropdown"
                    value={craneType}
                    onChange={(e) => setCraneType(e.target.value)}
                    style={{ width: '100%', height: '38px', background: '#080f20' }}
                    required
                  >
                    <option value="">Select crane type</option>
                    <option value="Mobile Crane">Mobile Crane</option>
                    <option value="Tower Crane">Tower Crane</option>
                    <option value="Truck Crane">Truck Crane</option>
                    <option value="Crawler Crane">Crawler Crane</option>
                    <option value="Rough Terrain Crane">Rough Terrain Crane</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '6px' }}>
                    Capacity (Tons) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="cranzo-filter-dropdown"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    style={{ width: '100%', height: '38px', background: '#080f20' }}
                    required
                  >
                    <option value="">Select capacity</option>
                    <option value="20">20 Ton</option>
                    <option value="25">25 Ton</option>
                    <option value="30">30 Ton</option>
                    <option value="50">50 Ton</option>
                    <option value="60">60 Ton</option>
                    <option value="100">100 Ton</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '6px' }}>
                  Registration / ID <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Truck
                    size={15}
                    style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }}
                  />
                  <input
                    type="text"
                    placeholder="Enter registration number (e.g. TS-09-AB-1234)"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      background: '#080f20',
                      border: '1px solid #142037',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '13px',
                      padding: '0 12px 0 36px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>
              </div>
            </div>

            {/* 3. Documents */}
            <div
              style={{
                backgroundColor: '#050a15',
                border: '1px solid #142037',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  3
                </span>
                <div>
                  <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#ffffff' }}>
                    Documents
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
                    Upload required documents
                  </span>
                </div>
              </div>

              {/* RC Copy */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: '#080f20',
                  border: '1px solid #142037',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={16} style={{ color: '#f59e0b' }} />
                  <div>
                    <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#ffffff', display: 'block' }}>
                      RC Copy
                    </span>
                    <span style={{ fontSize: '10.5px', color: rcUploaded ? '#10b981' : '#64748b' }}>
                      {rcUploaded ? 'rc_registration.pdf' : 'Upload file'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRcUploaded(!rcUploaded)}
                  style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#f59e0b',
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {rcUploaded ? <Check size={14} style={{ color: '#10b981' }} /> : <Plus size={14} />}
                </button>
              </div>

              {/* Insurance */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: '#080f20',
                  border: '1px solid #142037',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={16} style={{ color: '#f59e0b' }} />
                  <div>
                    <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#ffffff', display: 'block' }}>
                      Insurance
                    </span>
                    <span style={{ fontSize: '10.5px', color: insuranceUploaded ? '#10b981' : '#64748b' }}>
                      {insuranceUploaded ? 'crane_insurance_2026.pdf' : 'Upload file'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInsuranceUploaded(!insuranceUploaded)}
                  style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#f59e0b',
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {insuranceUploaded ? <Check size={14} style={{ color: '#10b981' }} /> : <Plus size={14} />}
                </button>
              </div>

              {/* Fitness Certificate */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: '#080f20',
                  border: '1px solid #142037',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={16} style={{ color: '#f59e0b' }} />
                  <div>
                    <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#ffffff', display: 'block' }}>
                      Fitness Certificate
                    </span>
                    <span style={{ fontSize: '10.5px', color: fitnessUploaded ? '#10b981' : '#64748b' }}>
                      {fitnessUploaded ? 'fitness_cert.pdf' : 'Upload file'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFitnessUploaded(!fitnessUploaded)}
                  style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#f59e0b',
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {fitnessUploaded ? <Check size={14} style={{ color: '#10b981' }} /> : <Plus size={14} />}
                </button>
              </div>
            </div>

            {/* 6. Operator */}
            <div
              style={{
                backgroundColor: '#050a15',
                border: '1px solid #142037',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  6
                </span>
                <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#ffffff' }}>
                  Operator
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '6px' }}>
                  Assign Operator <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  className="cranzo-filter-dropdown"
                  value={assignedOperator}
                  onChange={(e) => setAssignedOperator(e.target.value)}
                  style={{ width: '100%', height: '38px', background: '#080f20' }}
                  required
                >
                  <option value="">Select operator</option>
                  <option value="Ravi Kumar">Ravi Kumar (OP-1001)</option>
                  <option value="Arun Kumar">Arun Kumar (OP-1002)</option>
                  <option value="Mahesh Reddy">Mahesh Reddy (OP-1003)</option>
                  <option value="Sandeep Rao">Sandeep Rao (OP-1004)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 2. Photos */}
            <div
              style={{
                backgroundColor: '#050a15',
                border: '1px solid #142037',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  2
                </span>
                <div>
                  <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#ffffff' }}>
                    Photos
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
                    Upload clear photos of your crane (Min 3 photos)
                  </span>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                style={{
                  border: '1px dashed #f59e0b',
                  borderRadius: '10px',
                  padding: '20px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(245, 158, 11, 0.03)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    color: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <UploadCloud size={20} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>
                  Upload Photos
                </span>
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Click to upload or drag and drop
                </span>
              </div>

              {/* 3 Photo slots */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div
                  style={{
                    height: '54px',
                    borderRadius: '8px',
                    background: '#080f20',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                  }}
                >
                  <FileText size={16} />
                </div>
                <div
                  style={{
                    height: '54px',
                    borderRadius: '8px',
                    background: '#080f20',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                  }}
                >
                  <FileText size={16} />
                </div>
                <div
                  style={{
                    height: '54px',
                    borderRadius: '8px',
                    background: '#080f20',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                  }}
                >
                  <FileText size={16} />
                </div>
              </div>
            </div>

            {/* 4. Location */}
            <div
              style={{
                backgroundColor: '#050a15',
                border: '1px solid #142037',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  4
                </span>
                <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#ffffff' }}>
                  Location
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '6px' }}>
                  Current Location <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <MapPin
                    size={15}
                    style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }}
                  />
                  <input
                    type="text"
                    placeholder="Enter location (City, State)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      background: '#080f20',
                      border: '1px solid #142037',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '13px',
                      padding: '0 36px 0 36px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                  <Crosshair
                    size={15}
                    style={{ position: 'absolute', right: '12px', top: '12px', color: '#f59e0b', cursor: 'pointer' }}
                    onClick={() => setLocation('Hyderabad, Telangana')}
                  />
                </div>
              </div>
            </div>

            {/* 5. Rate */}
            <div
              style={{
                backgroundColor: '#050a15',
                border: '1px solid #142037',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  5
                </span>
                <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#ffffff' }}>
                  Rate
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '6px' }}>
                    Hourly Rate (₹) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Enter hourly rate"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      background: '#080f20',
                      border: '1px solid #142037',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '13px',
                      padding: '0 12px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '6px' }}>
                    Minimum Hours <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Enter minimum hours"
                    value={minHours}
                    onChange={(e) => setMinHours(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      background: '#080f20',
                      border: '1px solid #142037',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '13px',
                      padding: '0 12px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>
              </div>
            </div>

            {/* 7. Availability */}
            <div
              style={{
                backgroundColor: '#050a15',
                border: '1px solid #142037',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  7
                </span>
                <div>
                  <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#ffffff' }}>
                    Availability
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
                    Initial Availability Status *
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAvailabilityStatus('Available')}
                  style={{
                    height: '38px',
                    borderRadius: '20px',
                    background: availabilityStatus === 'Available' ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                    border: `1px solid ${availabilityStatus === 'Available' ? '#f59e0b' : '#142037'}`,
                    color: availabilityStatus === 'Available' ? '#f59e0b' : '#94a3b8',
                    fontWeight: '600',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      border: `2px solid ${availabilityStatus === 'Available' ? '#f59e0b' : '#64748b'}`,
                      background: availabilityStatus === 'Available' ? '#f59e0b' : 'transparent',
                    }}
                  />
                  Available
                </button>

                <button
                  type="button"
                  onClick={() => setAvailabilityStatus('Not Available')}
                  style={{
                    height: '38px',
                    borderRadius: '20px',
                    background: availabilityStatus === 'Not Available' ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                    border: `1px solid ${availabilityStatus === 'Not Available' ? '#f59e0b' : '#142037'}`,
                    color: availabilityStatus === 'Not Available' ? '#f59e0b' : '#94a3b8',
                    fontWeight: '600',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      border: `2px solid ${availabilityStatus === 'Not Available' ? '#f59e0b' : '#64748b'}`,
                      background: availabilityStatus === 'Not Available' ? '#f59e0b' : 'transparent',
                    }}
                  />
                  Not Available
                </button>
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="cranzo-btn-secondary"
              style={{ height: '38px', padding: '0 18px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cranzo-btn-primary-amber"
              style={{ height: '38px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>Submit Crane</span>
              <span>→</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCraneModal;
