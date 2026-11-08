import React, { useState, useEffect } from 'react';
import AuthLayout from './layouts/AuthLayout';
import { LoginPage, ForgotPasswordPage } from './pages';
import SiteRouter, { SITE_PATHS } from './site/SiteRouter';
import DashboardLayout from './components/dashboard/DashboardLayout';
import { AUTH_EXPIRED_EVENT } from './utils/api';

function App() {
  const [currentPath, setCurrentPath] = useState(() => {
    return window.location.pathname || '/';
  });

  const [userSession, setUserSession] = useState(() => {
    try {
      const saved = localStorage.getItem('cranzo_admin');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Keep state synchronized with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  const handleLoginSuccess = (userData) => {
    setUserSession(userData);
    navigate('/admin/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('cranzo_token');
    localStorage.removeItem('cranzo_admin');
    setUserSession(null);
    navigate('/admin/login');
  };

  // The API answered 401 (token expired or invalid): drop the session and show the login page
  useEffect(() => {
    const onAuthExpired = () => {
      setUserSession(null);
      window.history.replaceState({}, '', '/admin/login');
      setCurrentPath('/admin/login');
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
  }, []);

  // Route 1: the public website: Home, About, Contact, Privacy and Terms
  const sitePath = currentPath.length > 1 ? currentPath.replace(/\/+$/, '') : currentPath;
  if (SITE_PATHS.includes(sitePath)) {
    return <SiteRouter path={sitePath} onNavigate={navigate} />;
  }

  // everything below is the admin panel
  document.title = 'Cranezo | Admin Portal';

  // Route 2: Admin Dashboard at "/admin/dashboard" or "/admin"
  if (currentPath === '/admin/dashboard' || currentPath === '/admin') {
    const token = localStorage.getItem('cranzo_token');
    // If not logged in, route to login
    if (!token && !userSession) {
      navigate('/admin/login');
      return null;
    }

    return (
      <DashboardLayout
        userSession={
          userSession || {
            name: 'Admin',
            role: 'Super Admin',
            email: 'superadmin@cranzo.com',
          }
        }
        onLogout={handleLogout}
      />
    );
  }

  // Route 3: Forgot Password at "/admin/forgot-password"
  if (currentPath === '/admin/forgot-password') {
    return (
      <AuthLayout onLogoClick={() => navigate('/')}>
        <ForgotPasswordPage
          onNavigateToLogin={() => navigate('/admin/login')}
        />
      </AuthLayout>
    );
  }

  // Route 4: Admin Login at "/admin/login" (default for all /admin routes)
  return (
    <AuthLayout onLogoClick={() => navigate('/')}>
      <LoginPage
        onNavigateToForgotPassword={() => navigate('/admin/forgot-password')}
        onLoginSuccess={handleLoginSuccess}
      />
    </AuthLayout>
  );
}

export default App;
