import React, { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';

export const AlumniView: React.FC = () => {
  const [profiles, setProfiles]   = useState<any[]>([]);
  const [events, setEvents]       = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<'profiles' | 'events' | 'donations'>('profiles');

  useEffect(() => {
    Promise.allSettled([
      adminApi.getAlumniProfiles(),
      adminApi.getAlumniEvents(),
      adminApi.getDonations(),
    ]).then(([p, e, d]) => {
      if (p.status === 'fulfilled') setProfiles(p.value);
      if (e.status === 'fulfilled') setEvents(e.value);
      if (d.status === 'fulfilled') setDonations(d.value);
    }).finally(() => setLoading(false));
  }, []);

  const totalDonations = donations.reduce((sum, d) => sum + parseFloat(d.amount ?? '0'), 0);

  return (
    <div>
      <div className="page-header fade-up">
        <h1>Alumni Management</h1>
        <p>Manage alumni profiles, events, and donation records.</p>
      </div>

      <div className="stat-grid fade-up fade-up-delay-1">
        <div className="stat-card"><div className="stat-icon violet">🏛️</div><div className="stat-body"><div className="stat-label">Alumni Registered</div><div className="stat-value">{profiles.length}</div></div></div>
        <div className="stat-card"><div className="stat-icon blue">📅</div><div className="stat-body"><div className="stat-label">Events Planned</div><div className="stat-value">{events.length}</div></div></div>
        <div className="stat-card"><div className="stat-icon green">💰</div><div className="stat-body"><div className="stat-label">Total Donations</div><div className="stat-value">GHS {totalDonations.toFixed(0)}</div></div></div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }} className="fade-up fade-up-delay-2">
        {(['profiles', 'events', 'donations'] as const).map((tab) => (
          <button
            key={tab}
            id={`alumni-tab-${tab}`}
            className={activeTab === tab ? 'btn btn-primary' : 'btn btn-ghost'}
            onClick={() => setActiveTab(tab)}
            style={{ padding: '6px 14px', fontSize: '0.8rem', textTransform: 'capitalize' }}
          >
            {tab === 'profiles' ? '🏛️ Profiles' : tab === 'events' ? '📅 Events' : '💰 Donations'}
          </button>
        ))}
      </div>

      <div className="card fade-up fade-up-delay-3">
        {activeTab === 'profiles' && (
          <>
            <div className="card-header"><div className="card-title">Alumni Profiles</div></div>
            {loading ? <div className="empty-state"><p>Loading…</p></div> : profiles.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">🏛️</div><p>No alumni profiles yet.</p></div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Grad. Year</th><th>Degree</th><th>Employer</th><th>Job Title</th></tr></thead>
                  <tbody>
                    {profiles.map((p) => (
                      <tr key={p.id}>
                        <td><strong>{p.graduationYear}</strong></td>
                        <td>{p.degreeObtained}</td>
                        <td>{p.currentEmployer ?? '—'}</td>
                        <td>{p.currentJobTitle ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'events' && (
          <>
            <div className="card-header"><div className="card-title">Alumni Events</div></div>
            {loading ? <div className="empty-state"><p>Loading…</p></div> : events.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">📅</div><p>No events scheduled yet.</p></div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Title</th><th>Date</th><th>Location</th><th>Capacity</th></tr></thead>
                  <tbody>
                    {events.map((e) => (
                      <tr key={e.id}>
                        <td><strong>{e.title}</strong></td>
                        <td>{new Date(e.eventDate).toLocaleDateString()}</td>
                        <td>{e.location ?? '—'}</td>
                        <td>{e.capacity ?? 'Unlimited'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'donations' && (
          <>
            <div className="card-header"><div className="card-title">Donation Records</div></div>
            {loading ? <div className="empty-state"><p>Loading…</p></div> : donations.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">💰</div><p>No donations recorded yet.</p></div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Alumni ID</th><th>Amount</th><th>Purpose</th><th>Date</th></tr></thead>
                  <tbody>
                    {donations.map((d) => (
                      <tr key={d.id}>
                        <td><strong>#{d.alumniId}</strong></td>
                        <td><strong style={{ color: 'var(--accent-green)' }}>GHS {parseFloat(d.amount).toFixed(2)}</strong></td>
                        <td>{d.purpose ?? '—'}</td>
                        <td>{new Date(d.donatedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const CampusView: React.FC = () => {
  const [hostels, setHostels]     = useState<any[]>([]);
  const [routes, setRoutes]       = useState<any[]>([]);
  const [passes, setPasses]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<'hostels' | 'transport'>('hostels');

  useEffect(() => {
    Promise.allSettled([
      adminApi.getHostels(),
      adminApi.getTransportRoutes(),
      adminApi.getTransportPasses(),
    ]).then(([h, r, p]) => {
      if (h.status === 'fulfilled') setHostels(h.value);
      if (r.status === 'fulfilled') setRoutes(r.value);
      if (p.status === 'fulfilled') setPasses(p.value);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header fade-up">
        <h1>Campus Services</h1>
        <p>Oversee hostel allocations and transport routes across campus.</p>
      </div>

      <div className="stat-grid fade-up fade-up-delay-1">
        <div className="stat-card"><div className="stat-icon blue">🏫</div><div className="stat-body"><div className="stat-label">Hostels</div><div className="stat-value">{hostels.length}</div><div className="stat-sub">On campus</div></div></div>
        <div className="stat-card"><div className="stat-icon green">🚌</div><div className="stat-body"><div className="stat-label">Transport Routes</div><div className="stat-value">{routes.length}</div><div className="stat-sub">Active routes</div></div></div>
        <div className="stat-card"><div className="stat-icon violet">🎫</div><div className="stat-body"><div className="stat-label">Passes Issued</div><div className="stat-value">{passes.length}</div><div className="stat-sub">Total transport passes</div></div></div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }} className="fade-up fade-up-delay-2">
        {(['hostels', 'transport'] as const).map((tab) => (
          <button key={tab} id={`campus-tab-${tab}`}
            className={activeTab === tab ? 'btn btn-primary' : 'btn btn-ghost'}
            onClick={() => setActiveTab(tab)}
            style={{ padding: '6px 14px', fontSize: '0.8rem', textTransform: 'capitalize' }}
          >
            {tab === 'hostels' ? '🏫 Hostels' : '🚌 Transport'}
          </button>
        ))}
      </div>

      {activeTab === 'hostels' && (
        <div className="card fade-up">
          <div className="card-header"><div className="card-title">Hostel Inventory</div></div>
          {loading ? <div className="empty-state"><p>Loading…</p></div> : hostels.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🏫</div><p>No hostels on record.</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Name</th><th>Location</th><th>Capacity</th></tr></thead>
                <tbody>
                  {hostels.map((h) => (
                    <tr key={h.id}>
                      <td><strong>{h.name}</strong></td>
                      <td>{h.location ?? '—'}</td>
                      <td>{h.capacity} beds</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'transport' && (
        <div className="grid-2 fade-up">
          <div className="card">
            <div className="card-header"><div className="card-title">Routes</div></div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Route</th><th>Vehicle</th></tr></thead>
                <tbody>
                  {routes.map((r) => (
                    <tr key={r.id}><td><strong>{r.routeName}</strong></td><td>{r.vehicleNumber ?? '—'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Issued Passes</div></div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Route</th><th>Valid Until</th></tr></thead>
                <tbody>
                  {passes.map((p) => (
                    <tr key={p.id}><td><strong>{p.routeName ?? `Route #${p.routeId}`}</strong></td><td>{p.validUntil}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
