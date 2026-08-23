import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const STATUS_COLORS = {
  AVAILABLE: '#fff',
  HELD: '#f4f3ec',
  BOOKED: '#e5e4e7',
};

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [show, setShow] = useState(null);
  const [selectedSeatId, setSelectedSeatId] = useState(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [error, setError] = useState('');
  const [waitlistJoined, setWaitlistJoined] = useState(false);

  const fetchShow = useCallback(() => {
    api.get(`/shows/${id}`).then((res) => setShow(res.data)).catch(console.error);
  }, [id]);

  useEffect(() => {
    fetchShow();
    // Poll every 4 seconds so seat statuses update live across users
    const interval = setInterval(fetchShow, 4000);
    return () => clearInterval(interval);
  }, [fetchShow]);

  // Countdown timer for an active hold
  useEffect(() => {
    if (!holdExpiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(holdExpiresAt) - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setSelectedSeatId(null);
        setHoldExpiresAt(null);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [holdExpiresAt]);

  const handleSeatClick = async (showSeat) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (showSeat.status !== 'AVAILABLE') return;
    setError('');

    try {
      const { data } = await api.post(`/seat-hold/${showSeat.id}`);
      setSelectedSeatId(showSeat.id);
      setHoldExpiresAt(data.expiresAt);
      fetchShow();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not hold seat');
      fetchShow();
    }
  };

  const handleReleaseHold = async () => {
    if (!selectedSeatId) return;
    try {
      await api.delete(`/seat-hold/${selectedSeatId}`);
    } catch (err) {
      // ignore — hold may have already expired
    }
    setSelectedSeatId(null);
    setHoldExpiresAt(null);
    fetchShow();
  };

  const handleConfirmBooking = async () => {
    if (!selectedSeatId) return;
    setError('');
    try {
      const booking = await api.post(`/bookings/${selectedSeatId}`);
      setSelectedSeatId(null);
      setHoldExpiresAt(null);
      alert(`Booking confirmed! Reference: ${booking.data.bookingRef}. Check your email for your QR ticket.`);
      navigate('/bookings');
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
    }
  };

  const handleJoinWaitlist = async (category) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await api.post('/waitlist', { showId: id, category });
      setWaitlistJoined(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not join waitlist');
    }
  };

  if (!show) return <p style={{ padding: 40 }}>Loading...</p>;

  const categories = [...new Set(show.showSeats.map((ss) => ss.seat.category))];
  const soldOutCategories = categories.filter((cat) => {
    const seatsInCat = show.showSeats.filter((ss) => ss.seat.category === cat);
    return seatsInCat.every((ss) => ss.status !== 'AVAILABLE');
  });

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 500, margin: '0 0 4px' }}>{show.title}</h1>
      <p style={{ color: '#6b6375', marginBottom: 32 }}>
        {show.venue?.name} — {new Date(show.date).toLocaleString()}
      </p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, fontSize: 13, color: '#6b6375' }}>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: STATUS_COLORS.AVAILABLE, border: '1px solid #e5e4e7', marginRight: 6 }} />Available</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: STATUS_COLORS.HELD, border: '1px solid #e5e4e7', marginRight: 6 }} />Held</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: STATUS_COLORS.BOOKED, border: '1px solid #e5e4e7', marginRight: 6 }} />Booked</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))', gap: 10, marginBottom: 32 }}>
        {show.showSeats.map((showSeat) => {
          const isSelected = selectedSeatId === showSeat.id;
          const price = show.prices.find((p) => p.category === showSeat.seat.category)?.price;
          return (
            <button
              key={showSeat.id}
              onClick={() => handleSeatClick(showSeat)}
              disabled={showSeat.status !== 'AVAILABLE' && !isSelected}
              title={`${showSeat.seat.row}${showSeat.seat.number} — ${showSeat.seat.category} — ₹${price}`}
              style={{
                padding: '10px 4px',
                fontSize: 12,
                border: isSelected ? '2px solid #08060d' : '1px solid #e5e4e7',
                borderRadius: 6,
                background: STATUS_COLORS[showSeat.status],
                cursor: showSeat.status === 'AVAILABLE' ? 'pointer' : 'default',
              }}
            >
              {showSeat.seat.row}{showSeat.seat.number}
            </button>
          );
        })}
      </div>

      {error && <p style={{ color: '#c0392b', marginBottom: 16, fontSize: 14 }}>{error}</p>}

      {selectedSeatId && timeLeft !== null && (
        <div style={{ border: '1px solid #08060d', borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <p style={{ margin: '0 0 12px', fontSize: 14 }}>
            Seat held — completes checkout in <strong>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</strong>
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleConfirmBooking} style={{ padding: '10px 20px', background: '#08060d', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              Confirm Booking
            </button>
            <button onClick={handleReleaseHold} style={{ padding: '10px 20px', background: 'none', border: '1px solid #e5e4e7', borderRadius: 6, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {soldOutCategories.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500 }}>Sold out categories</h3>
          {soldOutCategories.map((cat) => (
            <div key={cat} style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 14, marginRight: 10 }}>{cat}</span>
              {waitlistJoined ? (
                <span style={{ fontSize: 14, color: '#6b6375' }}>You're on the waitlist</span>
              ) : (
                <button onClick={() => handleJoinWaitlist(cat)} style={{ fontSize: 13, padding: '6px 12px', border: '1px solid #e5e4e7', borderRadius: 6, background: 'none', cursor: 'pointer' }}>
                  Join Waitlist
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}