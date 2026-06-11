import React from 'react';

const JOB_TITLES = ['Software Engineer', 'HR Manager', 'Talent Acquisition Specialist', 'Finance Analyst', 'Operations Lead'];

export default function JobTitlesPage() {
  return (
    <div>
      <h2>Job Titles</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8 }}>
        <thead style={{ background: '#1e2a3a', color: '#fff' }}>
          <tr><th style={thStyle}>#</th><th style={thStyle}>Job Title</th></tr>
        </thead>
        <tbody>
          {JOB_TITLES.map((title, i) => (
            <tr key={title} style={{ borderBottom: '1px solid #eee' }}>
              <td style={tdStyle}>{i + 1}</td>
              <td style={tdStyle}>{title}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '10px 14px' };
