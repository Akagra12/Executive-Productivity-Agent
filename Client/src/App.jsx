import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import QueryBar from './components/QueryBar';
import StatsOverview from './components/StatsOverview';
import DailyBriefView from './components/DailyBriefView';
import CommitmentCard from './components/CommitmentCard';
import EvidenceDrawer from './components/EvidenceDrawer';
import DeduplicationInspector from './components/DeduplicationInspector';
import RawDataViewer from './components/RawDataViewer';
import BriefExportModal from './components/BriefExportModal';
import { 
  Sparkles, 
  Target, 
  Clock, 
  HelpCircle, 
  CheckCircle2, 
  Layers, 
  Database, 
  ListFilter,
  AlertCircle
} from 'lucide-react';
import './App.css';

export default function App() {
  const [selectedDate, setSelectedDate] = useState('2026-09-23');
  const [activeTab, setActiveTab] = useState('brief');
  const [briefData, setBriefData] = useState(null);
  const [classifiedData, setClassifiedData] = useState(null);
  const [selectedCommitment, setSelectedCommitment] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load all commitments and brief data whenever selectedDate changes
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [briefRes, classifyRes] = await Promise.all([
        fetch(`/api/brief?date=${selectedDate}`),
        fetch(`/api/commitments/classify?date=${selectedDate}`),
      ]);

      const [briefJson, classifyJson] = await Promise.all([
        briefRes.json(),
        classifyRes.json(),
      ]);

      setBriefData(briefJson);
      setClassifiedData(classifyJson);
    } catch (err) {
      console.error('Failed to fetch agent data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Re-trigger ingestion pipeline
      await fetch('/api/ingest');
    } catch (e) {
      console.warn('Ingest re-run error:', e);
    }
    await fetchData();
  };

  // Get grouped commitments for the tab views
  const grouped = classifiedData?.grouped || {};
  const allClassified = classifiedData?.all_classified || [];

  // Filter list based on active tab
  let currentList = [];
  if (activeTab === 'my_actions') {
    currentList = grouped.my_action || [];
  } else if (activeTab === 'waiting') {
    currentList = grouped.waiting_on_others || [];
  } else if (activeTab === 'unclear') {
    currentList = grouped.unclear_ownership || [];
  } else if (activeTab === 'completed') {
    currentList = grouped.completed || [];
  } else if (activeTab === 'overdue') {
    currentList = (grouped.my_action || []).filter((c) => c.computed_status === 'overdue');
  } else if (activeTab === 'all') {
    currentList = allClassified;
  }

  return (
    <div className="app-container">
      {/* Executive Header */}
      <Header
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onExportBrief={() => setShowExportModal(true)}
        stats={briefData?.stats}
      />

      {/* Interactive AI Query Bar */}
      <QueryBar
        selectedDate={selectedDate}
        onSelectCommitment={(c) => setSelectedCommitment(c)}
      />

      {/* Quick Metrics Bar */}
      <StatsOverview
        stats={briefData?.stats}
        activeTab={activeTab}
        onTabSelect={(tabId) => setActiveTab(tabId)}
      />

      {/* Navigation Tabs */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'brief' ? 'active' : ''}`}
          onClick={() => setActiveTab('brief')}
        >
          <Sparkles size={15} color="#818cf8" />
          <span>Daily Action Brief</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'my_actions' ? 'active' : ''}`}
          onClick={() => setActiveTab('my_actions')}
        >
          <Target size={15} color="#818cf8" />
          <span>My Actions</span>
          <span className="tab-badge">{grouped.my_action?.length || 0}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'waiting' ? 'active' : ''}`}
          onClick={() => setActiveTab('waiting')}
        >
          <Clock size={15} color="#fbbf24" />
          <span>Waiting on Others</span>
          <span className="tab-badge">{grouped.waiting_on_others?.length || 0}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'unclear' ? 'active' : ''}`}
          onClick={() => setActiveTab('unclear')}
        >
          <HelpCircle size={15} color="#f472b6" />
          <span>Unclear Ownership</span>
          <span className="tab-badge">{grouped.unclear_ownership?.length || 0}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          <CheckCircle2 size={15} color="#34d399" />
          <span>Completed</span>
          <span className="tab-badge">{grouped.completed?.length || 0}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <ListFilter size={15} />
          <span>All Matrix ({allClassified.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'dedup' ? 'active' : ''}`}
          onClick={() => setActiveTab('dedup')}
        >
          <Layers size={15} color="#c084fc" />
          <span>Deduplication Inspector</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
          onClick={() => setActiveTab('raw')}
        >
          <Database size={15} color="#38bdf8" />
          <span>Raw Data Pack</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <main>
        {isLoading ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            <div className="font-mono" style={{ fontSize: '14px', marginBottom: '8px' }}>
              Synthesizing Executive Action Space for {selectedDate}...
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Resolving deadlines, classifying ownership, and running deterministic deduplication
            </div>
          </div>
        ) : activeTab === 'brief' ? (
          <DailyBriefView
            briefData={briefData}
            onSelectCommitment={(c) => setSelectedCommitment(c)}
          />
        ) : activeTab === 'dedup' ? (
          <DeduplicationInspector selectedDate={selectedDate} />
        ) : activeTab === 'raw' ? (
          <RawDataViewer />
        ) : (
          <div className="brief-section">
            <div className="section-header">
              <h3 className="section-title">
                {activeTab === 'my_actions' && <><Target size={18} color="#818cf8" /> My Direct Actions ({currentList.length})</>}
                {activeTab === 'waiting' && <><Clock size={18} color="#fbbf24" /> Delegated / Waiting on Others ({currentList.length})</>}
                {activeTab === 'unclear' && <><HelpCircle size={18} color="#f472b6" /> Unclear Ownership & Risk Alerts ({currentList.length})</>}
                {activeTab === 'completed' && <><CheckCircle2 size={18} color="#34d399" /> Completed Commitments ({currentList.length})</>}
                {activeTab === 'overdue' && <><AlertCircle size={18} color="#f87171" /> Overdue Commitments ({currentList.length})</>}
                {activeTab === 'all' && <><ListFilter size={18} /> Complete Commitments Master Matrix ({currentList.length})</>}
              </h3>
            </div>

            {currentList.length === 0 ? (
              <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                No commitments in this category for {selectedDate}.
              </div>
            ) : (
              <div className="commitment-list">
                {currentList.map((c) => (
                  <CommitmentCard
                    key={c.commitment_id}
                    commitment={c}
                    isSelected={selectedCommitment?.commitment_id === c.commitment_id}
                    onClick={(item) => setSelectedCommitment(item)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Interactive Evidence Drawer Modal */}
      {selectedCommitment && (
        <EvidenceDrawer
          commitment={selectedCommitment}
          onClose={() => setSelectedCommitment(null)}
        />
      )}

      {/* Brief Export Modal */}
      {showExportModal && (
        <BriefExportModal
          briefData={briefData}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
