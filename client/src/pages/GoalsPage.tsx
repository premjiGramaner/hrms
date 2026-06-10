import React from 'react';
import Layout from '../components/Layout';

export default function GoalsPage() {
  return (
    <Layout title="Goals">
      <div className="cf-widget" style={{ maxWidth: 500, margin: '40px auto' }}>
        <div className="cf-widget-body" style={{ textAlign: 'center', padding: 48 }}>
          <i className="bi bi-flag" style={{ fontSize: 48, color: '#16a085', display: 'block', marginBottom: 12 }}></i>
          <p style={{ color: '#718096', fontSize: 14 }}>Goals module coming soon.</p>
        </div>
      </div>
    </Layout>
  );
}
