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
      className={`cranezo-checkbox-wrapper ${disabled ? 'cranezo-checkbox-wrapper--disabled' : ''} ${className}`}
    >
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="cranezo-checkbox-input"
        {...props}
      />
      <div className={`cranezo-checkbox-box ${checked ? 'cranezo-checkbox-box--checked' : ''}`}>
        {checked && <Check size={13} strokeWidth={3.5} className="cranezo-checkbox-icon" />}
      </div>
      {label && <span className="cranezo-checkbox-label">{label}</span>}
    </label>
  );
};

export default Checkbox;
