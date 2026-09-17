import React, { useState } from 'react';
import { 
  AlertCircle, 
  Target, 
  Clock, 
  HelpCircle, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight,
  Copy,
  Check,
  Calendar,
  Zap,
  Info,
  Layers,
  PhoneCall,
  UserCheck
} from 'lucide-react';
import CommitmentCard from './CommitmentCard';

export default function DailyBriefView({ briefData, onSelectCommitment, isLoading, error }) {
  const [copied, setCopied] = useState(false);

  // Loading State
  if (isLoading) {
    return (
      <div className="glass-panel" style={{ padding: '60px 30px', textAlign: 'center' }}>
        <Sparkles size={28} className="animate-spin" color="#818cf8" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
          Synthesizing Executive Action Brief...
        </div>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
          Correlating meeting transcripts, email commitments, and calendar records
        </p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
        <AlertCircle size={32} color="#f87171" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#f87171' }}>
          Failed to generate brief
        </div>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>{error}</p>
      </div>
    );
  }

  // Empty State
  if (!briefData || !briefData.sections) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <Info size={30} color="#818cf8" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
          No data available for this date
        </div>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
          Select another date in the top bar to inspect action briefs.
        </p>
      </div>
    );
  }

  const {
    reference_date,
    formatted_date,
    sections = {},
    stats = {},
    chat_snippet,
    priority_rules_explanation,
  } = briefData;

  const {
    overdue = [],
    due_today = [],
    meetings = [],
    unclear_ownership = [],
    upcoming = [],
    waiting_on_others = [],
    completed = [],
  } = sections;

  const handleCopyChatSnippet = () => {
    if (chat_snippet) {
      navigator.clipboard.writeText(chat_snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Executive Overview Banner */}
      <div className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Sparkles size={16} /> Executive Action Brief
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
              {formatted_date}
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
              Grounded in multi-modal inputs: 1 meeting transcript · 5 email threads · 3 calendars · 1 voice note.
            </p>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={handleCopyChatSnippet}>
            {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
            {copied ? 'Copied to Clipboard!' : 'Copy WhatsApp / Slack Brief'}
          </button>
        </div>

        {/* Priority Logic Pill */}
        <div style={{ marginTop: '16px', padding: '10px 14px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.25)', fontSize: '12px', color: '#c7d2fe', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={14} color="#818cf8" style={{ flexShrink: 0 }} />
          <span><strong>Priority Ordering:</strong> {priority_rules_explanation}</span>
        </div>
      </div>

      {/* SECTION 1: OVERDUE (Rank 1 - Immediate Attention) */}
      {overdue.length > 0 && (
        <div className="brief-section">
          <div className="section-header">
            <h3 className="section-title" style={{ color: '#f87171' }}>
              <AlertCircle size={18} /> 1. Immediate Attention — Overdue Commitments ({overdue.length})
            </h3>
          </div>
          <div className="commitment-list">
            {overdue.map((c) => (
              <div key={c.commitment_id} className="commitment-card" onClick={() => onSelectCommitment(c)} style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                <div className="card-top">
                  <div className="card-title-group">
                    <div className="card-title" style={{ color: '#fca5a5' }}>
                      [OVERDUE by {c.days_overdue || 1}d] {c.title}
                    </div>
                    <div className="card-desc" style={{ marginTop: '4px' }}>
                      <strong style={{ color: '#e2e8f0' }}>Fact (Ground Truth):</strong> {c.description}
                    </div>
                  </div>
                  <span className="badge badge-overdue">
                    <AlertCircle size={12} /> Overdue ({c.days_overdue || 1}d)
                  </span>
                </div>

                {/* Advisory Suggestion Box */}
                {c.advisory && (
                  <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '6px', borderLeft: '3px solid #ef4444', fontSize: '12px' }}>
                    <div style={{ fontWeight: 700, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={13} /> Recommended Action:
                    </div>
                    <div style={{ color: '#f8fafc', marginTop: '2px' }}>{c.advisory.action}</div>
                    <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}><em>Rationale:</em> {c.advisory.rationale}</div>
                  </div>
                )}

                <div className="card-meta">
                  <span>Owner: <strong>{c.owner}</strong></span>
                  <span>Recipient: <strong>{c.recipient}</strong></span>
                  <span>Target: <strong>{c.deadline?.date} ({c.deadline?.time_of_day || 'EOD'})</strong></span>
                  <span style={{ marginLeft: 'auto', color: '#818cf8', fontWeight: 600 }}>
                    Sources: {c.source_ids?.join(", ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: DUE TODAY (Rank 2) */}
      <div className="brief-section">
        <div className="section-header">
          <h3 className="section-title" style={{ color: '#818cf8' }}>
            <Target size={18} /> 2. Priority Actions for Arjun (Due Today: {due_today.length})
          </h3>
        </div>
        {due_today.length === 0 ? (
          <div className="glass-panel" style={{ padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
            No direct actions due today ({reference_date}).
          </div>
        ) : (
          <div className="commitment-list">
            {due_today.map((c) => (
              <div key={c.commitment_id} className="commitment-card" onClick={() => onSelectCommitment(c)}>
                <div className="card-top">
                  <div className="card-title-group">
                    <div className="card-title">{c.title}</div>
                    <div className="card-desc">{c.description}</div>
                  </div>
                  <span className="badge badge-my-action">
                    <Clock size={12} /> Due Today ({c.deadline?.time_of_day || 'EOD'})
                  </span>
                </div>

                {c.advisory && (
                  <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '6px', borderLeft: '3px solid #6366f1', fontSize: '12px' }}>
                    <div style={{ fontWeight: 700, color: '#c7d2fe', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={13} /> Suggestion:
                    </div>
                    <div style={{ color: '#f8fafc', marginTop: '2px' }}>{c.advisory.action}</div>
                  </div>
                )}

                <div className="card-meta">
                  <span>To: <strong>{c.recipient}</strong></span>
                  <span>Deadline: <strong>{c.deadline?.date} ({c.deadline?.time_of_day || 'EOD'})</strong></span>
                  <span style={{ marginLeft: 'auto', color: '#818cf8', fontWeight: 600 }}>
                    Sources: {c.source_ids?.join(", ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: RELEVANT MEETINGS (Calendar Integration) */}
      <div className="brief-section">
        <div className="section-header">
          <h3 className="section-title" style={{ color: '#38bdf8' }}>
            <Calendar size={18} /> 3. Relevant Meetings & Scheduled Calls ({meetings.length})
          </h3>
        </div>
        {meetings.length === 0 ? (
          <div className="glass-panel" style={{ padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
            No meetings scheduled on calendar for today.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {meetings.map((m) => (
              <div key={m.entry_id} className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #38bdf8' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                  {m.type === 'external_call' ? <PhoneCall size={18} /> : <Calendar size={18} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>{m.event}</div>
                  <div style={{ fontSize: '12px', color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                    {m.time_start} – {m.time_end} · <span style={{ textTransform: 'capitalize' }}>{m.type.replace('_', ' ')}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Source: {m.source_id}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4: UNCLEAR OWNERSHIP & RISK ALERTS */}
      <div className="brief-section">
        <div className="section-header">
          <h3 className="section-title" style={{ color: '#f472b6' }}>
            <HelpCircle size={18} /> 4. Flagged for Ownership Assignment ({unclear_ownership.length})
          </h3>
        </div>
        {unclear_ownership.length === 0 ? (
          <div className="glass-panel" style={{ padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
            All commitments have verified executive owners.
          </div>
        ) : (
          <div className="commitment-list">
            {unclear_ownership.map((c) => (
              <div key={c.commitment_id} className="commitment-card" onClick={() => onSelectCommitment(c)} style={{ borderColor: 'rgba(236, 72, 153, 0.4)' }}>
                <div className="card-top">
                  <div className="card-title-group">
                    <div className="card-title" style={{ color: '#fbcfe8' }}>{c.title}</div>
                    <div className="card-desc">{c.description}</div>
                  </div>
                  <span className="badge badge-unclear">
                    <AlertCircle size={12} /> Needs Decision
                  </span>
                </div>

                <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(236, 72, 153, 0.08)', borderRadius: '6px', borderLeft: '3px solid #ec4899', fontSize: '12px' }}>
                  <div style={{ fontWeight: 700, color: '#fbcfe8' }}>⚠️ Risk Reason:</div>
                  <div style={{ color: '#e2e8f0', marginTop: '2px' }}>{c.uncertainty_note || 'Owner not established in source data. Do not assume ownership.'}</div>
                  {c.advisory && (
                    <div style={{ marginTop: '4px', color: '#f472b6' }}>
                      <strong>Recommended Follow-up:</strong> {c.advisory.action}
                    </div>
                  )}
                </div>

                <div className="card-meta">
                  <span>Assigned Owner: <strong style={{ color: '#f472b6' }}>Unassigned</strong></span>
                  <span>Hard Deadline: <strong>{c.deadline?.date || 'Urgent'}</strong></span>
                  <span style={{ marginLeft: 'auto', color: '#818cf8', fontWeight: 600 }}>
                    Sources: {c.source_ids?.join(", ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 5: UPCOMING DEADLINES */}
      <div className="brief-section">
        <div className="section-header">
          <h3 className="section-title" style={{ color: '#a78bfa' }}>
            <Clock size={18} /> 5. Upcoming Deadlines (Next 1–3 Days: {upcoming.length})
          </h3>
        </div>
        {upcoming.length === 0 ? (
          <div className="glass-panel" style={{ padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
            No upcoming deadlines scheduled in the next 3 days.
          </div>
        ) : (
          <div className="commitment-list">
            {upcoming.map((c) => (
              <CommitmentCard
                key={c.commitment_id}
                commitment={c}
                onClick={onSelectCommitment}
              />
            ))}
          </div>
        )}
      </div>

      {/* SECTION 6: WAITING ON OTHERS */}
      <div className="brief-section">
        <div className="section-header">
          <h3 className="section-title" style={{ color: '#fbbf24' }}>
            <Clock size={18} /> 6. Waiting on Others — External Dependencies ({waiting_on_others.length})
          </h3>
        </div>
        {waiting_on_others.length === 0 ? (
          <div className="glass-panel" style={{ padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
            No active external deliverables pending from colleagues.
          </div>
        ) : (
          <div className="commitment-list">
            {waiting_on_others.map((c) => (
              <CommitmentCard
                key={c.commitment_id}
                commitment={c}
                onClick={onSelectCommitment}
              />
            ))}
          </div>
        )}
      </div>

      {/* SECTION 7: COMPLETED */}
      {completed.length > 0 && (
        <div className="brief-section">
          <div className="section-header">
            <h3 className="section-title" style={{ color: '#34d399' }}>
              <CheckCircle2 size={18} /> 7. Recently Completed / Resolved ({completed.length})
            </h3>
          </div>
          <div className="commitment-list">
            {completed.map((c) => (
              <CommitmentCard
                key={c.commitment_id}
                commitment={c}
                onClick={onSelectCommitment}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
