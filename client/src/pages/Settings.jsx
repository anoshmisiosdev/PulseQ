export default function Settings() {
  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>

      <section className="settings-section">
        <h2 className="section-title">Payment Integrations</h2>
        <div className="integration-grid">
          {['Stripe', 'Square', 'Shopify'].map((provider) => (
            <div key={provider} className="integration-card">
              <h3>{provider}</h3>
              <p className="integration-status">Not connected</p>
              <button className="btn btn-outline">Connect</button>
            </div>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2 className="section-title">Notifications</h2>
        <label className="toggle-label">
          <input type="checkbox" />
          <span>Email alerts for high-risk customers</span>
        </label>
      </section>
    </div>
  );
}
