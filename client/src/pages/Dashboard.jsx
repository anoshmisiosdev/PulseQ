import { useEffect, useState } from 'react';
import { api } from '../api/client';
import StatCard from '../components/StatCard';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getDashboard()
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading">Loading dashboard...</p>;

  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>
      <div className="stat-grid">
        <StatCard title="Total Customers" value={data?.totalCustomers ?? '—'} />
        <StatCard
          title="At-Risk Customers"
          value={data?.atRiskCustomers ?? '—'}
          subtitle="Predicted to churn"
        />
        <StatCard
          title="Churn Rate"
          value={data?.churnRate != null ? `${data.churnRate}%` : '—'}
        />
      </div>

      <section className="section">
        <h2 className="section-title">Recent Alerts</h2>
        {data?.recentAlerts?.length > 0 ? (
          <ul className="alert-list">
            {data.recentAlerts.map((alert, i) => (
              <li key={i} className="alert-item">
                {alert}
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">No recent alerts</p>
        )}
      </section>
    </div>
  );
}
