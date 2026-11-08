import React from 'react';
import './Button.css';
import { Loader2 } from 'lucide-react';

/**
 * Pure React Button Component
 */
export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  isLoading = false,
  disabled = false,
  icon = null,
  iconPosition = 'right',
  onClick,
  className = '',
  id,
  ...props
}) => {
  const buttonClasses = [
    'cranezo-btn',
    `cranezo-btn--${variant}`,
    isLoading ? 'cranezo-btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      id={id}
      type={type}
      className={buttonClasses}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading ? (
        <span className="cranezo-btn__content">
          <Loader2 size={18} className="animate-spin" />
          <span>Processing...</span>
        </span>
      ) : (
        <span className="cranezo-btn__content">
          {icon && iconPosition === 'left' && <span className="cranezo-btn__icon">{icon}</span>}
          <span>{children}</span>
          {icon && iconPosition === 'right' && <span className="cranezo-btn__icon">{icon}</span>}
        </span>
      )}
    </button>
  );
};

export default Button;
