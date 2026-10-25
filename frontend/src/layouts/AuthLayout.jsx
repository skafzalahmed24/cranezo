import React from 'react';
import './AuthLayout.css';
import Logo from '../components/common/Logo/Logo';
import Card from '../components/common/Card/Card';
import backgroundImg from '../assets/background.png';

/**
 * Pure React AuthLayout Component
 */
export const AuthLayout = ({ children, onLogoClick }) => {
  return (
    <div
      className="cranzo-auth-layout"
      style={{ backgroundImage: `url(${backgroundImg})` }}
    >
      <main className="cranzo-auth-layout__container">
        <div className="cranzo-auth-layout__panel">
          <div className="cranzo-auth-layout__logo-container">
            <Logo size="lg" onClick={onLogoClick} />
          </div>

          <Card>{children}</Card>
        </div>
      </main>
    </div>
  );
};

export default AuthLayout;
