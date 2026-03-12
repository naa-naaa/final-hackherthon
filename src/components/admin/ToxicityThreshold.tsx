import { useState } from 'react';
import { Incident } from '../../lib/types';
import { Activity, TrendingUp, Circle } from 'lucide-react';
import './ToxicityThreshold.css';

interface ToxicityThresholdProps {
  incidents: Incident[];
  onSelectIncident?: (incident: Incident) => void;
}

// Youden J thresholds
const T_ALLOW = 0.4;
const T_BLOCK = 0.8;

function getZone(score: number): 'allow' | 'alert' | 'block' {
  if (score < T_ALLOW) return 'allow';
  if (score < T_BLOCK) return 'alert';
  return 'block';
}

const ZONE_LABELS = {
  allow: { label: 'SAFE', color: '#10B981', bg: 'rgba(16,185,129,0.08)', desc: 'Score < 0.4 — Message allowed' },
  alert: { label: 'WARNING', color: '#FBBF24', bg: 'rgba(251,191,36,0.08)', desc: '0.4 ≤ Score < 0.8 — User alerted' },
  block: { label: 'BLOCKED', color: '#F43F5E', bg: 'rgba(244,63,94,0.08)', desc: 'Score ≥ 0.8 — Message shadowbanned' },
};

export default function ToxicityThreshold({ incidents, onSelectIncident }: ToxicityThresholdProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'allow' | 'alert' | 'block'>('all');

  const scoredIncidents = incidents.map(i => ({
    ...i,
    zone: getZone(i.harm_score),
  }));

  const filtered = filter === 'all' ? scoredIncidents : scoredIncidents.filter(i => i.zone === filter);

  // Zone counts
  const counts = {
    allow: scoredIncidents.filter(i => i.zone === 'allow').length,
    alert: scoredIncidents.filter(i => i.zone === 'alert').length,
    block: scoredIncidents.filter(i => i.zone === 'block').length,
  };

  const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' });

  return (
    <div className="tt-page">
      <div className="tt-header">
        <div className="tt-header-icon">
          <Activity size={22} />
        </div>
        <div>
          <h2>Youden J Threshold Analysis</h2>
          <p className="tt-subtitle">Toxicity score distribution across the decision boundary</p>
        </div>
        <span className="tt-timestamp font-mono">Last updated: {now}</span>
      </div>

      {/* Zone legend + counts */}
      <div className="tt-zones">
        {(['allow', 'alert', 'block'] as const).map(zone => (
          <button
            key={zone}
            className={`tt-zone-card zone-${zone} ${filter === zone ? 'active' : ''}`}
            onClick={() => setFilter(filter === zone ? 'all' : zone)}
            style={{ borderColor: filter === zone ? ZONE_LABELS[zone].color : undefined }}
          >
            <div className="tt-zone-top">
              <Circle size={10} fill={ZONE_LABELS[zone].color} color={ZONE_LABELS[zone].color} />
              <span className="tt-zone-label" style={{ color: ZONE_LABELS[zone].color }}>{ZONE_LABELS[zone].label}</span>
            </div>
            <span className="tt-zone-count font-mono">{counts[zone]}</span>
            <span className="tt-zone-desc">{ZONE_LABELS[zone].desc}</span>
          </button>
        ))}
      </div>

      {/* The graph */}
      <div className="tt-graph-wrap">
        <div className="tt-graph">
          {/* Y-axis labels */}
          <div className="tt-yaxis">
            <span>1.0</span>
            <span>0.8</span>
            <span>0.4</span>
            <span>0.0</span>
          </div>

          {/* Plot area */}
          <div className="tt-plot">
            {/* Zone backgrounds */}
            <div className="tt-zone-bg zone-block-bg" style={{ height: `${(1 - T_BLOCK) * 100}%` }} />
            <div className="tt-zone-bg zone-alert-bg" style={{ height: `${(T_BLOCK - T_ALLOW) * 100}%` }} />
            <div className="tt-zone-bg zone-allow-bg" style={{ height: `${T_ALLOW * 100}%` }} />

            {/* Threshold lines */}
            <div className="tt-threshold-line tt-line-block" style={{ bottom: `${T_BLOCK * 100}%` }}>
              <span className="tt-line-label font-mono">0.80 — Block threshold (Youden J)</span>
            </div>
            <div className="tt-threshold-line tt-line-alert" style={{ bottom: `${T_ALLOW * 100}%` }}>
              <span className="tt-line-label font-mono">0.40 — Alert threshold</span>
            </div>

            {/* Data bars */}
            <div className="tt-bars">
              {filtered.length === 0 ? (
                <div className="tt-empty">No incidents to display</div>
              ) : (
                filtered.map((incident, idx) => {
                  const hovered = hoveredId === incident.id;
                  const zone = incident.zone;
                  const pct = incident.harm_score * 100;

                  return (
                    <div
                      key={incident.id}
                      className={`tt-bar-wrap ${hovered ? 'hovered' : ''}`}
                      onMouseEnter={() => setHoveredId(incident.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => onSelectIncident?.(incident)}
                      title={`${incident.sender}→${incident.receiver}: ${incident.harm_score.toFixed(3)}`}
                    >
                      <div
                        className={`tt-bar zone-${zone}`}
                        style={{ height: `${pct}%` }}
                      />
                      {hovered && (
                        <div className="tt-bar-tooltip">
                          <strong>{incident.sender} → {incident.receiver}</strong>
                          <span className="font-mono">{incident.harm_score.toFixed(3)}</span>
                          <span className="tt-tooltip-cat">{incident.category}</span>
                          <span className="tt-tooltip-time font-mono">
                            {new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* X-axis: incident index */}
          <div className="tt-xaxis-label">Incidents (chronological) — {filtered.length} shown</div>
        </div>
      </div>

      {/* Score distribution table */}
      <div className="tt-section">
        <h3 className="tt-section-title">
          <TrendingUp size={14} />
          Score Distribution Table
          <span className="tt-section-time font-mono">{now}</span>
        </h3>
        <div className="tt-table-wrap">
          <table className="tt-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Sender → Receiver</th>
                <th>Category</th>
                <th>Harm Score</th>
                <th>T1</th>
                <th>T2</th>
                <th>T3</th>
                <th>Zone</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 30).map((i, idx) => (
                <tr
                  key={i.id}
                  className={`tt-row zone-row-${i.zone} ${i.id === hoveredId ? 'row-hovered' : ''}`}
                  onMouseEnter={() => setHoveredId(i.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => onSelectIncident?.(i)}
                >
                  <td className="font-mono">{idx + 1}</td>
                  <td>{i.sender} → {i.receiver}</td>
                  <td className="tt-cat">{i.category}</td>
                  <td className="font-mono">
                    <span className={`tt-score-pill score-${i.zone}`}>{i.harm_score.toFixed(3)}</span>
                  </td>
                  <td className="font-mono">{i.agent_t1?.toFixed(2) ?? '—'}</td>
                  <td className="font-mono">{i.agent_t2?.toFixed(2) ?? '—'}</td>
                  <td className="font-mono">{i.agent_t3?.toFixed(2) ?? '—'}</td>
                  <td>
                    <span className={`tt-zone-pill zone-${i.zone}`}>{ZONE_LABELS[i.zone].label}</span>
                  </td>
                  <td className="font-mono tt-time">
                    {new Date(i.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    <br />
                    <span className="tt-date">{new Date(i.timestamp).toLocaleDateString('en-IN')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}