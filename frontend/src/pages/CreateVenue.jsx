import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function CreateVenue() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [venueId, setVenueId] = useState('');
  const [seatRow, setSeatRow] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [seatCategory, setSeatCategory] = useState('STANDARD');
  const [message, setMessage] = useState('');

  if (user?.role !== 'ADMIN') {
    return <p style={{ padding: 40 }}>Admin access only.</p>;
  }

  const handleCreateVenue = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const { data } = await api.post('/venues', { name, address });
      setVenueId(data.id);
      setMessage(`Venue created: ${data.id}`);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to create venue');
    }
  };

  const handleAddSeat = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await api.post(`/venues/${venueId}/seats`, {
        row: seatRow,
        number: Number(seatNumber),
        category: seatCategory,
      });
      setMessage(`Seat ${seatRow}${seatNumber} added`);
      setSeatRow('');
      setSeatNumber('');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to add seat');
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 500, marginBottom: 24 }}>Create Venue</h1>

      <form onSubmit={handleCreateVenue} style={{ marginBottom: 32 }}>
        <input
          placeholder="Venue name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ display: 'block', width: '100%', padding: 10, marginBottom: 10, border: '1px solid #e5e4e7', borderRadius: 6, boxSizing: 'border-box' }}
        />
        <input
          placeholder="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          style={{ display: 'block', width: '100%', padding: 10, marginBottom: 10, border: '1px solid #e5e4e7', borderRadius: 6, boxSizing: 'border-box' }}
        />
        <button type="submit" style={{ padding: '10px 20px', background: '#08060d', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Create Venue
        </button>
      </form>

      {venueId && (
        <form onSubmit={handleAddSeat}>
          <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 12 }}>Add Seat to Venue</h2>
          <input
            placeholder="Row (e.g. A)"
            value={seatRow}
            onChange={(e) => setSeatRow(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 10, marginBottom: 10, border: '1px solid #e5e4e7', borderRadius: 6, boxSizing: 'border-box' }}
          />
          <input
            placeholder="Seat number"
            type="number"
            value={seatNumber}
            onChange={(e) => setSeatNumber(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 10, marginBottom: 10, border: '1px solid #e5e4e7', borderRadius: 6, boxSizing: 'border-box' }}
          />
          <select
            value={seatCategory}
            onChange={(e) => setSeatCategory(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 10, marginBottom: 10, border: '1px solid #e5e4e7', borderRadius: 6, boxSizing: 'border-box' }}
          >
            <option value="PREMIUM">Premium</option>
            <option value="STANDARD">Standard</option>
            <option value="ECONOMY">Economy</option>
          </select>
          <button type="submit" style={{ padding: '10px 20px', background: '#08060d', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Add Seat
          </button>
        </form>
      )}

      {message && <p style={{ marginTop: 16, fontSize: 14 }}>{message}</p>}
    </div>
  );
}