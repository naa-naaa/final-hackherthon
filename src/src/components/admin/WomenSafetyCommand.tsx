import { Shield, Phone, FileText, AlertTriangle, Heart, Users, ExternalLink, Download, ShieldCheck } from 'lucide-react';
import { Incident } from '../../lib/types';
import './WomenSafetyCommand.css';

interface WomenSafetyCommandProps {
  incidents: Incident[];
}

const HELPLINES = [
  { name: 'Women Helpline', number: '181', desc: '24/7 toll-free, all states', icon: '🛡️', color: '#E5254B' },
  { name: 'NCW Helpline', number: '7827-170-170', desc: 'National Commission for Women', icon: '⚖️', color: '#6366F1' },
  { name: 'Police (Women)', number: '1091', desc: 'Women-specific police helpline', icon: '🚔', color: '#3B82F6' },
  { name: 'Emergency', number: '112', desc: 'National emergency number', icon: '🚨', color: '#E5254B' },
  { name: 'Cyber Crime', number: '1930', desc: 'Report cyber crimes online', icon: '💻', color: '#0891B2' },
  { name: 'Childline (POCSO)', number: '1098', desc: 'For minors under 18', icon: '👧', color: '#F59E0B' },
];

const SAFETY_CATEGORIES = ['harassment', 'sexual', 'threat', 'stalking', 'blackmail', 'abuse'];

