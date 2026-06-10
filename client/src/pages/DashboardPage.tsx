import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
      {/* My Actions */}
      <div className="cf-widget">
        <div className="cf-widget-header">
          <span className="cf-widget-title">
            <i className="bi bi-list-check" style={{ color: '#16a085' }}></i>My Actions
          </span>
          <i className="bi bi-gear" style={{ color: '#a0aec0', cursor: 'pointer', fontSize: 15 }}></i>
        </div>
        <div className="cf-widget-body">
          <div className="cf-action-item">
            <div className="cf-action-dot" style={{ background: '#16a085' }}></div>
            <span style={{ fontSize: 13.5, color: '#2d3748' }}>(10) Leave Requests to Approve</span>
          </div>
          <div className="cf-action-item">
            <div className="cf-action-dot" style={{ background: '#f97316' }}></div>
            <span style={{ fontSize: 13.5, color: '#2d3748' }}>(1) Pending Self Review</span>
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div className="cf-widget">
        <div className="cf-widget-header">
          <span className="cf-widget-title">
            <i className="bi bi-lightning-fill" style={{ color: '#f59e0b' }}></i>Quick Access
          </span>
          <i className="bi bi-gear" style={{ color: '#a0aec0', cursor: 'pointer', fontSize: 15 }}></i>
        </div>
        <div className="cf-widget-body">
          <div className="cf-quick-grid">
            <QuickItem icon="bi-person-plus-fill" color="#d1fae5" iconColor="#059669" label="Assign Leave" />
            <QuickItem icon="bi-card-list" color="#dbeafe" iconColor="#2563eb" label="Leave List" />
            <QuickItem icon="bi-calendar3" color="#fce7f3" iconColor="#db2777" label="Leave Calendar" />
            <QuickItem icon="bi-box-arrow-in-right" color="#fef3c7" iconColor="#d97706" label="Apply Leave" />
            <QuickItem icon="bi-person-lines-fill" color="#ede9fe" iconColor="#7c3aed" label="My Leave" />
          </div>
        </div>
      </div>

      {/* Employees on Leave Today */}
      <div className="cf-widget">
        <div className="cf-widget-header">
          <span className="cf-widget-title">
            <i className="bi bi-person-x-fill" style={{ color: '#ef4444' }}></i>Employees on Leave Today
          </span>
          <i className="bi bi-gear" style={{ color: '#a0aec0', cursor: 'pointer', fontSize: 15 }}></i>
        </div>
        <div className="cf-widget-body">
          <div className="cf-empty">
            <i className="bi bi-clipboard" style={{ color: '#16a085', opacity: 0.3 }}></i>
            <span style={{ fontSize: 13, color: '#a0aec0' }}>No Employees on Leave Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickItem({ icon, color, iconColor, label }: { icon: string; color: string; iconColor: string; label: string }) {
  return (
    <div className="cf-quick-item">
      <div className="cf-quick-icon" style={{ background: color }}>
        <i className={`bi ${icon}`} style={{ color: iconColor, fontSize: 22 }}></i>
      </div>
      <span className="cf-quick-label">{label}</span>
    </div>
  );
}
