import React from 'react';
import './Checkbox.css';
import { Check } from 'lucide-react';

/**
 * Pure React Custom Styled Checkbox Component
 */
export const Checkbox = ({
  id,
  name,
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <label
      htmlFor={id}
      className={`cranzo-checkbox-wrapper ${disabled ? 'cranzo-checkbox-wrapper--disabled' : ''} ${className}`}
    >
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="cranzo-checkbox-input"
        {...props}
      />
      <div className={`cranzo-checkbox-box ${checked ? 'cranzo-checkbox-box--checked' : ''}`}>
        {checked && <Check size={13} strokeWidth={3.5} className="cranzo-checkbox-icon" />}
      </div>
      {label && <span className="cranzo-checkbox-label">{label}</span>}
    </label>
  );
};

export default Checkbox;
