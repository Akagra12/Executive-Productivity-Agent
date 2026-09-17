import React, { useState } from 'react';
import { 
  Search, 
  Send, 
  Sparkles, 
  XCircle, 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle, 
  FileText,
  Bot,
  Zap
} from 'lucide-react';

export default function QueryBar({ onSelectCommitment, selectedDate }) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const sampleQueries = [
    "What did I promise Raghav?",
    "What needs action today?",
    "What am I waiting on?",
    "Which tasks have unclear ownership?",
    "What deadlines are coming up?",
  ];

  const handleSearch = async (textToSearch) => {
    const q = (textToSearch !== undefined ? textToSearch : query).trim();
    if (!q) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, date: selectedDate }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('AI chat failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleChipClick = (suggestion) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  const clearQuery = () => {
    setQuery('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="query-bar-container glass-panel">
      <div className="query-input-wrap">
        <Sparkles size={18} color="#818cf8" />
        <input
          type="text"
          placeholder="Ask your Executive AI Agent (e.g. 'What did I promise Raghav?', 'What needs action today?')..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button className="btn btn-ghost btn-sm" onClick={clearQuery} style={{ padding: '2px 6px' }}>
            <XCircle size={14} />
          </button>
        )}
        <button
          className="btn btn-primary btn-sm"
          onClick={() => handleSearch()}
          disabled={isLoading || !query.trim()}
        >
          <Send size={13} />
          {isLoading ? 'Reasoning...' : 'Ask AI Agent'}
        </button>
      </div>

      {/* Suggested Chips */}
      <div className="query-suggestions">
        <span>Suggested questions:</span>
        {sampleQueries.map((item, idx) => (
          <button
            key={idx}
            className="suggestion-pill"
            onClick={() => handleChipClick(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div style={{ marginTop: '14px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '13px' }}>
          <AlertTriangle size={14} style={{ display: 'inline', marginRight: '6px' }} />
          Chat query error: {error}
        </div>
      )}

      {/* Result Display Box */}
      {result && (
        <div className="query-result-box">
          <div className="query-result-header">
            <span className="query-result-title">
              <Bot size={16} color="#818cf8" /> 
              {result.provider === 'deterministic_grounded_engine' ? 'Grounded Knowledge Engine' : `AI Agent (${result.provider?.toUpperCase() || 'LLM'})`}
            </span>
            <span className="query-confidence">
              Model: <strong style={{ color: '#818cf8' }}>{result.model || 'grounded-rag'}</strong> · {result.is_fallback ? 'Offline Safe Mode' : 'Online LLM'}
            </span>
          </div>

          <div className="query-answer-text" style={{ whiteSpace: 'pre-line', lineHeight: 1.6, color: '#f8fafc', fontSize: '14px' }}>
            {result.answer}
          </div>

          {/* Supporting Evidence Badges */}
          {result.sources && result.sources.length > 0 && (
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                Supporting Source Evidence Citations ({result.sources.length}):
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {result.sources.map((src, idx) => (
                  <span key={idx} className="tag font-mono" style={{ fontSize: '11px', color: '#a5b4fc', background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.35)' }}>
                    <FileText size={10} style={{ display: 'inline', marginRight: '3px' }} />
                    {src}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Matched Commitments List */}
          {result.commitments && result.commitments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                Related Task Records ({result.commitments.length}):
              </div>
              {result.commitments.slice(0, 3).map((c) => (
                <div
                  key={c.commitment_id}
                  className="commitment-card"
                  style={{ padding: '12px 14px', background: 'rgba(15, 21, 35, 0.9)' }}
                  onClick={() => onSelectCommitment(c)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc' }}>
                      {c.title}
                    </span>
                    <span style={{ fontSize: '11px', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Inspect Evidence <ArrowRight size={12} />
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    {c.description}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
                    <span>Owner: <strong>{c.owner}</strong></span>
                    <span>Deadline: <strong>{c.deadline}</strong></span>
                    <span>Status: <strong style={{ color: '#818cf8' }}>{c.computed_status}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
