import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Plus,
  User,
  Phone,
  Building2,
  MapPin,
  FileText,
  Calendar,
  Hash,
  Briefcase,
  Users,
  UserCheck,
  GitFork,
  ChevronDown,
  ArrowRight,
  Check,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

export const AddUserModal = ({ isOpen, onClose, onUserAdded }) => {
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    photo: null,
    fullName: '',
    mobileNumber: '+91 98765 43210',
    isVerified: true,
    userType: 'Business User', // Default as in Figma
    companyName: '',
    companyAddress: '',
    constitution: '',
    dateOfEstablishment: '',
    gstNo: '',
    natureOfBusiness: '',
    directorsDetails: '',
    financeDetails: '',
    branchOffices: '',
  });

  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errorMessage) setErrorMessage('');
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = (e) => {
    e.stopPropagation();
    setFormData((prev) => ({ ...prev, photo: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      setErrorMessage('Please enter the full name');
      return;
    }

    if (!formData.mobileNumber.trim()) {
      setErrorMessage('Please enter the mobile number');
      return;
    }

    if (formData.userType === 'Business User' && !formData.companyName.trim()) {
      setErrorMessage('Please enter the company name');
      return;
    }

    // Prepare new user payload
    const newUserId = `USR-${Math.floor(10255 + Math.random() * 900)}`;
    const newUser = {
      id: Date.now(),
      userId: newUserId,
      name: formData.fullName.trim(),
      email:
        formData.financeDetails?.includes('@')
          ? formData.financeDetails
          : `${formData.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'}@cranzo-client.com`,
      contact: formData.mobileNumber.trim(),
      location: formData.companyAddress?.trim() || 'Hyderabad',
      company: formData.companyName.trim() || 'Individual Client',
      constitution: formData.constitution || 'Private Limited Company (Pvt Ltd)',
      gstNo: formData.gstNo || '36AABCU9603R1ZM',
      natureOfBusiness: formData.natureOfBusiness || 'Crane Rental / Hiring',
      userType: formData.userType,
      photo: formData.photo,
      bookings: 0,
      totalSpent: '₹ 0',
      joined: 'Oct 2026',
      status: 'Active',
      statusClass: 'active',
    };

    setIsSuccess(true);

    setTimeout(() => {
      if (onUserAdded) {
        onUserAdded(newUser);
      }
      setIsSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div className="cranzo-modal-backdrop" onClick={onClose}>
      <div
        className="cranzo-add-user-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="cranzo-modal-header-v2">
          <div>
            <h2 className="cranzo-modal-title-v2">Add User</h2>
            <p className="cranzo-modal-subtitle-v2">
              Create a new user for the Cranzo platform. Fill in the required details below.
            </p>
          </div>
          <button
            type="button"
            className="cranzo-modal-close-icon-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {isSuccess ? (
          <div className="cranzo-modal-success-state">
            <div className="cranzo-success-icon-bubble">
              <CheckCircle2 size={46} color="#10b981" />
            </div>
            <h3 className="cranzo-success-title">User Created Successfully!</h3>
            <p className="cranzo-success-desc">
              <strong>{formData.fullName}</strong> has been added to Cranzo client directory.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="cranzo-add-user-form">
            {/* Center: Profile Photo Upload */}
            <div className="cranzo-photo-upload-container">
              <span className="cranzo-photo-label">Profile Photo (Optional)</span>
              <span className="cranzo-photo-subtext">Add a profile photo for the user</span>

              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handlePhotoUpload}
              />

              <div
                className="cranzo-avatar-upload-circle"
                onClick={() => fileInputRef.current?.click()}
                title="Click to choose a photo"
              >
                {formData.photo ? (
                  <div className="cranzo-avatar-preview-box">
                    <img
                      src={formData.photo}
                      alt="Profile preview"
                      className="cranzo-avatar-preview-img"
                    />
                    <button
                      type="button"
                      className="cranzo-avatar-remove-btn"
                      onClick={handleRemovePhoto}
                      title="Remove photo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Camera size={22} className="cranzo-avatar-camera-icon" />
                    <span className="cranzo-avatar-add-text">Add Photo</span>
                  </>
                )}

                <div
                  className="cranzo-avatar-plus-badge"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <Plus size={14} strokeWidth={2.6} />
                </div>
              </div>
            </div>

            {/* Error Notification Banner if any */}
            {errorMessage && (
              <div className="cranzo-form-error-banner">
                {errorMessage}
              </div>
            )}

            {/* Two Column Form Grid */}
            <div className="cranzo-form-two-cols">
              {/* LEFT COLUMN */}
              <div className="cranzo-form-col">
                {/* 1. Full Name */}
                <div className="cranzo-modal-field-group">
                  <label className="cranzo-modal-field-label">
                    Full Name <span className="cranzo-req-star">*</span>
                  </label>
                  <div className="cranzo-modal-input-box">
                    <User size={16} className="cranzo-field-icon" />
                    <input
                      type="text"
                      className="cranzo-modal-text-field"
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                    />
                  </div>
                </div>

                {/* 2. Mobile Number with Verified Pill */}
                <div className="cranzo-modal-field-group">
                  <label className="cranzo-modal-field-label">
                    Mobile Number <span className="cranzo-req-star">*</span>
                  </label>
                  <div className="cranzo-modal-input-box">
                    <Phone size={16} className="cranzo-field-icon" />
                    <input
                      type="tel"
                      className="cranzo-modal-text-field has-verified-badge"
                      placeholder="+91 98765 43210"
                      value={formData.mobileNumber}
                      onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                    />
                    <div
                      className={`cranzo-verified-badge ${formData.isVerified ? 'verified' : 'unverified'}`}
                      onClick={() => handleInputChange('isVerified', !formData.isVerified)}
                      title="Click to toggle verification status"
                    >
                      <Check size={12} strokeWidth={3} />
                      <span>{formData.isVerified ? 'Verified' : 'Verify'}</span>
                    </div>
                  </div>
                </div>

                {/* 3. User Type (Radio buttons) */}
                <div className="cranzo-modal-field-group">
                  <label className="cranzo-modal-field-label">
                    User Type <span className="cranzo-req-star">*</span>
                  </label>
                  <div className="cranzo-radio-options-row">
                    <label
                      className={`cranzo-radio-label ${formData.userType === 'Individual User' ? 'selected' : ''}`}
                      onClick={() => handleInputChange('userType', 'Individual User')}
                    >
                      <span className="cranzo-radio-circle">
                        {formData.userType === 'Individual User' && (
                          <span className="cranzo-radio-inner-dot" />
                        )}
                      </span>
                      <span>Individual User</span>
                    </label>

                    <label
                      className={`cranzo-radio-label ${formData.userType === 'Business User' ? 'selected' : ''}`}
                      onClick={() => handleInputChange('userType', 'Business User')}
                    >
                      <span className="cranzo-radio-circle">
                        {formData.userType === 'Business User' && (
                          <span className="cranzo-radio-inner-dot" />
                        )}
                      </span>
                      <span>Business User</span>
                    </label>
                  </div>
                </div>

                {/* 4. Company Name */}
                <div className="cranzo-modal-field-group">
                  <label className="cranzo-modal-field-label">
                    Company Name <span className="cranzo-req-star">*</span>
                  </label>
                  <div className="cranzo-modal-input-box">
                    <Building2 size={16} className="cranzo-field-icon" />
                    <input
                      type="text"
                      className="cranzo-modal-text-field"
                      placeholder="Enter your Company Name"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                    />
                  </div>
                </div>

                {/* 5. Company Address */}
                <div className="cranzo-modal-field-group">
                  <label className="cranzo-modal-field-label">
                    Company Address <span className="cranzo-req-star">*</span>
                  </label>
                  <div className="cranzo-modal-input-box">
                    <MapPin size={16} className="cranzo-field-icon" />
                    <input
                      type="text"
                      className="cranzo-modal-text-field"
                      placeholder="Enter your Company Address"
                      value={formData.companyAddress}
                      onChange={(e) => handleInputChange('companyAddress', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="cranzo-form-col">
                {/* 1. Constitution */}
                <div className="cranzo-modal-field-group">
                  <label className="cranzo-modal-field-label">
                    Constitution <span className="cranzo-req-star">*</span>
                  </label>
                  <div className="cranzo-modal-input-box">
                    <FileText size={16} className="cranzo-field-icon" />
                    <select
                      className="cranzo-modal-select-field"
                      value={formData.constitution}
                      onChange={(e) => handleInputChange('constitution', e.target.value)}
                    >
                      <option value="">Select constitution</option>
                      <option value="Sole Proprietorship">Sole Proprietorship</option>
                      <option value="Partnership">Partnership</option>
                      <option value="Private Limited Company (Pvt Ltd)">
                        Private Limited Company (Pvt Ltd)
                      </option>
                      <option value="Public Limited Company (Ltd)">
                        Public Limited Company (Ltd)
                      </option>
                      <option value="Limited Liability Partnership (LLP)">
                        Limited Liability Partnership (LLP)
                      </option>
                      <option value="One Person Company (OPC)">One Person Company (OPC)</option>
                    </select>
                    <ChevronDown size={16} className="cranzo-select-arrow" />
                  </div>
                </div>

                {/* 2. Date of Establishment */}
                <div className="cranzo-modal-field-group">
                  <label className="cranzo-modal-field-label">
                    Date of Establishment <span className="cranzo-req-star">*</span>
                  </label>
                  <div className="cranzo-modal-input-box">
                    <Calendar size={16} className="cranzo-field-icon" />
                    <input
                      type="date"
                      className="cranzo-modal-text-field cranzo-modal-date-field"
                      value={formData.dateOfEstablishment}
                      onChange={(e) =>
                        handleInputChange('dateOfEstablishment', e.target.value)
                      }
                    />
                    <Calendar
                      size={16}
                      className="cranzo-date-right-icon"
                      onClick={(e) => {
                        const input = e.currentTarget.parentElement?.querySelector('input');
                        if (input) input.showPicker?.();
                      }}
                    />
                  </div>
                </div>

                {/* 3. GST Registration No. */}
                <div className="cranzo-modal-field-group">
                  <label className="cranzo-modal-field-label">
                    GST Registration No. <span className="cranzo-req-star">*</span>
                  </label>
                  <div className="cranzo-modal-input-box">
                    <Hash size={16} className="cranzo-field-icon" />
                    <input
                      type="text"
                      className="cranzo-modal-text-field"
                      placeholder="Enter GST registration number"
                      value={formData.gstNo}
                      onChange={(e) => handleInputChange('gstNo', e.target.value)}
                    />
                  </div>
                </div>

                {/* 4. Nature of Business */}
                <div className="cranzo-modal-field-group">
                  <label className="cranzo-modal-field-label">
                    Nature of Business <span className="cranzo-req-star">*</span>
                  </label>
                  <div className="cranzo-modal-input-box">
                    <Briefcase size={16} className="cranzo-field-icon" />
                    <select
                      className="cranzo-modal-select-field"
                      value={formData.natureOfBusiness}
                      onChange={(e) =>
                        handleInputChange('natureOfBusiness', e.target.value)
                      }
                    >
                      <option value="">Select nature of business</option>
                      <option value="Crane Rental / Hiring">Crane Rental / Hiring</option>
                      <option value="Heavy Equipment Leasing">
                        Heavy Equipment Leasing
                      </option>
                      <option value="Infrastructure Construction">
                        Infrastructure Construction
                      </option>
                      <option value="Industrial Manufacturing">
                        Industrial Manufacturing
                      </option>
                      <option value="Logistics & Transport">Logistics & Transport</option>
                      <option value="Civil Engineering & Contracting">
                        Civil Engineering & Contracting
                      </option>
                      <option value="Trading & Supply">Trading & Supply</option>
                    </select>
                    <ChevronDown size={16} className="cranzo-select-arrow" />
                  </div>
                </div>

                {/* 5. Name and Address of Directors / Partners */}
                <div className="cranzo-modal-field-group">
                  <label className="cranzo-modal-field-label">
                    Name and Address of Directors / Partners{' '}
                    <span className="cranzo-req-star">*</span>
                  </label>
                  <div className="cranzo-modal-input-box">
                    <Users size={16} className="cranzo-field-icon" />
                    <input
                      type="text"
                      className="cranzo-modal-text-field"
                      placeholder="Enter names, mobile no, tel. nos, email id ..."
                      value={formData.directorsDetails}
                      onChange={(e) =>
                        handleInputChange('directorsDetails', e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* 6. Accounts / Finance Head Details */}
                <div className="cranzo-modal-field-group">
                  <label className="cranzo-modal-field-label">
                    Accounts / Finance Head Details{' '}
                    <span className="cranzo-req-star">*</span>
                  </label>
                  <div className="cranzo-modal-input-box">
                    <UserCheck size={16} className="cranzo-field-icon" />
                    <input
                      type="text"
                      className="cranzo-modal-text-field"
                      placeholder="Enter name, mobile no, tel. nos and email id"
                      value={formData.financeDetails}
                      onChange={(e) =>
                        handleInputChange('financeDetails', e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* 7. Branch Offices Details */}
                <div className="cranzo-modal-field-group">
                  <label className="cranzo-modal-field-label">
                    Branch Offices Details <span className="cranzo-req-star">*</span>
                  </label>
                  <div className="cranzo-modal-input-box">
                    <GitFork size={16} className="cranzo-field-icon" />
                    <input
                      type="text"
                      className="cranzo-modal-text-field"
                      placeholder="Enter branch office details (location, address, contact info)"
                      value={formData.branchOffices}
                      onChange={(e) =>
                        handleInputChange('branchOffices', e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="cranzo-modal-footer-v2">
              <button
                type="button"
                className="cranzo-modal-cancel-btn"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="cranzo-modal-submit-btn"
              >
                <span>Add User</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddUserModal;
