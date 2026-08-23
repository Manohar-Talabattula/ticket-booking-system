import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = () => {
    api.get('/bookings').then((res) => setBookings(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async (bookingId) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await api.delete(`/bookings/${bookingId}`);
      fetchBookings();
    } catch (err) {
      alert(err.response?.data?.message || 'Cancel failed');
    }
  };

  if (loading) return <p style={{ padding: 40 }}>Loading...</p>;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 500, margin: 0 }}>My Bookings</h1>
        <Link to="/" style={{ fontSize: 14 }}>Back to events</Link>
      </div>

      {bookings.length === 0 && <p style={{ color: '#6b6375' }}>No bookings yet.</p>}

      {bookings.map((booking) => (
        <div key={booking.id} style={{ border: '1px solid #e5e4e7', borderRadius: 8, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 500, margin: '0 0 4px' }}>{booking.show?.title}</h2>
              <p style={{ color: '#6b6375', fontSize: 14, margin: '0 0 4px' }}>
                {booking.show?.venue?.name} — {booking.showSeat?.seat?.row}{booking.showSeat?.seat?.number}
              </p>
              <p style={{ color: '#6b6375', fontSize: 14, margin: 0 }}>
                Ref: {booking.bookingRef} — Status: <strong>{booking.status}</strong>
              </p>
            </div>
            {booking.status === 'CONFIRMED' && (
              <button
                onClick={() => handleCancel(booking.id)}
                style={{ fontSize: 13, padding: '8px 14px', border: '1px solid #e5e4e7', borderRadius: 6, background: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}