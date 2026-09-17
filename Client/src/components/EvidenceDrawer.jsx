import React from 'react';
import { 
  X, 
  FileText, 
  Calendar, 
  User, 
  Send, 
  ShieldCheck, 
  History, 
  MessageSquare, 
  AlertTriangle,
  ExternalLink 
} from 'lucide-react';

export default function EvidenceDrawer({ commitment, onClose, onAssignOwner }) {
  if (!commitment) return null;

  const {
    commitment_id,
    title,
    description,
    owner,
    recipient,
    status,
    computed_status,
    deadline,
    deadline_history = [],
    evidence = [],
    source_ids = [],
    classification,
    uncertainty_note,
    _dedup,
  } = commitment;

  return (
    <div className="evidence-drawer-overlay" onClick={onClose}>
      <div className="evidence-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <h2>
            <FileText size={18} color="#818cf8" />
            Audit & Evidence Trace — <span className="font-mono" style={{ color: '#818cf8' }}>{commitment_id}</span>
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {/* Main Info */}
          <div className="drawer-section">
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
              {title}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>{description}</p>
          </div>

          {/* Classification & Reasoning Section */}
          <div className="drawer-section">
            <span className="drawer-section-title">Classification Engine Decision</span>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <ShieldCheck size={16} color="#818cf8" />
                <strong style={{ fontSize: '13px', color: '#c7d2fe' }}>
                  Label: {classification?.label?.toUpperCase() || commitment.category?.toUpperCase() || 'UNCLASSIFIED'}
                </strong>
              </div>
              <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.5 }}>
                {classification?.reason || 'Extracted with standard baseline rules.'}
              </div>
              {classification?.rules_applied && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {classification.rules_applied.map((rule, idx) => (
                    <span key={idx} className="tag font-mono" style={{ fontSize: '11px' }}>
                      {rule}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="drawer-section">
            <span className="drawer-section-title">Task Parameters</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="glass-panel" style={{ padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Assigned Owner</div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: owner ? '#f8fafc' : '#f472b6', marginTop: '2px' }}>
                  {owner || '⚠️ Unclear (Unassigned)'}
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Recipient / Beneficiary</div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc', marginTop: '2px' }}>
                  {recipient || 'Internal Team'}
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Target Deadline</div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc', marginTop: '2px' }}>
                  {deadline?.date ? `${deadline.date} (${deadline.time_of_day || 'EOD'})` : 'None specified'}
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Computed Status</div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#818cf8', marginTop: '2px' }}>
                  {computed_status || status}
                </div>
              </div>
            </div>
          </div>

          {/* Uncertainty / Unassigned Alert */}
          {uncertainty_note && (
            <div className="drawer-section">
              <span className="drawer-section-title">Uncertainty Flag</span>
              <div style={{ background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.3)', borderRadius: '8px', padding: '12px', display: 'flex', gap: '10px' }}>
                <AlertTriangle size={18} color="#f472b6" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '13px', color: '#fbcfe8' }}>
                  {uncertainty_note}
                </div>
              </div>
            </div>
          )}

          {/* Multi-Source Supporting Evidence */}
          <div className="drawer-section">
            <span className="drawer-section-title">
              Traceable Evidence ({evidence.length} Source{evidence.length > 1 ? 's' : ''})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {evidence.map((ev, idx) => (
                <div key={idx} className="evidence-snippet-card">
                  <div className="evidence-source-tag">
                    <span>Source #{idx + 1}: {ev.source_id}</span>
                    <span className="tag" style={{ fontSize: '10px' }}>{ev.source_type}</span>
                  </div>
                  <div className="verbatim-quote">
                    "{ev.verbatim}"
                  </div>
                  {ev.timestamp && (
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Timestamp: {ev.timestamp} {ev.sender ? `· Sender: ${ev.sender}` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Deadline History */}
          {deadline_history && deadline_history.length > 0 && (
            <div className="drawer-section">
              <span className="drawer-section-title">Deadline History & Adjustments</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {deadline_history.map((dh, idx) => (
                  <div key={idx} style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#818cf8', fontWeight: 600 }}>
                      <span>Date: {dh.date} ({dh.time_of_day || 'EOD'})</span>
                      <span className="font-mono" style={{ fontSize: '10px', color: '#94a3b8' }}>{dh.source_id}</span>
                    </div>
                    {dh.note && <div style={{ color: '#94a3b8', marginTop: '4px' }}>Note: {dh.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deduplication Details if Merged */}
          {_dedup?.merged && (
            <div className="drawer-section">
              <span className="drawer-section-title">Deduplication Cluster Details</span>
              <div style={{ padding: '12px', background: 'rgba(147, 51, 234, 0.1)', border: '1px solid rgba(147, 51, 234, 0.3)', borderRadius: '8px', fontSize: '12px' }}>
                <div>Merged from duplicate record: <strong>{_dedup.merged_from}</strong></div>
                <div>Match score: <strong>{Math.round(_dedup.merge_score * 100)}%</strong> ({_dedup.merge_tier})</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
