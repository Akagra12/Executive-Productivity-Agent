import React, { useState, useEffect } from 'react';
import { Database, FileText, Mail, Calendar, Mic, RefreshCw } from 'lucide-react';
import { API_BASE } from '../config/api';

export default function RawDataViewer() {
  const [ingestData, setIngestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/ingest`);
        const data = await res.json();
        setIngestData(data);
      } catch (err) {
        console.error('Failed to load raw ingested records:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>Loading ingested data pack...</div>;
  }

  const { stats, records = [] } = ingestData || {};

  const filteredRecords = activeCategory === 'all'
    ? records
    : records.filter((r) => r.source_type === activeCategory);

  const categories = [
    { id: 'all', label: 'All Ingested Records', count: records.length, icon: Database },
    { id: 'meeting_transcript', label: 'Meeting Transcript', count: stats?.by_source_type?.meeting_transcript || 0, icon: FileText },
    { id: 'email', label: 'Email Threads', count: stats?.by_source_type?.email || 0, icon: Mail },
    { id: 'calendar', label: 'Calendar Records', count: stats?.by_source_type?.calendar || 0, icon: Calendar },
    { id: 'voice_note', label: 'Voice Notes', count: stats?.by_source_type?.voice_note || 0, icon: Mic },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Overview Banner */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>
          <Database size={16} /> Traceable Data Pack Explorer
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
          Ingested Raw Multi-Modal Inputs ({records.length} Records)
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
          Every commitment is 100% grounded in these raw inputs. Nothing is fabricated or hallucinated.
        </p>

        {/* Source Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
          {categories.map((c) => {
            const Icon = c.icon;
            const active = activeCategory === c.id;
            return (
              <button
                key={c.id}
                className={`tab-btn ${active ? 'active' : ''}`}
                onClick={() => setActiveCategory(c.id)}
                style={{ fontSize: '12px', padding: '8px 14px' }}
              >
                <Icon size={14} />
                <span>{c.label}</span>
                <span className="tab-badge">{c.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Records Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredRecords.map((rec) => (
          <div key={rec.id} className="glass-panel" style={{ padding: '18px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="tag font-mono">{rec.source_type}</span>
                  <span className="font-mono" style={{ fontSize: '13px', fontWeight: 700, color: '#818cf8' }}>
                    {rec.id}
                  </span>
                </div>
                {rec.metadata?.subject && (
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#f8fafc', marginTop: '4px' }}>
                    {rec.metadata.subject}
                  </div>
                )}
                {rec.metadata?.meeting_title && (
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#f8fafc', marginTop: '4px' }}>
                    {rec.metadata.meeting_title}
                  </div>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                {rec.timestamp || rec.metadata?.date || rec.date || 'Date unrecorded'}
              </div>
            </div>

            <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #6366f1' }}>
              {rec.content || rec.text || '--'}
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '11px', color: '#94a3b8', flexWrap: 'wrap' }}>
              {rec.from && <span>From: <strong>{rec.from}</strong></span>}
              {rec.to && rec.to.length > 0 && <span>To: <strong>{rec.to.join(', ')}</strong></span>}
              {rec.metadata?.speaker && <span>Speaker: <strong>{rec.metadata.speaker}</strong></span>}
              {rec.metadata?.turn_index && <span>Turn #{rec.metadata.turn_index}</span>}
              {rec.metadata?.person && <span>Calendar for: <strong>{rec.metadata.person}</strong></span>}
              {rec.metadata?.event_type && <span>Type: <strong>{rec.metadata.event_type}</strong></span>}
              {rec.metadata?.location && <span>Location: {rec.metadata.location}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
