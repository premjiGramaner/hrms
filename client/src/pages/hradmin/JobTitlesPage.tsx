import React from 'react';
import { tableHeaderStyle, tableCellStyle } from '../../constants/styles';

const JOB_TITLES = ['Software Engineer', 'HR Manager', 'Talent Acquisition Specialist', 'Finance Analyst', 'Operations Lead'];

export default function JobTitlesPage() {
  return (
    <div>
      <h2>Job Titles</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8 }}>
        <thead style={{ background: '#1e2a3a', color: '#fff' }}>
          <tr><th style={tableHeaderStyle}>#</th><th style={tableHeaderStyle}>Job Title</th></tr>
        </thead>
        <tbody>
          {JOB_TITLES.map((title, i) => (
            <tr key={title} style={{ borderBottom: '1px solid #eee' }}>
              <td style={tableCellStyle}>{i + 1}</td>
              <td style={tableCellStyle}>{title}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
