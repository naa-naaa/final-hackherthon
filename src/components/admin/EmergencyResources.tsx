import { Phone, TrendingUp, Users, Clock, ArrowUpRight, ArrowDownRight, MessageSquare, Shield } from 'lucide-react';
import { Incident } from '../../lib/types';
import './EmergencyResources.css';

interface EmergencyResourcesProps {
  incidents: Incident[];
}

// Simulated resource usage data (would come from DB in production)
function generateResourceMetrics(incidents: Incident[]) {
  const blockedCount = incidents.filter(i => i.action === 'block').length;
  const alertedCount = incidents.filter(i => i.action === 'alert').length;

  return {
    helplineReferrals: Math.max(blockedCount * 2 + alertedCount, 3),
    resourcesSent: Math.max(blockedCount + Math.floor(alertedCount / 2), 2),
    victimsCounselled: Math.max(new Set(incidents.filter(i => i.action !== 'allow').map(i => i.receiver)).size, 1),
    sosTriggered: Math.max(Math.floor(blockedCount / 2), 0),
    channels: [
      { name: 'Women Helpline (181)', referrals: Math.max(blockedCount, 2), trend: +12 },
      { name: 'Cyber Crime (1930)', referrals: Math.max(Math.floor(blockedCount * 0.7), 1), trend: +8 },
      { name: 'iCall Counselling', referrals: Math.max(Math.floor(alertedCount * 0.5), 1), trend: +5 },
      { name: 'Childline (1098)', referrals: Math.max(Math.floor(blockedCount * 0.3), 0), trend: -2 },
      { name: 'Vandrevala Foundation', referrals: Math.max(Math.floor(alertedCount * 0.3), 1), trend: +3 },
      { name: 'Emergency (112)', referrals: Math.max(Math.floor(blockedCount * 0.2), 0), trend: 0 },
    ],
    recentReferrals: incidents
      .filter(i => i.action === 'block')
      .slice(0, 6)
      .map((i, idx) => ({
        victim: i.receiver,
        helpline: ['Women Helpline (181)', 'Cyber Crime (1930)', 'iCall', 'Childline'][idx % 4],
        time: i.timestamp,
        status: idx < 2 ? 'connected' : idx < 4 ? 'pending' : 'missed',
      })),
  };
}

export default function EmergencyResources({ incidents }: EmergencyResourcesProps) {
  const metrics = generateResourceMetrics(incidents);

  return (
    <div className="er-page">
      <div className="er-header">
        <div className="er-header-icon">
          <Phone size={22} />
        </div>
        <div>
          <h2>Resource Usage Dashboard</h2>
          <p className="er-subtitle">Track helpline referrals, resource delivery, and victim support metrics</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="er-stats-row">
        <div className="er-stat-card">
          <div className="er-stat-icon stat-green"><Phone size={18} /></div>
          <div className="er-stat-info">
            <span className="er-stat-value font-mono">{metrics.helplineReferrals}</span>
            <span className="er-stat-label">Helpline Referrals</span>
          </div>
          <span className="er-stat-trend trend-up"><ArrowUpRight size={14} /> 12%</span>
        </div>
        <div className="er-stat-card">
          <div className="er-stat-icon stat-blue"><MessageSquare size={18} /></div>
          <div className="er-stat-info">
            <span className="er-stat-value font-mono">{metrics.resourcesSent}</span>
            <span className="er-stat-label">Resources Shared</span>
          </div>
          <span className="er-stat-trend trend-up"><ArrowUpRight size={14} /> 8%</span>
        </div>
        <div className="er-stat-card">
          <div className="er-stat-icon stat-purple"><Users size={18} /></div>
          <div className="er-stat-info">
            <span className="er-stat-value font-mono">{metrics.victimsCounselled}</span>
            <span className="er-stat-label">Victims Supported</span>
          </div>
          <span className="er-stat-trend trend-up"><ArrowUpRight size={14} /> 5%</span>
        </div>
        <div className="er-stat-card">
          <div className="er-stat-icon stat-red"><Shield size={18} /></div>
          <div className="er-stat-info">
            <span className="er-stat-value font-mono">{metrics.sosTriggered}</span>
            <span className="er-stat-label">SOS Triggered</span>
          </div>
          <span className="er-stat-trend trend-down"><ArrowDownRight size={14} /> 3%</span>
        </div>
      </div>

      <div className="er-grid">
        {/* Helpline Usage Breakdown */}
        <div className="er-section">
          <h3 className="er-section-title">Helpline Referral Breakdown</h3>
          <div className="er-channel-list">
            {metrics.channels.map(ch => (
              <div key={ch.name} className="er-channel-row">
                <span className="er-channel-name">{ch.name}</span>
                <div className="er-channel-bar-wrap">
                  <div
                    className="er-channel-bar"
                    style={{ width: `${Math.min((ch.referrals / Math.max(...metrics.channels.map(c => c.referrals))) * 100, 100)}%` }}
                  />
                </div>
                <span className="er-channel-count font-mono">{ch.referrals}</span>
                <span className={`er-channel-trend ${ch.trend >= 0 ? 'trend-up' : 'trend-down'}`}>
                  {ch.trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(ch.trend)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Referrals */}
        <div className="er-section">
          <h3 className="er-section-title">Recent Referrals</h3>
          {metrics.recentReferrals.length === 0 ? (
            <div className="er-empty">
              <p>No referrals yet</p>
            </div>
          ) : (
            <div className="er-referral-list">
              {metrics.recentReferrals.map((ref, idx) => (
                <div key={idx} className="er-referral-row">
                  <div className="er-referral-avatar">
                    {ref.victim.charAt(0).toUpperCase()}
                  </div>
                  <div className="er-referral-info">
                    <span className="er-referral-victim">{ref.victim}</span>
                    <span className="er-referral-helpline">{ref.helpline}</span>
                  </div>
                  <span className={`er-referral-status status-${ref.status}`}>
                    {ref.status === 'connected' ? '🟢' : ref.status === 'pending' ? '🟡' : '🔴'} {ref.status}
                  </span>
                  <span className="er-referral-time font-mono">
                    {new Date(ref.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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