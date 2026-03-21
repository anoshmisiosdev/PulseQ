const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.error?.message || res.statusText);
  }
  return res.json();
}

export const api = {
  getHealth: () => request('/health'),
  getCustomers: () => request('/customers'),
  getCustomer: (id) => request(`/customers/${id}`),
  getChurnRisk: (id) => request(`/customers/${id}/churn-risk`),
  getDashboard: () => request('/dashboard'),
};
