import React, { useState } from 'react';
import { X, Copy, Check, Download, FileText, MessageSquare, Code } from 'lucide-react';

export default function BriefExportModal({ briefData, onClose }) {
  const [activeTab, setActiveTab] = useState('markdown');
  const [copied, setCopied] = useState(false);

  if (!briefData) return null;

  const { markdown = '', chat_snippet = '', reference_date } = briefData;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (filename, content, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="evidence-drawer-overlay" onClick={onClose}>
      <div 
        className="glass-panel" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: '750px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          margin: 'auto',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border-card)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#818cf8" /> Export Executive Brief — {reference_date}
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', padding: '14px 24px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            className={`tab-btn ${activeTab === 'markdown' ? 'active' : ''}`}
            onClick={() => setActiveTab('markdown')}
          >
            <FileText size={14} /> Markdown Format
          </button>
          <button
            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={14} /> WhatsApp / Slack
          </button>
          <button
            className={`tab-btn ${activeTab === 'json' ? 'active' : ''}`}
            onClick={() => setActiveTab('json')}
          >
            <Code size={14} /> Structured JSON
          </button>
        </div>

        {/* Content Box */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {activeTab === 'markdown' && (
            <div className="markdown-preview">
              {markdown}
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="markdown-preview" style={{ background: '#07161b', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              {chat_snippet}
            </div>
          )}

          {activeTab === 'json' && (
            <div className="markdown-preview">
              {JSON.stringify(briefData.brief_data, null, 2)}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid var(--border-card)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {activeTab === 'markdown' && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => handleDownload(`executive_brief_${reference_date}.md`, markdown, 'text/markdown')}
              >
                <Download size={13} /> Download .md
              </button>
            )}
            {activeTab === 'json' && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => handleDownload(`brief_data_${reference_date}.json`, JSON.stringify(briefData.brief_data, null, 2), 'application/json')}
              >
                <Download size={13} /> Download .json
              </button>
            )}
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => handleCopy(activeTab === 'markdown' ? markdown : activeTab === 'chat' ? chat_snippet : JSON.stringify(briefData.brief_data, null, 2))}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
