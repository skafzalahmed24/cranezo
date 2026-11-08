import React from 'react';
import './Card.css';

/**
 * Pure React Glassmorphism Card Container
 */
export const Card = ({ children, className = '', ...props }) => {
  return (
    <div className={`cranezo-card animate-fade-in ${className}`} {...props}>
      <div className="cranezo-card__inner">{children}</div>
    </div>
  );
};

export default Card;
