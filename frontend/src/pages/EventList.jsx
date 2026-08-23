import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function EventList() {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();

  useEffect(() => {
    api.get('/shows')
      .then((res) => setShows(res.data))
      .catch((err) => console.error('Failed to load shows:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 500, margin: 0 }}>Now Showing</h1>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {user ? (
            <>
              <Link to="/bookings" style={{ fontSize: 14 }}>My Bookings</Link>
              <span style={{ fontSize: 14, color: '#6b6375' }}>{user.email}</span>
              <button onClick={logout} style={{ fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#6b6375' }}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ fontSize: 14 }}>Sign in</Link>
              <Link to="/register" style={{ fontSize: 14 }}>Register</Link>
            </>
          )}
        </div>
      </div>

      {loading && <p>Loading shows...</p>}
      {!loading && shows.length === 0 && <p>No shows available yet.</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
        {shows.map((show) => (
          <Link
            key={show.id}
            to={`/shows/${show.id}`}
            style={{
              display: 'block',
              border: '1px solid #e5e4e7',
              borderRadius: 10,
              padding: 20,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 8px' }}>{show.title}</h2>
            <p style={{ color: '#6b6375', fontSize: 14, margin: '0 0 4px' }}>
              {show.venue?.name}
            </p>
            <p style={{ color: '#6b6375', fontSize: 14, margin: 0 }}>
              {new Date(show.date).toLocaleString()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}