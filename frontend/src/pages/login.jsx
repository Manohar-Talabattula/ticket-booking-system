import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 500, marginBottom: 8 }}>Sign in</h1>
      <p style={{ color: '#6b6375', marginBottom: 32 }}>Welcome back.</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 14 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: 10, border: '1px solid #e5e4e7', borderRadius: 6, boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 14 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 10, border: '1px solid #e5e4e7', borderRadius: 6, boxSizing: 'border-box' }}
          />
        </div>

        {error && <p style={{ color: '#c0392b', marginBottom: 16, fontSize: 14 }}>{error}</p>}

        <button
          type="submit"
          style={{ width: '100%', padding: 12, background: '#08060d', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, cursor: 'pointer' }}
        >
          Sign in
        </button>
      </form>

      <p style={{ marginTop: 24, fontSize: 14, textAlign: 'center' }}>
        No account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}