import React from 'react';
import LoginForm from '../components/auth/LoginForm';

/**
 * LoginPage Page Component
 */
export const LoginPage = ({ onNavigateToForgotPassword, onLoginSuccess }) => {
  return (
    <LoginForm
      onForgotPassword={onNavigateToForgotPassword}
      onLoginSuccess={onLoginSuccess}
    />
  );
};

export default LoginPage;
