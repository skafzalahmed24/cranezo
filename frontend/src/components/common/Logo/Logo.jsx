import React from 'react';
import './Logo.css';
import logoImg from '../../../assets/logo.png';

/**
 * Pure React Cranzo Brand Logo Component
 */
export const Logo = ({
  size = 'md',
  onClick,
  className = '',
  alt = 'Cranzo Logo',
}) => {
  return (
    <div
      className={`cranzo-logo-wrapper cranzo-logo--${size} ${onClick ? 'cranzo-logo--clickable' : ''} ${className}`}
      onClick={onClick}
    >
      <img src={logoImg} alt={alt} className="cranzo-logo-img" />
    </div>
  );
};

export default Logo;
