import React from 'react';
import { Target, Clock, AlertTriangle, HelpCircle, CheckCircle2 } from 'lucide-react';

export default function StatsOverview({ stats, activeTab, onTabSelect }) {
  if (!stats) return null;

  const cards = [
    {
      id: 'my_actions',
      label: 'My Actions',
      count: stats.my_actions_count ?? 0,
      sub: "Arjun's direct commitments",
      icon: Target,
      color: '#818cf8',
      badgeClass: 'badge-my-action',
    },
    {
      id: 'overdue',
      label: 'Overdue Items',
      count: stats.overdue_count ?? 0,
      sub: 'Passed target deadline',
      icon: AlertTriangle,
      color: '#f87171',
      badgeClass: 'badge-overdue',
    },
    {
      id: 'waiting',
      label: 'Waiting on Others',
      count: stats.waiting_count ?? 0,
      sub: 'External dependencies',
      icon: Clock,
      color: '#fbbf24',
      badgeClass: 'badge-waiting',
    },
    {
      id: 'unclear',
      label: 'Unclear Ownership',
      count: stats.unclear_count ?? 0,
      sub: 'Needs assignment',
      icon: HelpCircle,
      color: '#f472b6',
      badgeClass: 'badge-unclear',
    },
    {
      id: 'completed',
      label: 'Completed',
      count: stats.completed_count ?? 0,
      sub: 'Verified resolved',
      icon: CheckCircle2,
      color: '#34d399',
      badgeClass: 'badge-completed',
    },
  ];

  return (
    <div className="stats-grid">
      {cards.map((c) => {
        const Icon = c.icon;
        const isSelected = activeTab === c.id;
        return (
          <div
            key={c.id}
            className="stat-card glass-panel"
            style={{
              borderColor: isSelected ? c.color : undefined,
              boxShadow: isSelected ? `0 0 15px ${c.color}33` : undefined,
            }}
            onClick={() => onTabSelect(c.id)}
          >
            <div className="stat-card-header">
              <span className="stat-card-label">{c.label}</span>
              <Icon size={16} color={c.color} />
            </div>
            <div className="stat-card-value" style={{ color: c.color }}>
              {c.count}
            </div>
            <div className="stat-card-sub">{c.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
