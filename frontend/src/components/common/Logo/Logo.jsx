import React from 'react';
import './Logo.css';
import logoImg from '../../../assets/logo.png';

/**
 * Pure React Cranezo Brand Logo Component
 */
export const Logo = ({
  size = 'md',
  onClick,
  className = '',
  alt = 'Cranezo Logo',
}) => {
  return (
    <div
      className={`cranezo-logo-wrapper cranezo-logo--${size} ${onClick ? 'cranezo-logo--clickable' : ''} ${className}`}
      onClick={onClick}
    >
      <img src={logoImg} alt={alt} className="cranezo-logo-img" />
    </div>
  );
};

export default Logo;
