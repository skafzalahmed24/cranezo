import React, { useCallback, useEffect, useState } from 'react';
import { API_BASE, call, inr, uploadFile } from './ownerApi';
import { ProtectedImage } from '../components/ProtectedFile';

const emptyForm = {
  crane_type: '', capacity: '', fuel_type: '', model_name: '', registration_number: '', location: '',
  latitude: '', longitude: '', hourly_rate: '', minimum_hours: '4', operator_id: '', description: '',
};

const imgUrl = (p) => (p ? (/^https?:/.test(p) ? p : `${API_BASE}${p}`) : '');

/** Crane list and "Add crane" (photos and documents are uploaded like in the app; a new crane goes to the admin for review). */
export function OwnerCranes() {
  const [cranes, setCranes] = useState(null);
  const [options, setOptions] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [photos, setPhotos] = useState([]); // uploaded paths
  const [docs, setDocs] = useState({}); // document type id -> { file_url, expiry_date }
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => call('/owner/getCranes', { min: 0, max: 100 }).then((r) => setCranes(r.data || [])).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const openForm = async () => {
    setAdding(true);
    setError('');
    if (!options) {
      try {
        setOptions((await call('/owner/cranes/form-options')).data);
      } catch (e) {
        setError(e.message);
      }
    }
  };

  const set = (patch) => setForm({ ...form, ...patch });

  const upload = async (file) => {
    setError('');
    setBusy(true);
    try {
      return await uploadFile(file);
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return setError('Your browser cannot find your location. Type the latitude and longitude.');
    navigator.geolocation.getCurrentPosition(
      (pos) => set({ latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }),
      () => setError('Location was not allowed. Type the latitude and longitude of the crane.'),
    );
  };

  const save = async () => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const documents = Object.entries(docs).filter(([, d]) => d.file_url).map(([id, d]) => ({ document_type: Number(id), file_url: d.file_url, expiry_date: d.expiry_date || undefined }));
      await call('/owner/cranes', {
        crane_type: Number(form.crane_type), capacity: Number(form.capacity), fuel_type: form.fuel_type ? Number(form.fuel_type) : undefined,
        model_name: form.model_name || undefined, registration_number: form.registration_number, location: form.location,
        latitude: Number(form.latitude), longitude: Number(form.longitude), hourly_rate: Number(form.hourly_rate),
        minimum_hours: Number(form.minimum_hours || 4), operator_id: form.operator_id || undefined, description: form.description || undefined,
        photos, documents,
      });
      setNotice('Crane submitted. The Cranezo team will review it (usually within 12 to 24 hours).');
      setAdding(false);
      setForm(emptyForm);
      setPhotos([]);
      setDocs({});
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const ready = form.crane_type && form.capacity && form.registration_number && form.location && form.latitude && form.longitude && Number(form.hourly_rate) > 0 && photos.length > 0;

  return (
    <>
      <div className="op-row spread">
        <h2>Cranes</h2>
        {!adding && <button type="button" className="op-btn" onClick={openForm}>+ Add crane</button>}
      </div>
      {error && <div className="op-alert bad">{error}</div>}
      {notice && <div className="op-alert ok">{notice}</div>}

      {adding && (
        <div className="op-card">
          <h3>Add a crane</h3>
          {!options && <p className="op-muted">Loading…</p>}
          {options && (
            <div className="op-grid">
              <label>Crane type<select value={form.crane_type} onChange={(e) => set({ crane_type: e.target.value })}><option value="">Choose</option>{options.crane_types.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
              <label>Capacity<select value={form.capacity} onChange={(e) => set({ capacity: e.target.value })}><option value="">Choose</option>{options.capacities.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
              <label>Fuel<select value={form.fuel_type} onChange={(e) => set({ fuel_type: e.target.value })}><option value="">Choose</option>{options.fuel_types.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
              <label>Model<input value={form.model_name} onChange={(e) => set({ model_name: e.target.value })} /></label>
              <label>Registration number<input value={form.registration_number} onChange={(e) => set({ registration_number: e.target.value.toUpperCase() })} /></label>
              <label>Rate per hour (₹)<input inputMode="decimal" value={form.hourly_rate} onChange={(e) => set({ hourly_rate: e.target.value.replace(/[^\d.]/g, '') })} /></label>
              <label>Minimum hours<input inputMode="numeric" value={form.minimum_hours} onChange={(e) => set({ minimum_hours: e.target.value.replace(/\D/g, '') })} /></label>
              <label>Operator (optional)<select value={form.operator_id} onChange={(e) => set({ operator_id: e.target.value })}><option value="">None for now</option>{options.operators.map((o) => <option key={o.id} value={o.id}>{o.full_name} ({o.member_id})</option>)}</select></label>
              <label className="wide">Where the crane stands (address)<input value={form.location} onChange={(e) => set({ location: e.target.value })} /></label>
              <label>Latitude<input value={form.latitude} onChange={(e) => set({ latitude: e.target.value })} /></label>
              <label>Longitude<input value={form.longitude} onChange={(e) => set({ longitude: e.target.value })} /></label>
              <div className="wide"><button type="button" className="op-btn ghost" onClick={useMyLocation}>Use my current location</button></div>
              <label className="wide">Description (optional)<input value={form.description} onChange={(e) => set({ description: e.target.value })} /></label>

              <div className="wide">
                <strong>Photos</strong> <span className="op-muted small">(at least one)</span>
                <div className="op-thumbs">
                  {photos.map((p) => <ProtectedImage key={p} src={p} alt="" />)}
                  <label className="op-add-photo">+<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) { const url = await upload(f); if (url) setPhotos((x) => [...x, url]); } }} /></label>
                </div>
              </div>

              <div className="wide">
                <strong>Documents</strong>
                {options.document_types.map((d) => (
                  <div className="op-doc" key={d.id}>
                    <span>{d.name}{d.required ? ' *' : ''}</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={async (e) => { const f = e.target.files[0]; if (f) { const url = await upload(f); if (url) setDocs((x) => ({ ...x, [d.id]: { ...(x[d.id] || {}), file_url: url } })); } }} />
                    {docs[d.id]?.file_url && <span className="op-pill active">uploaded</span>}
                    <input type="date" title="Expiry date" value={docs[d.id]?.expiry_date || ''} onChange={(e) => setDocs((x) => ({ ...x, [d.id]: { ...(x[d.id] || {}), expiry_date: e.target.value } }))} />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="op-row" style={{ marginTop: 16 }}>
            <button type="button" className="op-btn" disabled={busy || !ready} onClick={save}>{busy ? 'Please wait…' : 'Submit crane'}</button>
            <button type="button" className="op-btn ghost" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {!cranes && !error && <p className="op-muted">Loading…</p>}
      {cranes && cranes.length === 0 && !adding && <p className="op-muted">No cranes yet. Add your first crane.</p>}
      {cranes && cranes.length > 0 && (
        <div className="op-cranes">
          {cranes.map((c) => (
            <div className="op-crane" key={c.id}>
              <div className="op-crane-img" style={c.primary_photo ? { backgroundImage: `url(${imgUrl(c.primary_photo)})` } : undefined} />
              <div className="op-crane-body">
                <strong>{[c.capacity_name, c.crane_type_name].filter(Boolean).join(' ')}</strong>
                <span className="op-muted small">{c.crane_code} · {c.registration_number}</span>
                <span>{inr(c.hourly_rate)} / hour · {c.availability_label}</span>
                <span className={`op-pill ${c.approval_status === 1 ? 'active' : c.approval_status === 2 ? 'blocked' : 'pending'}`}>{c.approval_label}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
