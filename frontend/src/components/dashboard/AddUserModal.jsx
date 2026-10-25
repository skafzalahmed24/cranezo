import React, { useState } from 'react';
import { X, UserPlus, CheckCircle2 } from 'lucide-react';

export const AddUserModal = ({ isOpen, onClose, onUserAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact: '+91 ',
    location: 'Hyderabad',
    status: 'Active',
  });
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    setIsSuccess(true);
    setTimeout(() => {
      if (onUserAdded) {
        onUserAdded(formData);
      }
      setIsSuccess(false);
      onClose();
    }, 700);
  };

  return (
    <div className="cranzo-modal-backdrop" onClick={onClose}>
      <div
        className="cranzo-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cranzo-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserPlus size={18} />
            </div>
            <h3 className="cranzo-modal-title">Add New User</h3>
          </div>
          <button
            type="button"
            className="cranzo-modal-close-btn"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {isSuccess ? (
          <div
            style={{
              padding: '24px 0',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <CheckCircle2 size={44} color="#10b981" />
            <h4 style={{ color: '#ffffff', fontSize: '16px' }}>User Registered Successfully!</h4>
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>The customer record has been created in Cranzo.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="cranzo-form-row">
              <label className="cranzo-form-label">Full Name *</label>
              <input
                type="text"
                required
                className="cranzo-form-input"
                placeholder="e.g. Ramesh Chandra"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="cranzo-form-row">
              <label className="cranzo-form-label">Email Address *</label>
              <input
                type="email"
                required
                className="cranzo-form-input"
                placeholder="e.g. ramesh@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="cranzo-form-row">
              <label className="cranzo-form-label">Phone Contact Number</label>
              <input
                type="tel"
                className="cranzo-form-input"
                placeholder="+91 98765 00000"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="cranzo-form-row">
                <label className="cranzo-form-label">Primary Location</label>
                <select
                  className="cranzo-form-input"
                  style={{ cursor: 'pointer' }}
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                >
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Vijayawada">Vijayawada</option>
                  <option value="Bengaluru">Bengaluru</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Pune">Pune</option>
                  <option value="Ahmedabad">Ahmedabad</option>
                </select>
              </div>

              <div className="cranzo-form-row">
                <label className="cranzo-form-label">Initial Status</label>
                <select
                  className="cranzo-form-input"
                  style={{ cursor: 'pointer' }}
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>
            </div>

            <div className="cranzo-modal-actions">
              <button
                type="button"
                className="cranzo-btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="cranzo-btn-primary-amber"
              >
                Create User
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddUserModal;
