import React, { useEffect, useState } from 'react';
import { fileUrl } from '../utils/api';

/**
 * Uploaded photos and documents are private: the server answers a plain link with a security error and only
 * serves a file to a request that carries the sign-in token. So the file is fetched with the token and shown from
 * a temporary in-memory address instead of a public link (copying that address is useless).
 */
const token = () =>
  localStorage.getItem('cranezo_token') ||
  sessionStorage.getItem('cranezo_owner_token') ||
  localStorage.getItem('cranezo_owner_token') ||
  '';

const fetchBlobUrl = async (path) => {
  const response = await fetch(fileUrl(path), { headers: { Authorization: `Bearer ${token()}` } });
  if (!response.ok) throw new Error(response.status === 401 ? 'Security error: please sign in again.' : `Could not open the file (${response.status}).`);
  return URL.createObjectURL(await response.blob());
};

/** An <img> for an uploaded file */
export const ProtectedImage = ({ src, alt = '', ...props }) => {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let alive = true;
    let made = '';
    setUrl('');
    if (src) {
      fetchBlobUrl(src)
        .then((u) => {
          made = u;
          if (alive) setUrl(u);
          else URL.revokeObjectURL(u);
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [src]);
  return url ? <img src={url} alt={alt} {...props} /> : <span aria-hidden="true" style={{ display: 'inline-block', ...(props.style || {}) }} />;
};

/** A link that opens an uploaded file in a new tab (the file is fetched with the token first) */
export const ProtectedLink = ({ path, children, ...props }) => {
  const open = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    // the tab is opened first: a window opened after a wait is blocked by the browser
    const tab = window.open('', '_blank');
    try {
      const url = await fetchBlobUrl(path);
      if (tab) tab.location.href = url;
      else window.location.href = url;
    } catch (err) {
      if (tab) tab.close();
      window.alert(err.message);
    }
  };
  return (
    <a href="#open-file" onClick={open} {...props}>
      {children}
    </a>
  );
};
