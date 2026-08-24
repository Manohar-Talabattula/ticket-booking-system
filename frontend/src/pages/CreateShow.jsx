import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function CreateShow() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [venueId, setVenueId] = useState('');
  const [date, setDate] = useState('');
  const [premiumPrice, setPremiumPrice] = useState('');
  const [standardPrice, setStandardPrice] = useState('');
  const [message, setMessage] = useState('');

  if (user?.role !== 'ORGANISER') {
    return <p style={{ padding: 40 }}>Organiser access only.</p>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const pricing = [];
      if (premiumPrice) pricing.push({ category: 'PREMIUM', price: Number(premiumPrice) });
      if (standardPrice) pricing.push({ category: 'STANDARD', price: Number(standardPrice) });

      const { data } = await api.post('/shows', {
        title,
        venueId,
        date: new Date(date).toISOString(),
        pricing,
      });
      setMessage(`Show created: ${data.title} (${data.id})`);
      setTitle('');
      setVenueId('');
      setDate('');
      setPremiumPrice('');
      setStandardPrice('');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to create show');
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 500, marginBottom: 24 }}>Create Show</h1>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Show title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ display: 'block', width: '100%', padding: 10, marginBottom: 10, border: '1px solid #e5e4e7', borderRadius: 6, boxSizing: 'border-box' }}
        />
        <input
          placeholder="Venue ID"
          value={venueId}
          onChange={(e) => setVenueId(e.target.value)}
          required
          style={{ display: 'block', width: '100%', padding: 10, marginBottom: 10, border: '1px solid #e5e4e7', borderRadius: 6, boxSizing: 'border-box' }}
        />
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          style={{ display: 'block', width: '100%', padding: 10, marginBottom: 10, border: '1px solid #e5e4e7', borderRadius: 6, boxSizing: 'border-box' }}
        />
        <input
          placeholder="Premium price"
          type="number"
          value={premiumPrice}
          onChange={(e) => setPremiumPrice(e.target.value)}
          style={{ display: 'block', width: '100%', padding: 10, marginBottom: 10, border: '1px solid #e5e4e7', borderRadius: 6, boxSizing: 'border-box' }}
        />
        <input
          placeholder="Standard price"
          type="number"
          value={standardPrice}
          onChange={(e) => setStandardPrice(e.target.value)}
          style={{ display: 'block', width: '100%', padding: 10, marginBottom: 10, border: '1px solid #e5e4e7', borderRadius: 6, boxSizing: 'border-box' }}
        />
        <button type="submit" style={{ padding: '10px 20px', background: '#08060d', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Create Show
        </button>
      </form>

      {message && <p style={{ marginTop: 16, fontSize: 14 }}>{message}</p>}
    </div>
  );
}