export default function WomenSafetyCommand({ incidents }: WomenSafetyCommandProps) {
  // Calculate women safety stats from incidents
  const womenIncidents = incidents.filter(i =>
    SAFETY_CATEGORIES.some(cat => i.category?.toLowerCase().includes(cat)) || i.action === 'block'
  );
  const blockedCount = womenIncidents.filter(i => i.action === 'block').length;
  const alertedCount = womenIncidents.filter(i => i.action === 'alert').length;
  const uniqueVictims = new Set(womenIncidents.map(i => i.receiver));
  const uniquePredators = new Set(womenIncidents.filter(i => i.action !== 'allow').map(i => i.sender));

  const handleNCWReport = () => {
    const report = generateNCWReport(womenIncidents);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NCW-Complaint-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePOCSOReport = () => {
    const report = generatePOCSOReport(womenIncidents);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `POCSO-Report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="wsc-page">
      {/* Header */}
      <div className="wsc-header">
        <div className="wsc-header-left">
          <div className="wsc-header-icon">
            <Shield size={24} />
          </div>
          <div>
            <h2>Women Safety Command Center</h2>
            <p className="wsc-subtitle">Shakti Protection System · Real-time monitoring</p>
          </div>
        </div>
        <div className="wsc-header-badge">
          <ShieldCheck size={16} />
          <span>SHAKTI ACTIVE</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="wsc-stats-row">
        <div className="wsc-stat-card stat-red">
          <AlertTriangle size={20} />
          <div className="wsc-stat-info">
            <span className="wsc-stat-value font-mono">{blockedCount}</span>
            <span className="wsc-stat-label">Threats Blocked</span>
          </div>
        </div>
        <div className="wsc-stat-card stat-amber">
          <Shield size={20} />
          <div className="wsc-stat-info">
            <span className="wsc-stat-value font-mono">{alertedCount}</span>
            <span className="wsc-stat-label">Alerts Raised</span>
          </div>
        </div>
        <div className="wsc-stat-card stat-cyan">
          <Users size={20} />
          <div className="wsc-stat-info">
            <span className="wsc-stat-value font-mono">{uniqueVictims.size}</span>
            <span className="wsc-stat-label">Women Protected</span>
          </div>
        </div>
        <div className="wsc-stat-card stat-purple">
          <Heart size={20} />
          <div className="wsc-stat-info">
            <span className="wsc-stat-value font-mono">{uniquePredators.size}</span>
            <span className="wsc-stat-label">Predators Flagged</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="wsc-grid">
        {/* Helplines Section */}
        <div className="wsc-section">
          <h3 className="wsc-section-title">
            <Phone size={16} />
            Emergency Helplines
          </h3>
          <div className="helpline-grid">
            {HELPLINES.map(h => (
              <div key={h.number} className="helpline-card">
                <div className="helpline-emoji">{h.icon}</div>
                <div className="helpline-info">
                  <span className="helpline-name">{h.name}</span>
                  <span className="helpline-number font-mono" style={{ color: h.color }}>{h.number}</span>
                  <span className="helpline-desc">{h.desc}</span>
                </div>
                <a href={`tel:${h.number.replace(/-/g, '')}`} className="helpline-call-btn">
                  <Phone size={14} />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="wsc-section">
          <h3 className="wsc-section-title">
            <FileText size={16} />
            Legal Actions & Reports
          </h3>
          <div className="wsc-actions-grid">
            <button className="wsc-action-btn action-ncw" onClick={handleNCWReport}>
              <div className="action-icon-wrap ncw">⚖️</div>
              <div className="action-info">
                <span className="action-name">File NCW Complaint</span>
                <span className="action-desc">National Commission for Women</span>
              </div>
              <Download size={16} />
            </button>

            <button className="wsc-action-btn action-pocso" onClick={handlePOCSOReport}>
              <div className="action-icon-wrap pocso">👧</div>
              <div className="action-info">
                <span className="action-name">POCSO Report</span>
                <span className="action-desc">Protection of Children from Sexual Offences</span>
              </div>
              <Download size={16} />
            </button>

            <button className="wsc-action-btn action-cyber" onClick={() => window.open('https://cybercrime.gov.in', '_blank')}>
              <div className="action-icon-wrap cyber">💻</div>
              <div className="action-info">
                <span className="action-name">Cybercrime Portal</span>
                <span className="action-desc">Report online at cybercrime.gov.in</span>
              </div>
              <ExternalLink size={16} />
            </button>

            <button className="wsc-action-btn action-evidence" onClick={handleNCWReport}>
              <div className="action-icon-wrap evidence">📋</div>
              <div className="action-info">
                <span className="action-name">Export All Evidence</span>
                <span className="action-desc">Download complete evidence package</span>
              </div>
              <Download size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Women Safety Incidents */}
      <div className="wsc-section wsc-incidents">
        <h3 className="wsc-section-title">
          <AlertTriangle size={16} />
          Recent Women Safety Incidents
        </h3>
        {womenIncidents.length === 0 ? (
          <div className="wsc-empty">
            <ShieldCheck size={40} />
            <p>No women safety incidents detected</p>
            <p className="text-muted">The Shakti system is active and monitoring all conversations.</p>
          </div>
        ) : (
          <div className="wsc-incident-list">
            {womenIncidents.slice(0, 10).map(incident => (
              <div key={incident.id} className={`wsc-incident-row ${incident.action}`}>
                <div className="wsc-incident-badge">
                  <span className={`wsc-badge ${incident.action}`}>
                    {incident.action === 'block' ? '🚫' : '⚠️'} {incident.action.toUpperCase()}
                  </span>
                </div>
                <div className="wsc-incident-info">
                  <span className="wsc-incident-users">{incident.sender} → {incident.receiver}</span>
                  <span className="wsc-incident-category">{incident.category}</span>
                </div>
                <span className="wsc-incident-score font-mono">{incident.harm_score.toFixed(2)}</span>
                <span className="wsc-incident-time">
                  {new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Report Generators ──

function generateNCWReport(incidents: Incident[]): string {
  const now = new Date();
  return `
═══════════════════════════════════════════════════
   COMPLAINT TO NATIONAL COMMISSION FOR WOMEN
   Generated by CyberShield AI · Shakti Module
   Date: ${now.toLocaleDateString('en-IN')}
   Time: ${now.toLocaleTimeString('en-IN')}
═══════════════════════════════════════════════════

SECTION 1: COMPLAINT OVERVIEW
-----------------------------
Total incidents detected: ${incidents.length}
Blocked messages: ${incidents.filter(i => i.action === 'block').length}
Alerted messages: ${incidents.filter(i => i.action === 'alert').length}
Unique victims: ${new Set(incidents.map(i => i.receiver)).size}
Unique perpetrators: ${new Set(incidents.filter(i => i.action !== 'allow').map(i => i.sender)).size}

SECTION 2: APPLICABLE LAWS
-----------------------------
• IT Act 2000, Section 66E — Violation of privacy
• IT Act 2000, Section 67 — Publishing obscene material
• IT Act 2000, Section 67A — Sexually explicit material
• IPC Section 354D — Stalking
• IPC Section 509 — Word/gesture to insult modesty
• POCSO Act 2012 — If victim is a minor

SECTION 3: INCIDENT DETAILS
-----------------------------
${incidents.map((i, idx) => `
Incident #${idx + 1}
  Sender: ${i.sender}
  Receiver: ${i.receiver}
  Action Taken: ${i.action.toUpperCase()}
  Harm Score: ${i.harm_score.toFixed(4)}
  Category: ${i.category}
  AI Agent Scores:
    T1 (Toxicity): ${i.agent_t1?.toFixed(4) ?? 'N/A'}
    T2 (Context):  ${i.agent_t2?.toFixed(4) ?? 'N/A'}
    T3 (Emotion):  ${i.agent_t3?.toFixed(4) ?? 'N/A'}
  Content: "${i.content}"
  Timestamp: ${new Date(i.timestamp).toLocaleString('en-IN')}
`).join('\n')}

SECTION 4: DIGITAL EVIDENCE
-----------------------------
This report was generated automatically by the
CyberShield AI system. All timestamps are IST.
Message hashes and IP metadata are stored securely.

For verification, contact the platform administrator.

═══════════════════════════════════════════════════
   END OF NCW COMPLAINT · CyberShield AI
═══════════════════════════════════════════════════
`.trim();
}

function generatePOCSOReport(incidents: Incident[]): string {
  const now = new Date();
  return `
═══════════════════════════════════════════════════
   POCSO ACT REPORT
   Protection of Children from Sexual Offences
   Generated by CyberShield AI · Shakti Module
   Date: ${now.toLocaleDateString('en-IN')}
═══════════════════════════════════════════════════

MANDATORY REPORTING UNDER POCSO ACT, 2012
Section 19: Mandatory reporting of offences

This report is auto-generated when CyberShield AI
detects potential sexual offences against a minor.

INCIDENTS FLAGGED:
${incidents.map((i, idx) => `
  ${idx + 1}. [${i.action.toUpperCase()}] ${i.sender} → ${i.receiver}
     Score: ${i.harm_score.toFixed(2)} | Category: ${i.category}
     Time: ${new Date(i.timestamp).toLocaleString('en-IN')}
`).join('')}

NEXT STEPS:
1. Contact Childline: 1098
2. File FIR at nearest police station
3. Report at cybercrime.gov.in
4. Contact NCPCR: 011-23724042

═══════════════════════════════════════════════════
`.trim();
}
