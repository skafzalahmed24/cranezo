import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import Input from '../common/Input/Input';
import Button from '../common/Button/Button';
import './AuthStyles.css';

/**
 * Pure React ForgotPasswordForm Component
 */
export const ForgotPasswordForm = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      setError('Email address is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1200);
  };

  const handleResend = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="cranzo-forgot-password-form animate-fade-in">
      {/* Top Golden Lock Badge */}
      <div className="cranzo-lock-badge-container">
        <div className="cranzo-lock-badge">
          <Lock size={32} strokeWidth={2.2} />
        </div>
      </div>

      {!isSubmitted ? (
        <>
          <div className="cranzo-auth-header cranzo-auth-header--centered">
            <h1 className="cranzo-auth-title">Forgot Password?</h1>
            <p className="cranzo-auth-subtitle">
              Enter your registered admin email address and we'll send you a secure link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="cranzo-auth-form" noValidate>
            <Input
              id="forgot-email"
              name="email"
              type="email"
              label="Email Address"
              placeholder="Enter your admin email"
              icon={Mail}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              error={error}
              autoComplete="email"
            />

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              icon={<ArrowRight size={18} strokeWidth={2.5} />}
              iconPosition="right"
              id="next-button"
            >
              Next
            </Button>

            <div className="cranzo-auth-divider">
              <span className="cranzo-auth-divider-text">or</span>
            </div>

            <button
              type="button"
              className="cranzo-auth-back-btn"
              onClick={onBackToLogin}
            >
              <ArrowLeft size={16} strokeWidth={2.2} />
              <span>Back to Login</span>
            </button>
          </form>
        </>
      ) : (
        <div className="cranzo-reset-success animate-fade-in" style={{ textAlign: 'center' }}>
          <div className="cranzo-auth-header cranzo-auth-header--centered">
            <h1 className="cranzo-auth-title">Check Your Email</h1>
            <p className="cranzo-auth-subtitle">
              We've dispatched password reset instructions to{' '}
              <strong style={{ color: 'var(--brand-orange-primary)' }}>{email}</strong>.
            </p>
          </div>

          <div
            className="cranzo-auth-alert cranzo-auth-alert--success"
            style={{ marginBottom: '24px', justifyContent: 'center' }}
          >
            <CheckCircle2 size={18} />
            <span>Reset link successfully dispatched!</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Button
              type="button"
              variant="primary"
              onClick={onBackToLogin}
              icon={<ArrowLeft size={18} />}
              iconPosition="left"
            >
              Return to Sign In
            </Button>

            <Button
              type="button"
              variant="ghost"
              isLoading={isLoading}
              onClick={handleResend}
              icon={<RefreshCw size={14} />}
              iconPosition="left"
            >
              Resend verification email
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgotPasswordForm;
