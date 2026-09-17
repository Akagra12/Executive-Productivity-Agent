import React from 'react';
import { Sparkles, Calendar, RefreshCw, Copy, Check, Download, FileText } from 'lucide-react';

export default function Header({ 
  selectedDate, 
  onDateChange, 
  onRefresh, 
  isRefreshing, 
  onExportBrief,
  stats 
}) {
  const [copied, setCopied] = React.useState(false);

  const dates = [
    { value: '2026-09-22', label: 'Tue, 22 Sep 2026 (Meeting Day)' },
    { value: '2026-09-23', label: 'Wed, 23 Sep 2026 (Demo Default)' },
    { value: '2026-09-24', label: 'Thu, 24 Sep 2026 (Review Morning)' },
    { value: '2026-09-25', label: 'Fri, 25 Sep 2026 (Lease Deadline)' },
  ];

  return (
    <header className="app-header glass-panel">
      <div className="brand-section">
        <div className="brand-logo">
          <Sparkles size={24} />
        </div>
        <div className="brand-info">
          <h1>
            AIONOS <span className="tag">Executive Agent</span>
          </h1>
          <p>VP Product & Strategy — Arjun Malhotra</p>
        </div>
      </div>

      <div className="header-controls">
        {/* Time Travel Date Selector */}
        <div className="date-selector-box">
          <Calendar size={15} color="#818cf8" />
          <label htmlFor="date-select">Simulate Date:</label>
          <select 
            id="date-select" 
            value={selectedDate} 
            onChange={(e) => onDateChange(e.target.value)}
          >
            {dates.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* Refresh / Ingest Trigger */}
        <button 
          className="btn btn-ghost" 
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Re-run pipeline and reload fresh data"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Syncing...' : 'Sync Data'}
        </button>

        {/* Export Brief */}
        <button 
          className="btn btn-primary"
          onClick={onExportBrief}
        >
          <FileText size={14} />
          Export Brief
        </button>
      </div>
    </header>
  );
}
