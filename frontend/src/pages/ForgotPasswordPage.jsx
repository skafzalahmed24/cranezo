import React from 'react';
import ForgotPasswordForm from '../components/auth/ForgotPasswordForm';

/**
 * ForgotPasswordPage Page Component
 */
export const ForgotPasswordPage = ({ onNavigateToLogin }) => {
  return (
    <ForgotPasswordForm onBackToLogin={onNavigateToLogin} />
  );
};

export default ForgotPasswordPage;
