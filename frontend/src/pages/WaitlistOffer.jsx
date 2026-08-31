import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function WaitlistOffer() {
  const { showSeatId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDetails = useCallback(() => {
    api.get(`/shows/seat/${showSeatId}`)
      .then((res) => setData(res.data))
      .catch(() => setError('This seat could not be found.'))
      .finally(() => setLoading(false));
  }, [showSeatId]);

  useEffect(() => {
    fetchDetails();
    const interval = setInterval(fetchDetails, 5000);
    return () => clearInterval(interval);
  }, [fetchDetails]);

  useEffect(() => {
    if (!data?.hold?.expiresAt) {
      setTimeLeft(null);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(data.hold.expiresAt) - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data]);

  const handleConfirm = async () => {
    setError('');
    try {
      const booking = await api.post(`/bookings/${showSeatId}`);
      alert(`Booking confirmed! Reference: ${booking.data.bookingRef}. Check your email for your QR ticket.`);
      navigate('/bookings');
    } catch (err) {
      setError(err.response?.data?.message || 'This offer may have expired.');
      fetchDetails();
    }
  };

  if (loading) return <p style={{ padding: 40 }}>Loading...</p>;
  if (!data) return <p style={{ padding: 40 }}>{error || 'Seat not found.'}</p>;

  const offerExpired = !data.hold || timeLeft === 0;

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
      {offerExpired ? (
        <>
          <h1 style={{ fontSize: 26, fontWeight: 500, marginBottom: 12 }}>Offer expired</h1>
          <p style={{ color: '#6b6375' }}>
            This seat offer is no longer available — it may have already been claimed or passed to
            the next person on the waitlist.
          </p>
        </>
      ) : (
        <>
          <h1 style={{ fontSize: 26, fontWeight: 500, marginBottom: 4 }}>A seat is available!</h1>
          <p style={{ color: '#6b6375', marginBottom: 24 }}>
            {data.show?.title} — {data.show?.venue?.name} — Seat {data.seat?.row}{data.seat?.number}
          </p>

          {timeLeft !== null && (
            <p style={{ marginBottom: 24, fontSize: 15 }}>
              Claim within <strong>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</strong>
            </p>
          )}

          {error && <p style={{ color: '#c0392b', marginBottom: 16, fontSize: 14 }}>{error}</p>}

          <button
            onClick={handleConfirm}
            style={{ padding: '12px 28px', background: '#08060d', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, cursor: 'pointer' }}
          >
            Confirm Booking
          </button>
        </>
      )}
    </div>
  );
}