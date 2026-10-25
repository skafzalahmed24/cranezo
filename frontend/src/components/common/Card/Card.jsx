import React from 'react';
import './Card.css';

/**
 * Pure React Glassmorphism Card Container
 */
export const Card = ({ children, className = '', ...props }) => {
  return (
    <div className={`cranzo-card animate-fade-in ${className}`} {...props}>
      <div className="cranzo-card__inner">{children}</div>
    </div>
  );
};

export default Card;
