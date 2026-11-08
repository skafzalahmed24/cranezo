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
          : `${formData.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'}@cranezo-client.com`,
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
    <div className="cranezo-modal-backdrop" onClick={onClose}>
      <div
        className="cranezo-add-user-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="cranezo-modal-header-v2">
          <div>
            <h2 className="cranezo-modal-title-v2">Add User</h2>
            <p className="cranezo-modal-subtitle-v2">
              Create a new user for the Cranezo platform. Fill in the required details below.
            </p>
          </div>
          <button
            type="button"
            className="cranezo-modal-close-icon-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {isSuccess ? (
          <div className="cranezo-modal-success-state">
            <div className="cranezo-success-icon-bubble">
              <CheckCircle2 size={46} color="#10b981" />
            </div>
            <h3 className="cranezo-success-title">User Created Successfully!</h3>
            <p className="cranezo-success-desc">
              <strong>{formData.fullName}</strong> has been added to Cranezo client directory.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="cranezo-add-user-form">
            {/* Center: Profile Photo Upload */}
            <div className="cranezo-photo-upload-container">
              <span className="cranezo-photo-label">Profile Photo (Optional)</span>
              <span className="cranezo-photo-subtext">Add a profile photo for the user</span>

              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handlePhotoUpload}
              />

              <div
                className="cranezo-avatar-upload-circle"
                onClick={() => fileInputRef.current?.click()}
                title="Click to choose a photo"
              >
                {formData.photo ? (
                  <div className="cranezo-avatar-preview-box">
                    <img
                      src={formData.photo}
                      alt="Profile preview"
                      className="cranezo-avatar-preview-img"
                    />
                    <button
                      type="button"
                      className="cranezo-avatar-remove-btn"
                      onClick={handleRemovePhoto}
                      title="Remove photo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Camera size={22} className="cranezo-avatar-camera-icon" />
                    <span className="cranezo-avatar-add-text">Add Photo</span>
                  </>
                )}

                <div
                  className="cranezo-avatar-plus-badge"
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
              <div className="cranezo-form-error-banner">
                {errorMessage}
              </div>
            )}

            {/* Two Column Form Grid */}
            <div className="cranezo-form-two-cols">
              {/* LEFT COLUMN */}
              <div className="cranezo-form-col">
                {/* 1. Full Name */}
                <div className="cranezo-modal-field-group">
                  <label className="cranezo-modal-field-label">
                    Full Name <span className="cranezo-req-star">*</span>
                  </label>
                  <div className="cranezo-modal-input-box">
                    <User size={16} className="cranezo-field-icon" />
                    <input
                      type="text"
                      className="cranezo-modal-text-field"
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                    />
                  </div>
                </div>

                {/* 2. Mobile Number with Verified Pill */}
                <div className="cranezo-modal-field-group">
                  <label className="cranezo-modal-field-label">
                    Mobile Number <span className="cranezo-req-star">*</span>
                  </label>
                  <div className="cranezo-modal-input-box">
                    <Phone size={16} className="cranezo-field-icon" />
                    <input
                      type="tel"
                      className="cranezo-modal-text-field has-verified-badge"
                      placeholder="+91 98765 43210"
                      value={formData.mobileNumber}
                      onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                    />
                    <div
                      className={`cranezo-verified-badge ${formData.isVerified ? 'verified' : 'unverified'}`}
                      onClick={() => handleInputChange('isVerified', !formData.isVerified)}
                      title="Click to toggle verification status"
                    >
                      <Check size={12} strokeWidth={3} />
                      <span>{formData.isVerified ? 'Verified' : 'Verify'}</span>
                    </div>
                  </div>
                </div>

                {/* 3. User Type (Radio buttons) */}
                <div className="cranezo-modal-field-group">
                  <label className="cranezo-modal-field-label">
                    User Type <span className="cranezo-req-star">*</span>
                  </label>
                  <div className="cranezo-radio-options-row">
                    <label
                      className={`cranezo-radio-label ${formData.userType === 'Individual User' ? 'selected' : ''}`}
                      onClick={() => handleInputChange('userType', 'Individual User')}
                    >
                      <span className="cranezo-radio-circle">
                        {formData.userType === 'Individual User' && (
                          <span className="cranezo-radio-inner-dot" />
                        )}
                      </span>
                      <span>Individual User</span>
                    </label>

                    <label
                      className={`cranezo-radio-label ${formData.userType === 'Business User' ? 'selected' : ''}`}
                      onClick={() => handleInputChange('userType', 'Business User')}
                    >
                      <span className="cranezo-radio-circle">
                        {formData.userType === 'Business User' && (
                          <span className="cranezo-radio-inner-dot" />
                        )}
                      </span>
                      <span>Business User</span>
                    </label>
                  </div>
                </div>

                {/* 4. Company Name */}
                <div className="cranezo-modal-field-group">
                  <label className="cranezo-modal-field-label">
                    Company Name <span className="cranezo-req-star">*</span>
                  </label>
                  <div className="cranezo-modal-input-box">
                    <Building2 size={16} className="cranezo-field-icon" />
                    <input
                      type="text"
                      className="cranezo-modal-text-field"
                      placeholder="Enter your Company Name"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                    />
                  </div>
                </div>

                {/* 5. Company Address */}
                <div className="cranezo-modal-field-group">
                  <label className="cranezo-modal-field-label">
                    Company Address <span className="cranezo-req-star">*</span>
                  </label>
                  <div className="cranezo-modal-input-box">
                    <MapPin size={16} className="cranezo-field-icon" />
                    <input
                      type="text"
                      className="cranezo-modal-text-field"
                      placeholder="Enter your Company Address"
                      value={formData.companyAddress}
                      onChange={(e) => handleInputChange('companyAddress', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="cranezo-form-col">
                {/* 1. Constitution */}
                <div className="cranezo-modal-field-group">
                  <label className="cranezo-modal-field-label">
                    Constitution <span className="cranezo-req-star">*</span>
                  </label>
                  <div className="cranezo-modal-input-box">
                    <FileText size={16} className="cranezo-field-icon" />
                    <select
                      className="cranezo-modal-select-field"
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
                    <ChevronDown size={16} className="cranezo-select-arrow" />
                  </div>
                </div>

                {/* 2. Date of Establishment */}
                <div className="cranezo-modal-field-group">
                  <label className="cranezo-modal-field-label">
                    Date of Establishment <span className="cranezo-req-star">*</span>
                  </label>
                  <div className="cranezo-modal-input-box">
                    <Calendar size={16} className="cranezo-field-icon" />
                    <input
                      type="date"
                      className="cranezo-modal-text-field cranezo-modal-date-field"
                      value={formData.dateOfEstablishment}
                      onChange={(e) =>
                        handleInputChange('dateOfEstablishment', e.target.value)
                      }
                    />
                    <Calendar
                      size={16}
                      className="cranezo-date-right-icon"
                      onClick={(e) => {
                        const input = e.currentTarget.parentElement?.querySelector('input');
                        if (input) input.showPicker?.();
                      }}
                    />
                  </div>
                </div>

                {/* 3. GST Registration No. */}
                <div className="cranezo-modal-field-group">
                  <label className="cranezo-modal-field-label">
                    GST Registration No. <span className="cranezo-req-star">*</span>
                  </label>
                  <div className="cranezo-modal-input-box">
                    <Hash size={16} className="cranezo-field-icon" />
                    <input
                      type="text"
                      className="cranezo-modal-text-field"
                      placeholder="Enter GST registration number"
                      value={formData.gstNo}
                      onChange={(e) => handleInputChange('gstNo', e.target.value)}
                    />
                  </div>
                </div>

                {/* 4. Nature of Business */}
                <div className="cranezo-modal-field-group">
                  <label className="cranezo-modal-field-label">
                    Nature of Business <span className="cranezo-req-star">*</span>
                  </label>
                  <div className="cranezo-modal-input-box">
                    <Briefcase size={16} className="cranezo-field-icon" />
                    <select
                      className="cranezo-modal-select-field"
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
                    <ChevronDown size={16} className="cranezo-select-arrow" />
                  </div>
                </div>

                {/* 5. Name and Address of Directors / Partners */}
                <div className="cranezo-modal-field-group">
                  <label className="cranezo-modal-field-label">
                    Name and Address of Directors / Partners{' '}
                    <span className="cranezo-req-star">*</span>
                  </label>
                  <div className="cranezo-modal-input-box">
                    <Users size={16} className="cranezo-field-icon" />
                    <input
                      type="text"
                      className="cranezo-modal-text-field"
                      placeholder="Enter names, mobile no, tel. nos, email id ..."
                      value={formData.directorsDetails}
                      onChange={(e) =>
                        handleInputChange('directorsDetails', e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* 6. Accounts / Finance Head Details */}
                <div className="cranezo-modal-field-group">
                  <label className="cranezo-modal-field-label">
                    Accounts / Finance Head Details{' '}
                    <span className="cranezo-req-star">*</span>
                  </label>
                  <div className="cranezo-modal-input-box">
                    <UserCheck size={16} className="cranezo-field-icon" />
                    <input
                      type="text"
                      className="cranezo-modal-text-field"
                      placeholder="Enter name, mobile no, tel. nos and email id"
                      value={formData.financeDetails}
                      onChange={(e) =>
                        handleInputChange('financeDetails', e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* 7. Branch Offices Details */}
                <div className="cranezo-modal-field-group">
                  <label className="cranezo-modal-field-label">
                    Branch Offices Details <span className="cranezo-req-star">*</span>
                  </label>
                  <div className="cranezo-modal-input-box">
                    <GitFork size={16} className="cranezo-field-icon" />
                    <input
                      type="text"
                      className="cranezo-modal-text-field"
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
            <div className="cranezo-modal-footer-v2">
              <button
                type="button"
                className="cranezo-modal-cancel-btn"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="cranezo-modal-submit-btn"
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
