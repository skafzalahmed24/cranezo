import React, { useState } from 'react';
import './Input.css';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

/**
 * Pure React Input Component
 */
export const Input = ({
  id,
  name,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  icon: IconComponent,
  disabled = false,
  autoComplete,
  className = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = type === 'password';
  const effectiveType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`cranzo-input-group ${error ? 'cranzo-input-group--error' : ''} ${className}`}>
      {label && (
        <label htmlFor={id} className="cranzo-input-label">
          {label}
        </label>
      )}

      <div className="cranzo-input-wrapper">
        {IconComponent && (
          <span className="cranzo-input-icon cranzo-input-icon--left">
            <IconComponent size={18} />
          </span>
        )}

        <input
          id={id}
          name={name}
          type={effectiveType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`cranzo-input ${IconComponent ? 'cranzo-input--has-left-icon' : ''} ${
            isPasswordType ? 'cranzo-input--has-right-icon' : ''
          }`}
          {...props}
        />

        {isPasswordType && (
          <button
            type="button"
            className="cranzo-input-toggle-btn"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error && (
        <div className="cranzo-input-error-msg">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default Input;
