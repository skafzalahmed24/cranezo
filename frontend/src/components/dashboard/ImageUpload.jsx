import React, { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { uploadFile, fileUrl } from '../../utils/api';

/**
 * Picks an image, uploads it to the server and reports the stored path (/public/uploads/...).
 * value is the current path (or ''), onChange receives the new path (or '' when cleared).
 */
export const ImageUpload = ({ value, onChange, width = 160, height = 90, label = 'Upload image' }) => {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      onChange(await uploadFile(file));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div
        style={{
          width,
          height,
          borderRadius: '8px',
          border: '1px dashed var(--dash-input-border)',
          background: 'var(--dash-input-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
        onClick={() => !busy && input.current && input.current.click()}
        title={label}
      >
        {value ? (
          <img src={fileUrl(value)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'var(--dash-text-subtle)', fontSize: 11 }}>
            <ImagePlus size={20} />
            {busy ? 'Uploading...' : label}
          </span>
        )}
        {busy && value && (
          <span style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
            Uploading...
          </span>
        )}
        {value && !busy && (
          <button
            type="button"
            title="Remove image"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.65)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={12} />
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={pick} />
      {error && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4, maxWidth: width }}>{error}</div>}
    </div>
  );
};

export default ImageUpload;
