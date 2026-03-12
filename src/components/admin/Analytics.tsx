import { Incident } from '../../lib/types';
import { BarChart3, TrendingUp, Clock, Users, Shield, AlertTriangle, ArrowUpRight } from 'lucide-react';
import './Analytics.css';

interface AnalyticsProps {
  incidents: Incident[];
}

export default function Analytics({ incidents }: AnalyticsProps) {
  const blocked = incidents.filter(i => i.action === 'block');
  const alerted = incidents.filter(i => i.action === 'alert');
  const allowed = incidents.filter(i => i.action === 'allow');
  const uniqueSenders = new Set(incidents.map(i => i.sender));
  const uniqueReceivers = new Set(incidents.filter(i => i.action !== 'allow').map(i => i.receiver));

  // Category breakdown
  const categoryMap = new Map<string, number>();
  incidents.forEach(i => {
    categoryMap.set(i.category, (categoryMap.get(i.category) || 0) + 1);
  });
  const categories = [...categoryMap.entries()].sort((a, b) => b[1] - a[1]);
  const maxCategoryCount = Math.max(...categories.map(c => c[1]), 1);

  // Hourly breakdown (last 24h)
  const hourlyMap = new Map<number, { blocked: number; alerted: number; allowed: number }>();
  for (let h = 0; h < 24; h++) {
    hourlyMap.set(h, { blocked: 0, alerted: 0, allowed: 0 });
  }
  incidents.forEach(i => {
    const h = new Date(i.timestamp).getHours();
    const entry = hourlyMap.get(h)!;
    if (i.action === 'block') entry.blocked++;
    else if (i.action === 'alert') entry.alerted++;
    else entry.allowed++;
  });
  const hourlyData = [...hourlyMap.entries()].map(([hour, data]) => ({ hour, ...data }));
  const maxHourly = Math.max(...hourlyData.map(d => d.blocked + d.alerted + d.allowed), 1);

  // Avg harm score
  const avgHarmScore = incidents.length > 0
    ? incidents.reduce((sum, i) => sum + i.harm_score, 0) / incidents.length
    : 0;

  // Top offenders
  const offenderMap = new Map<string, number>();
  incidents.filter(i => i.action !== 'allow').forEach(i => {
    offenderMap.set(i.sender, (offenderMap.get(i.sender) || 0) + 1);
  });
  const topOffenders = [...offenderMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Recent timeline
  const recentIncidents = incidents.slice(0, 8);

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div className="analytics-header-icon">
          <BarChart3 size={22} />
        </div>
        <div>
          <h2>Analytics Dashboard</h2>
          <p className="analytics-subtitle">Real-time threat analysis and incident metrics</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="an-stats-row">
        <div className="an-stat">
          <span className="an-stat-value font-mono">{incidents.length}</span>
          <span className="an-stat-label">Total Incidents</span>
        </div>
        <div className="an-stat">
          <span className="an-stat-value font-mono text-red">{blocked.length}</span>
          <span className="an-stat-label">Blocked</span>
        </div>
        <div className="an-stat">
          <span className="an-stat-value font-mono text-amber">{alerted.length}</span>
          <span className="an-stat-label">Alerted</span>
        </div>
        <div className="an-stat">
          <span className="an-stat-value font-mono text-green">{allowed.length}</span>
          <span className="an-stat-label">Allowed</span>
        </div>
        <div className="an-stat">
          <span className="an-stat-value font-mono">{avgHarmScore.toFixed(2)}</span>
          <span className="an-stat-label">Avg Harm Score</span>
        </div>
        <div className="an-stat">
          <span className="an-stat-value font-mono">{uniqueReceivers.size}</span>
          <span className="an-stat-label">Protected Users</span>
        </div>
      </div>

      {/* Action Distribution Bar */}
      <div className="an-section">
        <h3 className="an-section-title">Action Distribution</h3>
        <div className="an-action-bar">
          {incidents.length > 0 ? (
            <>
              <div className="an-bar-segment bar-block" style={{ flex: blocked.length }} title={`Blocked: ${blocked.length}`} />
              <div className="an-bar-segment bar-alert" style={{ flex: alerted.length }} title={`Alerted: ${alerted.length}`} />
              <div className="an-bar-segment bar-allow" style={{ flex: allowed.length }} title={`Allowed: ${allowed.length}`} />
            </>
          ) : (
            <div className="an-bar-segment bar-empty" style={{ flex: 1 }} />
          )}
        </div>
        <div className="an-bar-legend">
          <span className="an-legend-item"><span className="an-dot dot-block" /> Blocked ({blocked.length})</span>
          <span className="an-legend-item"><span className="an-dot dot-alert" /> Alerted ({alerted.length})</span>
          <span className="an-legend-item"><span className="an-dot dot-allow" /> Allowed ({allowed.length})</span>
        </div>
      </div>

      <div className="an-grid">
        {/* Category Breakdown */}
        <div className="an-section">
          <h3 className="an-section-title">Category Breakdown</h3>
          <div className="an-category-list">
            {categories.length === 0 ? (
              <p className="an-empty-text">No incidents to analyze</p>
            ) : (
              categories.map(([cat, count]) => (
                <div key={cat} className="an-category-row">
                  <span className="an-category-name">{cat}</span>
                  <div className="an-category-bar-wrap">
                    <div className="an-category-bar" style={{ width: `${(count / maxCategoryCount) * 100}%` }} />
                  </div>
                  <span className="an-category-count font-mono">{count}</span>
                  <span className="an-category-pct font-mono">{((count / incidents.length) * 100).toFixed(0)}%</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Hourly Heatmap */}
        <div className="an-section">
          <h3 className="an-section-title">
            <Clock size={14} />
            Hourly Activity (24h)
          </h3>
          <div className="an-hourly-grid">
            {hourlyData.map(d => {
              const total = d.blocked + d.alerted + d.allowed;
              const intensity = total / maxHourly;
              return (
                <div key={d.hour} className="an-hourly-cell" title={`${d.hour}:00 — ${total} incidents`}>
                  <div
                    className="an-hourly-fill"
                    style={{ opacity: Math.max(intensity, 0.05), height: `${Math.max(intensity * 100, 5)}%` }}
                  />
                  <span className="an-hourly-label font-mono">{String(d.hour).padStart(2, '0')}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="an-grid">
        {/* Top Offenders */}
        <div className="an-section">
          <h3 className="an-section-title">
            <AlertTriangle size={14} />
            Top Offenders
          </h3>
          {topOffenders.length === 0 ? (
            <p className="an-empty-text">No offenders detected</p>
          ) : (
            <div className="an-offender-list">
              {topOffenders.map(([user, count], idx) => (
                <div key={user} className="an-offender-row">
                  <span className="an-offender-rank font-mono">#{idx + 1}</span>
                  <div className="an-offender-avatar">{user.charAt(0).toUpperCase()}</div>
                  <span className="an-offender-name">{user}</span>
                  <span className="an-offender-count font-mono">{count} incidents</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Timeline */}
        <div className="an-section">
          <h3 className="an-section-title">
            <Clock size={14} />
            Recent Activity Timeline
          </h3>
          {recentIncidents.length === 0 ? (
            <p className="an-empty-text">No recent activity</p>
          ) : (
            <div className="an-timeline">
              {recentIncidents.map(i => (
                <div key={i.id} className="an-timeline-row">
                  <div className={`an-timeline-dot dot-${i.action}`} />
                  <div className="an-timeline-info">
                    <span className="an-timeline-action">
                      <strong>{i.sender}</strong> → {i.receiver}
                    </span>
                    <span className="an-timeline-meta">
                      {i.category} · Score: {i.harm_score.toFixed(2)}
                    </span>
                  </div>
                  <span className={`an-timeline-badge badge-${i.action}`}>{i.action}</span>
                  <span className="an-timeline-time font-mono">
                    {new Date(i.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}