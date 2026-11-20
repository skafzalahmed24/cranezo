import React, { useState } from 'react';
import { call, saveSession } from './ownerApi';

/** Owner: mobile OTP. Employee: email and password, or register with the owner's ID. */
export default function OwnerAuth({ onSignedIn, onHome }) {
  const [mode, setMode] = useState('owner'); // owner | employee | register
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // owner
  const [phone, setPhone] = useState('');
  const [otpUser, setOtpUser] = useState(null);
  const [otp, setOtp] = useState('');
  // employee
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reg, setReg] = useState({ owner_id: '', full_name: '', email: '', mobile_number: '', password: '' });

  const run = async (fn) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = () => run(async () => {
    const res = await call('/owner-portal/owner/otp', { phone_number: phone.replace(/\D/g, ''), country_code: '+91' }, { auth: false });
    setOtpUser(res.data.user_id);
    setNotice('We sent a code to your phone.');
  });

  const verifyOtp = () => run(async () => {
    const res = await call('/auth/verifyOtp', { user_id: otpUser, otp_number: otp }, { auth: false });
    const d = res.data;
    if (d.role_id !== 1) throw new Error('This number is not a crane owner account.');
    saveSession(d.access_token, { kind: 'owner', name: d.company_name || d.full_name || 'Owner', member_id: d.member_id, permissions: ['*'] });
    onSignedIn();
  });

  const staffLogin = () => run(async () => {
    const res = await call('/owner-portal/staff/login', { email, password }, { auth: false });
    const d = res.data;
    saveSession(d.token, { kind: 'staff', name: d.staff.full_name, owner_name: d.owner.name, permissions: d.staff.permissions });
    onSignedIn();
  });

  const register = () => run(async () => {
    const res = await call('/owner-portal/staff/register', reg, { auth: false });
    setNotice(res.data.message);
    setMode('employee');
    setEmail(reg.email);
  });

  return (
    <div className="op-auth">
      <div className="op-auth-card">
        <button type="button" className="op-link" onClick={onHome}>← cranezo.com</button>
        <h1>Cranezo for owners</h1>
        <p className="op-muted">Manage your cranes, jobs, payments and team on the web.</p>

        <div className="op-tabs">
          <button type="button" className={mode === 'owner' ? 'on' : ''} onClick={() => { setMode('owner'); setError(''); }}>Owner</button>
          <button type="button" className={mode === 'employee' ? 'on' : ''} onClick={() => { setMode('employee'); setError(''); }}>Employee</button>
          <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setError(''); }}>Join a team</button>
        </div>

        {error && <div className="op-alert bad">{error}</div>}
        {notice && <div className="op-alert ok">{notice}</div>}

        {mode === 'owner' && (
          <div className="op-form">
            <label>Mobile number<input inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10 digit number" disabled={!!otpUser} /></label>
            {otpUser && <label>Code<input inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digit code" /></label>}
            <button type="button" className="op-btn" disabled={busy || (otpUser ? otp.length < 4 : phone.replace(/\D/g, '').length < 6)} onClick={otpUser ? verifyOtp : sendOtp}>
              {busy ? 'Please wait…' : otpUser ? 'Sign in' : 'Send code'}
            </button>
            <p className="op-muted small">Signing in here signs you out of the app on your phone (one device at a time).</p>
          </div>
        )}

        {mode === 'employee' && (
          <div className="op-form">
            <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <button type="button" className="op-btn" disabled={busy || !email || !password} onClick={staffLogin}>{busy ? 'Please wait…' : 'Sign in'}</button>
          </div>
        )}

        {mode === 'register' && (
          <div className="op-form">
            <label>Owner ID<input value={reg.owner_id} onChange={(e) => setReg({ ...reg, owner_id: e.target.value.toUpperCase() })} placeholder="Ask your employer (in their app profile)" /></label>
            <label>Your name<input value={reg.full_name} onChange={(e) => setReg({ ...reg, full_name: e.target.value })} /></label>
            <label>Email<input type="email" value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} /></label>
            <label>Mobile (optional)<input inputMode="numeric" value={reg.mobile_number} onChange={(e) => setReg({ ...reg, mobile_number: e.target.value })} /></label>
            <label>Password (8+ characters)<input type="password" value={reg.password} onChange={(e) => setReg({ ...reg, password: e.target.value })} /></label>
            <button type="button" className="op-btn" disabled={busy || !reg.owner_id || !reg.full_name || !reg.email || reg.password.length < 8} onClick={register}>{busy ? 'Please wait…' : 'Ask to join'}</button>
            <p className="op-muted small">Your employer approves you and chooses what you can do.</p>
          </div>
        )}
      </div>
    </div>
  );
}
