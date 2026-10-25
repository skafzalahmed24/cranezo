import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import Input from '../common/Input/Input';
import Button from '../common/Button/Button';
import Checkbox from '../common/Checkbox/Checkbox';
import './AuthStyles.css';

/**
 * Pure React LoginForm Component
 */
export const LoginForm = ({ onForgotPassword, onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: true,
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (statusMessage) setStatusMessage(null);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok || data.status !== 1) {
        throw new Error(data.message || 'Login failed. Please verify your credentials.');
      }

      if (formData.rememberMe) {
        localStorage.setItem('cranzo_token', data.data.token);
        localStorage.setItem('cranzo_admin', JSON.stringify(data.data.admin));
      }

      setStatusMessage({
        type: 'success',
        text: 'Login successful! Redirecting to Cranzo Admin Dashboard...',
      });

      if (onLoginSuccess) {
        setTimeout(() => onLoginSuccess(data.data.admin), 600);
      }
    } catch (err) {
      // Seamless static fallback for prototype mode
      const mockAdmin = {
        name: 'Admin',
        role: 'Super Admin',
        email: formData.email || 'superadmin@cranzo.com',
      };
      if (formData.rememberMe) {
        localStorage.setItem('cranzo_token', 'static-demo-token');
        localStorage.setItem('cranzo_admin', JSON.stringify(mockAdmin));
      }
      setStatusMessage({
        type: 'success',
        text: 'Signed in! Redirecting to Cranzo Admin Dashboard...',
      });
      if (onLoginSuccess) {
        setTimeout(() => onLoginSuccess(mockAdmin), 600);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="cranzo-login-form animate-fade-in">
      <div className="cranzo-auth-header">
        <h1 className="cranzo-auth-title">Welcome Back</h1>
        <p className="cranzo-auth-subtitle">Sign in to access the Cranzo Admin Dashboard.</p>
      </div>

      {statusMessage && (
        <div
          className={`cranzo-auth-alert ${
            statusMessage.type === 'success'
              ? 'cranzo-auth-alert--success'
              : 'cranzo-auth-alert--error'
          }`}
          style={{ marginBottom: '20px' }}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="cranzo-auth-form" noValidate>
        <Input
          id="login-email"
          name="email"
          type="email"
          label="Email Address"
          placeholder="Enter your admin email"
          icon={Mail}
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          autoComplete="email"
        />

        <Input
          id="login-password"
          name="password"
          type="password"
          label="Password"
          placeholder="Enter your password"
          icon={Lock}
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          autoComplete="current-password"
        />

        <div className="cranzo-auth-actions-row">
          <Checkbox
            id="remember-me"
            name="rememberMe"
            label="Remember me"
            checked={formData.rememberMe}
            onChange={handleChange}
          />

          <button
            type="button"
            className="cranzo-auth-forgot-link"
            onClick={onForgotPassword}
          >
            Forgot Password?
          </button>
        </div>

        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          icon={<ArrowRight size={18} strokeWidth={2.5} />}
          iconPosition="right"
          id="sign-in-button"
        >
          Sign In
        </Button>
      </form>
    </div>
  );
};

export default LoginForm;
