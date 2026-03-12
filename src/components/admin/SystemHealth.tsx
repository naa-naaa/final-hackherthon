import { useState, useEffect } from 'react';
import { Shield, Activity, Eye, RefreshCw, Database, AlertTriangle } from 'lucide-react';
import './SystemHealth.css';

const ICON_MAP: Record<string, React.ReactNode> = {
  DLP: <Shield size={16} />,
  IDS: <Activity size={16} />,
  UEBA: <Eye size={16} />,
};

const STATUS_COLOR: Record<string, string> = {
  Active: 'var(--accent-green, #10B981)',
  Degraded: '#F59E0B',
  Error: '#E5254B',
};

interface SystemInfo {
  name: string;
  status: string;
  desc: string;
}

interface HealthData {
  systems: SystemInfo[];
  database: { connected: boolean };
  api_latency_ms: number;
  uptime_seconds: number;
  uptime_pct: number;
  last_check: string;
  recent_events: { log_type: string; username: string; detail: string; severity: string; timestamp: string }[];
}

export default function SystemHealth() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/admin/system-health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: HealthData = await res.json();
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to reach backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // Fallback to static data when backend unreachable
  const systems: SystemInfo[] = data?.systems ?? [
    { name: 'DLP', status: 'Active', desc: 'Scanning for PII' },
    { name: 'IDS', status: 'Active', desc: 'Rate monitoring' },
    { name: 'UEBA', status: 'Active', desc: 'Behavioral baseline' },
  ];

  return (
    <div className="system-health">
      <div className="sh-title-row">
        <div>
          <h2>System Health</h2>
          <p className="text-muted" style={{ fontSize: '13px', marginBottom: '20px' }}>
            DLP / IDS / UEBA monitoring status
          </p>
        </div>
        <button className="sh-refresh-btn" onClick={fetchHealth} title="Refresh">
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="sh-error">
          <AlertTriangle size={14} />
          <span>Backend unreachable — showing cached data</span>
        </div>
      )}

      <div className="health-grid">
        {systems.map(sys => (
          <div key={sys.name} className="health-card">
            <div className="health-card-header">
              <div className="health-icon">{ICON_MAP[sys.name] ?? <Shield size={16} />}</div>
              <span className="health-name font-mono">{sys.name}</span>
              <span className="health-status" style={{ color: STATUS_COLOR[sys.status] ?? STATUS_COLOR.Active }}>
                <span className="health-dot" style={{ background: STATUS_COLOR[sys.status] ?? STATUS_COLOR.Active }} />
                {sys.status}
              </span>
            </div>
            <p className="health-desc">— {sys.desc}</p>
          </div>
        ))}

        {/* Database status row */}
        <div className="health-card">
          <div className="health-card-header">
            <div className="health-icon"><Database size={16} /></div>
            <span className="health-name font-mono">PostgreSQL</span>
            <span className="health-status" style={{ color: data?.database.connected ? STATUS_COLOR.Active : STATUS_COLOR.Error }}>
              <span className="health-dot" style={{ background: data?.database.connected ? STATUS_COLOR.Active : STATUS_COLOR.Error }} />
              {data?.database.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <p className="health-desc">— Primary datastore</p>
        </div>
      </div>

      <div className="health-meta">
        <div className="health-meta-item">
          <span className="health-meta-label">Last Check</span>
          <span className="health-meta-value font-mono">
            {data ? new Date(data.last_check).toLocaleTimeString() : new Date().toLocaleTimeString()}
          </span>
        </div>
        <div className="health-meta-item">
          <span className="health-meta-label">Uptime</span>
          <span className="health-meta-value font-mono">
            {data ? formatUptime(data.uptime_seconds) : '—'}
          </span>
        </div>
        <div className="health-meta-item">
          <span className="health-meta-label">API Latency</span>
          <span className="health-meta-value font-mono">
            {data ? `${data.api_latency_ms}ms` : '—'}
          </span>
        </div>
      </div>

      {/* Recent security events */}
      {data && data.recent_events.length > 0 && (
        <div className="sh-events">
          <h3 className="sh-events-title">Recent Security Events</h3>
          <div className="sh-events-list">
            {data.recent_events.map((evt, i) => (
              <div key={i} className={`sh-event-row severity-${evt.severity}`}>
                <span className="sh-event-type font-mono">{evt.log_type}</span>
                <span className="sh-event-detail">{evt.detail}</span>
                <span className="sh-event-time font-mono">{new Date(evt.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
