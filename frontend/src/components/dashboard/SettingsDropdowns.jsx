import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Check, X } from 'lucide-react';
import { apiRequest } from '../../utils/api';

/**
 * Admin > Settings: manage dropdown values used across the apps.
 * Values can only be added or edited. There is no delete; an edited value
 * can be marked Inactive so apps stop offering it.
 */
export const SettingsDropdowns = () => {
  const [types, setTypes] = useState([]);
  const [activeType, setActiveType] = useState(null);
  const [items, setItems] = useState([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadTypes = useCallback(async () => {
    try {
      const res = await apiRequest('/admin/settings/dropdown-types', { method: 'POST' });
      setTypes(res.data);
      setActiveType((current) => current ?? (res.data[0] ? res.data[0].type : null));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadItems = useCallback(async () => {
    if (activeType === null) return;
    setLoading(true);
    try {
      const res = await apiRequest('/admin/settings/dropdowns/list', { method: 'POST', body: { type: activeType, min: 0, max: 100 } });
      setItems(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeType]);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const run = async (fn) => {
    setError('');
    try {
      await fn();
      await Promise.all([loadItems(), loadTypes()]);
    } catch (err) {
      setError(err.message);
    }
  };

  const addItem = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    run(async () => {
      await apiRequest('/admin/settings/dropdowns', {
        method: 'POST',
        body: { type: activeType, name: newName.trim() },
      });
      setNewName('');
    });
  };

  const saveEdit = (id) =>
    run(async () => {
      await apiRequest(`/admin/settings/dropdowns/${id}`, { method: 'PUT', body: { name: editName } });
      setEditingId(null);
    });

  const toggleStatus = (item) =>
    run(() =>
      apiRequest(`/admin/settings/dropdowns/${item.id}`, {
        method: 'PUT',
        body: { status: item.status === 0 ? 1 : 0 },
      })
    );

  const cardStyle = {
    background: 'var(--dash-card)',
    border: '1px solid var(--dash-border)',
    borderRadius: '12px',
  };

  const inputStyle = {
    height: '38px',
    padding: '0 12px',
    background: 'var(--dash-input-bg)',
    border: '1px solid var(--dash-input-border)',
    borderRadius: '8px',
    color: 'var(--dash-text-body)',
    fontSize: '13px',
  };

  return (
    <div className="cranzo-content-view animate-fade-in" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ ...cardStyle, padding: '8px', width: '260px', flexShrink: 0 }}>
        {types.map((t) => (
          <button
            key={t.type}
            type="button"
            className={`cranzo-nav-item ${activeType === t.type ? 'active' : ''}`}
            style={{ width: '100%', justifyContent: 'space-between' }}
            onClick={() => {
              setActiveType(t.type);
              setEditingId(null);
              setError('');
            }}
          >
            <span>{t.name}</span>
            <span style={{ fontSize: '11px', opacity: 0.7 }}>{t.active}/{t.total}</span>
          </button>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: '16px', flex: 1, minWidth: '320px' }}>
        <h3 style={{ margin: '0 0 12px', color: 'var(--dash-text-title)' }}>
          {types.find((t) => t.type === activeType)?.name || 'Dropdown'}
        </h3>

        <form onSubmit={addItem} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Add a new value"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button type="submit" className="cranzo-btn-primary-amber">
            <Plus size={14} /> Add
          </button>
        </form>

        {error && <p style={{ color: '#ef4444', margin: '0 0 12px' }}>{error}</p>}

        <div className="cranzo-table-container">
          <table className="cranzo-table" style={{ minWidth: '420px' }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ opacity: item.status === 0 ? 1 : 0.55 }}>
                  <td>{item.id}</td>
                  <td>
                    {editingId === item.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{ ...inputStyle, height: '32px' }}
                        autoFocus
                      />
                    ) : (
                      item.name
                    )}
                  </td>
                  <td>{item.status_label}</td>
                  <td style={{ display: 'flex', gap: '6px' }}>
                    {editingId === item.id ? (
                      <>
                        <button type="button" className="cranzo-btn-primary-amber" onClick={() => saveEdit(item.id)} title="Save">
                          <Check size={14} />
                        </button>
                        <button type="button" className="cranzo-btn-secondary" onClick={() => setEditingId(null)} title="Cancel">
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="cranzo-btn-secondary"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditName(item.name);
                          }}
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button type="button" className="cranzo-btn-secondary" onClick={() => toggleStatus(item)}>
                          {item.status === 0 ? 'Set Inactive' : 'Set Active'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--dash-text-muted)' }}>
                    No values yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SettingsDropdowns;
