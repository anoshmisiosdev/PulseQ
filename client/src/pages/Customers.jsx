import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCustomers()
      .then((res) => setCustomers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading">Loading customers...</p>;

  return (
    <div className="page">
      <h1 className="page-title">Customers</h1>

      {customers.length > 0 ? (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Risk Level</th>
              <th>Last Purchase</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.email}</td>
                <td>
                  <span className={`badge badge-${c.risk}`}>{c.risk}</span>
                </td>
                <td>{c.lastPurchase}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state-box">
          <p className="empty-state">No customers yet</p>
          <p className="empty-state-hint">
            Connect a payment provider to import your customer data.
          </p>
        </div>
      )}
    </div>
  );
}
