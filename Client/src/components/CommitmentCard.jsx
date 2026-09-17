import React from 'react';
import { 
  User, 
  Send, 
  Calendar, 
  AlertCircle, 
  FileSearch, 
  Clock, 
  CheckCircle2, 
  Layers 
} from 'lucide-react';

export default function CommitmentCard({ commitment, onClick, isSelected }) {
  if (!commitment) return null;

  const {
    commitment_id,
    title,
    description,
    owner,
    recipient,
    status,
    computed_status,
    days_overdue,
    deadline,
    source_ids = [],
    classification,
    _dedup,
  } = commitment;

  // Determine badge styling
  const isOverdue = computed_status === 'overdue' || (days_overdue && days_overdue > 0);
  const isDueToday = computed_status === 'due_today';
  const isCompleted = status === 'resolved' || classification?.label === 'completed';
  const isUnclear = status === 'unclear_ownership' || classification?.label === 'unclear_ownership';

  return (
    <div
      className={`commitment-card ${isSelected ? 'active-selected' : ''}`}
      onClick={() => onClick(commitment)}
    >
      <div className="card-top">
        <div className="card-title-group">
          <div className="card-title">{title}</div>
          <div className="card-desc">{description}</div>
        </div>

        <div className="card-badges">
          {isOverdue && (
            <span className="badge badge-overdue">
              <AlertCircle size={12} /> Overdue {days_overdue ? `(${days_overdue}d)` : ''}
            </span>
          )}

          {isDueToday && (
            <span className="badge badge-my-action" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.5)' }}>
              <Clock size={12} /> Due Today
            </span>
          )}

          {isUnclear && (
            <span className="badge badge-unclear">
              <AlertCircle size={12} /> Needs Owner
            </span>
          )}

          {isCompleted && (
            <span className="badge badge-completed">
              <CheckCircle2 size={12} /> Resolved
            </span>
          )}

          {_dedup?.merged && (
            <span className="badge" style={{ background: 'rgba(147, 51, 234, 0.15)', color: '#c084fc', border: '1px solid rgba(147, 51, 234, 0.4)' }}>
              <Layers size={11} /> Merged ({_dedup.merged_from})
            </span>
          )}
        </div>
      </div>

      <div className="card-meta">
        <div className="meta-item">
          <User size={13} color="#94a3b8" />
          <span>Owner: <strong>{owner ? owner.split('@')[0] : 'Unassigned'}</strong></span>
        </div>

        <div className="meta-item">
          <Send size={13} color="#94a3b8" />
          <span>To: <strong>{recipient ? recipient.split('@')[0] : 'Internal / All'}</strong></span>
        </div>

        <div className="meta-item">
          <Calendar size={13} color="#94a3b8" />
          <span>Target: <strong>{deadline?.date ? `${deadline.date} (${deadline.time_of_day || 'EOD'})` : 'No set date'}</strong></span>
        </div>

        <div className="meta-item" style={{ marginLeft: 'auto', color: '#818cf8', fontWeight: 600 }}>
          <FileSearch size={13} />
          <span>{source_ids.length} Source{source_ids.length > 1 ? 's' : ''} Trace</span>
        </div>
      </div>
    </div>
  );
}
