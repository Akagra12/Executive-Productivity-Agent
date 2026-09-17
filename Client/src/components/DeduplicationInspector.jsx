import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  GitMerge, 
  ShieldCheck, 
  Activity 
} from 'lucide-react';

export default function DeduplicationInspector({ selectedDate }) {
  const [dedupData, setDedupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPair, setSelectedPair] = useState(null);

  useEffect(() => {
    async function loadDedup() {
      setLoading(true);
      try {
        const res = await fetch(`/api/deduplicate?date=${selectedDate}`);
        const data = await res.json();
        setDedupData(data);
      } catch (err) {
        console.error('Failed to load dedup audit:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDedup();
  }, [selectedDate]);

  if (loading) {
    return <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>Running deduplication audit engine...</div>;
  }

  const { stats, auto_merged_pairs = [], flagged_pairs = [], all_pair_scores = [] } = dedupData || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Engine Rationale Banner */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>
          <ShieldCheck size={16} /> Deterministic Multi-Signal Deduplication Engine
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
          Cross-Source Task Consolidation & Audit Inspector
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '6px', maxWidth: '900px' }}>
          Consolidates identical commitments made across meetings, emails, and voice notes into single canonical records while preserving 100% of the original supporting evidence.
        </p>

        {/* Scoring Weights Matrix */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '16px' }}>
          <div className="glass-panel" style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Owner Match (30%)</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#818cf8' }}>Weight: 0.30</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Exact email equality</div>
          </div>
          <div className="glass-panel" style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Recipient Match (25%)</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#818cf8' }}>Weight: 0.25</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Target stakeholder match</div>
          </div>
          <div className="glass-panel" style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Jaccard Keyword (30%)</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#818cf8' }}>Weight: 0.30</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Tokenized text overlap</div>
          </div>
          <div className="glass-panel" style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Deadline Proximity (15%)</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#818cf8' }}>Weight: 0.15</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Within 3 calendar days</div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Total Pairs Scored</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc' }}>{stats?.pairs_scored || 0}</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#34d399' }}>Auto-Merged Pairs (≥ 0.70)</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#34d399' }}>{stats?.merged_count || 0}</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#f472b6' }}>Uncertain / Flagged (0.40–0.69)</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f472b6' }}>{stats?.flagged_count || 0}</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Canonical Retained</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#818cf8' }}>{stats?.output_count || 0}</div>
        </div>
      </div>

      {/* Flagged / Uncertain Pairs */}
      {flagged_pairs.length > 0 && (
        <div className="brief-section">
          <div className="section-header">
            <h3 className="section-title" style={{ color: '#f472b6' }}>
              <AlertTriangle size={18} /> Flagged Pairs for Human Review ({flagged_pairs.length})
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {flagged_pairs.map((pair, idx) => (
              <div key={idx} className="glass-panel" style={{ padding: '16px', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>
                    {pair.commitment_a} ↔ {pair.commitment_b}
                  </div>
                  <span className="badge badge-unclear">
                    Score: {pair.score} ({pair.tier})
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                  {pair.note}
                </p>
                <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
                  <span>Owner Match: {pair.breakdown?.owner_match?.score > 0 ? '✅ 0.30' : '❌ 0.00'}</span>
                  <span>Recipient Match: {pair.breakdown?.recipient_match?.score > 0 ? '✅ 0.25' : '❌ 0.00'}</span>
                  <span>Keyword Jaccard: {pair.breakdown?.keyword_overlap?.jaccard} (score: {pair.breakdown?.keyword_overlap?.score})</span>
                  <span>Deadline: {pair.breakdown?.deadline_proximity?.score > 0 ? `✅ +${pair.breakdown?.deadline_proximity?.score}` : '❌ 0.00'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pair Audit Table */}
      <div className="brief-section">
        <div className="section-header">
          <h3 className="section-title">
            <Activity size={18} color="#818cf8" /> Full Pairwise Deduplication Matrix ({all_pair_scores.length} Pairs)
          </h3>
        </div>
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-card)', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 16px' }}>Pair</th>
                  <th style={{ padding: '12px 16px' }}>Score</th>
                  <th style={{ padding: '12px 16px' }}>Decision Tier</th>
                  <th style={{ padding: '12px 16px' }}>Action Taken</th>
                  <th style={{ padding: '12px 16px' }}>Signals Breakdown</th>
                </tr>
              </thead>
              <tbody>
                {all_pair_scores.map((pair, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#f8fafc' }}>
                      {pair.commitment_a} ↔ {pair.commitment_b}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: pair.score >= 0.7 ? '#34d399' : pair.score >= 0.4 ? '#f472b6' : '#64748b' }}>
                      {pair.score.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${pair.tier === 'HIGH_CONFIDENCE' ? 'badge-completed' : pair.tier === 'UNCERTAIN' ? 'badge-unclear' : 'badge-ghost'}`}>
                        {pair.tier}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                      {pair.action}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                      O:{pair.breakdown?.owner_match?.score} | R:{pair.breakdown?.recipient_match?.score} | K:{pair.breakdown?.keyword_overlap?.score} | D:{pair.breakdown?.deadline_proximity?.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
