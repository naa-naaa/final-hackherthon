import { useState } from 'react';
import { FileWarning, ExternalLink, Copy, Check, Upload, Shield, AlertTriangle } from 'lucide-react';
import { Incident } from '../../lib/types';
import './CybercrimeReporting.css';

interface CybercrimeReportingProps {
  incidents: Incident[];
}

export default function CybercrimeReporting({ incidents }: CybercrimeReportingProps) {
  const [copied, setCopied] = useState(false);

  const blockedIncidents = incidents.filter(i => i.action === 'block');

  const handleCopyReport = () => {
    const report = generateCybercrimeReport(blockedIncidents);
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadReport = () => {
    const report = generateCybercrimeReport(blockedIncidents);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cybercrime-Report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ccr-page">
      <div className="ccr-header">
        <div className="ccr-header-icon">
          <FileWarning size={22} />
        </div>
        <div>
          <h2>Cybercrime Reporting</h2>
          <p className="ccr-subtitle">File complaints and generate reports for law enforcement</p>
        </div>
      </div>

      {/* Report to Portal */}
      <div className="ccr-grid">
        <div className="ccr-card ccr-portal-card">
          <div className="ccr-card-header">
            <Shield size={20} />
            <h3>Report to National Cyber Crime Portal</h3>
          </div>
          <p className="ccr-card-desc">
            File a complaint directly on the Government of India's cybercrime reporting portal.
            Use the evidence generated below to support your complaint.
          </p>
          <div className="ccr-steps">
            <div className="ccr-step">
              <span className="ccr-step-num font-mono">1</span>
              <span>Visit cybercrime.gov.in and click "Report Cyber Crime"</span>
            </div>
            <div className="ccr-step">
              <span className="ccr-step-num font-mono">2</span>
              <span>Select category: "Online Harassment" or "Cyberbullying"</span>
            </div>
            <div className="ccr-step">
              <span className="ccr-step-num font-mono">3</span>
              <span>Upload evidence (use the report generated below)</span>
            </div>
            <div className="ccr-step">
              <span className="ccr-step-num font-mono">4</span>
              <span>Submit and note your complaint number</span>
            </div>
          </div>
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener"
            className="ccr-portal-btn"
          >
            <ExternalLink size={16} />
            Open Cyber Crime Portal
          </a>
        </div>

        <div className="ccr-card ccr-generate-card">
          <div className="ccr-card-header">
            <FileWarning size={20} />
            <h3>Generate Evidence Report</h3>
          </div>
          <p className="ccr-card-desc">
            Auto-generate a structured report with all blocked incidents, 
            AI scores, and timestamps for use in legal proceedings.
          </p>
          <div className="ccr-generate-stats">
            <div className="ccr-gen-stat">
              <span className="ccr-gen-value font-mono">{blockedIncidents.length}</span>
              <span className="ccr-gen-label">Blocked Incidents</span>
            </div>
            <div className="ccr-gen-stat">
              <span className="ccr-gen-value font-mono">{new Set(blockedIncidents.map(i => i.sender)).size}</span>
              <span className="ccr-gen-label">Perpetrators</span>
            </div>
            <div className="ccr-gen-stat">
              <span className="ccr-gen-value font-mono">{new Set(blockedIncidents.map(i => i.receiver)).size}</span>
              <span className="ccr-gen-label">Victims</span>
            </div>
          </div>
          <div className="ccr-generate-actions">
            <button className="ccr-gen-btn ccr-download" onClick={handleDownloadReport}>
              <Upload size={14} />
              Download Report
            </button>
            <button className="ccr-gen-btn ccr-copy" onClick={handleCopyReport}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
        </div>
      </div>

      {/* IPC Reference */}
      <div className="ccr-section">
        <h3 className="ccr-section-title">
          <AlertTriangle size={16} />
          Applicable IPC Sections (Auto-Detected)
        </h3>
        <div className="ccr-ipc-grid">
          {blockedIncidents.length > 0 ? (
            <>
              <div className="ccr-ipc-card">
                <span className="ccr-ipc-section font-mono">Sec 66E</span>
                <span className="ccr-ipc-name">IT Act — Violation of privacy</span>
                <span className="ccr-ipc-penalty">Up to 3 years + ₹2 lakh fine</span>
              </div>
              <div className="ccr-ipc-card">
                <span className="ccr-ipc-section font-mono">Sec 67</span>
                <span className="ccr-ipc-name">IT Act — Obscene material</span>
                <span className="ccr-ipc-penalty">Up to 5 years + ₹10 lakh fine</span>
              </div>
              <div className="ccr-ipc-card">
                <span className="ccr-ipc-section font-mono">Sec 354D</span>
                <span className="ccr-ipc-name">IPC — Stalking</span>
                <span className="ccr-ipc-penalty">Up to 3 years + fine</span>
              </div>
              <div className="ccr-ipc-card">
                <span className="ccr-ipc-section font-mono">Sec 509</span>
                <span className="ccr-ipc-name">IPC — Insult to modesty</span>
                <span className="ccr-ipc-penalty">Up to 3 years + fine</span>
              </div>
            </>
          ) : (
            <div className="ccr-ipc-empty">
              <p>No blocked incidents detected. IPC sections will auto-populate when threats are blocked.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function generateCybercrimeReport(incidents: Incident[]): string {
  const now = new Date();
  return `
═══════════════════════════════════════════════════
   CYBERCRIME INCIDENT REPORT
   Generated by CyberShield AI
   Date: ${now.toLocaleDateString('en-IN')}
   Time: ${now.toLocaleTimeString('en-IN')}
═══════════════════════════════════════════════════

REPORT SUMMARY
--------------
Total blocked messages: ${incidents.length}
Unique perpetrators: ${new Set(incidents.map(i => i.sender)).size}
Unique victims: ${new Set(incidents.map(i => i.receiver)).size}
Time range: ${incidents.length > 0 ? new Date(incidents[incidents.length - 1].timestamp).toLocaleString('en-IN') : 'N/A'} to ${incidents.length > 0 ? new Date(incidents[0].timestamp).toLocaleString('en-IN') : 'N/A'}

APPLICABLE LAWS
---------------
• IT Act 2000, Sec 66E — Violation of privacy
• IT Act 2000, Sec 67 — Obscene material in electronic form
• IT Act 2000, Sec 67A — Sexually explicit material
• IPC Sec 354D — Stalking
• IPC Sec 509 — Insult to modesty of a woman

INCIDENT LOG
------------
${incidents.map((i, idx) => `
#${idx + 1} [${i.action.toUpperCase()}]
  From: ${i.sender} → To: ${i.receiver}
  Score: ${i.harm_score.toFixed(4)} | Category: ${i.category}
  AI Scores: T1=${i.agent_t1?.toFixed(2) ?? 'N/A'} T2=${i.agent_t2?.toFixed(2) ?? 'N/A'} T3=${i.agent_t3?.toFixed(2) ?? 'N/A'}
  Content: "${i.content}"
  Time: ${new Date(i.timestamp).toLocaleString('en-IN')}
`).join('')}

HOW TO FILE
-----------
1. Visit https://cybercrime.gov.in
2. Click "Report Cyber Crime"
3. Upload this report as evidence
4. Select: Online Harassment / Cyberbullying
5. Note your complaint tracking number

═══════════════════════════════════════════════════
   END OF REPORT · CyberShield AI
═══════════════════════════════════════════════════
`.trim();
}
