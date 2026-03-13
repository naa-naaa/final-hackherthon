import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Download, ExternalLink, FileHeart, HeartHandshake, Phone, ShieldAlert } from 'lucide-react';
import { getIncidents, subscribeToIncidents } from '../../lib/store';
import { Incident } from '../../lib/types';
import './WomenSafetyDropdown.css';

interface WomenSafetyDropdownProps {
  currentUser: string;
}

const HELPLINES = [
  { name: 'Women Helpline', number: '181', note: '24/7 crisis support' },
  { name: 'Cyber Crime', number: '1930', note: 'National cybercrime helpline' },
  { name: 'NCW Support', number: '7827-170-170', note: 'National Commission for Women' },
  { name: 'Police Women', number: '1091', note: 'Emergency women police support' },
  { name: 'iCall Counselling', number: '9152987821', note: 'Mental health and counselling' },
];

const WOMEN_SAFETY_CATEGORIES = ['harassment', 'sexual', 'threat', 'stalking', 'blackmail', 'abuse', 'modesty'];

function isWomenSafetyIncident(incident: Incident, currentUser: string): boolean {
  return incident.receiver === currentUser && (
    incident.action !== 'allow' || WOMEN_SAFETY_CATEGORIES.some(category => incident.category?.toLowerCase().includes(category))
  );
}

function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function generateNCWReportForUser(currentUser: string, incidents: Incident[]): string {
  const now = new Date();
  return `
CYBERSHIELD WOMEN SAFETY REPORT
Generated for: ${currentUser}
Date: ${now.toLocaleDateString('en-IN')}
Time: ${now.toLocaleTimeString('en-IN')}

SUMMARY
- Total harmful incidents received: ${incidents.length}
- Blocked incidents: ${incidents.filter(i => i.action === 'block').length}
- Alerted incidents: ${incidents.filter(i => i.action === 'alert').length}

SUGGESTED ACTIONS
- File complaint with National Commission for Women
- Report cyber abuse at cybercrime.gov.in
- Preserve screenshots and downloaded message evidence

INCIDENT DETAILS
${incidents.map((incident, index) => `
${index + 1}. Sender: ${incident.sender}
   Category: ${incident.category}
   Action: ${incident.action.toUpperCase()}
   Harm Score: ${incident.harm_score.toFixed(2)}
   Time: ${new Date(incident.timestamp).toLocaleString('en-IN')}
   Content: "${incident.content}"
`).join('')}

HELPLINES
- Women Helpline: 181
- Cyber Crime: 1930
- NCW: 7827-170-170
- Police Women: 1091
`.trim();
}

function generateEvidenceBundleForUser(currentUser: string, incidents: Incident[]): string {
  return `
EVIDENCE BUNDLE
Victim: ${currentUser}
Prepared by CyberShield AI

${incidents.map((incident, index) => `
Evidence #${index + 1}
Sender: ${incident.sender}
Receiver: ${incident.receiver}
Category: ${incident.category}
Action: ${incident.action}
Score: ${incident.harm_score.toFixed(4)}
Timestamp: ${incident.timestamp}
Content: ${incident.content}
`).join('')}
`.trim();
}

export default function WomenSafetyDropdown({ currentUser }: WomenSafetyDropdownProps) {
  const [open, setOpen] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>(() => getIncidents());
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, []);

  useEffect(() => {
    const unsub = subscribeToIncidents(() => {
      setIncidents(getIncidents());
    });
    return unsub;
  }, []);

  const womenIncidents = useMemo(
    () => incidents.filter(incident => isWomenSafetyIncident(incident, currentUser)),
    [currentUser, incidents]
  );

  const latestIncident = womenIncidents[0];

  const handleNCWReport = () => {
    downloadTextFile(
      generateNCWReportForUser(currentUser, womenIncidents),
      `Women-Safety-NCW-${currentUser}-${new Date().toISOString().slice(0, 10)}.txt`
    );
  };

  const handleEvidenceExport = () => {
    downloadTextFile(
      generateEvidenceBundleForUser(currentUser, womenIncidents),
      `Women-Safety-Evidence-${currentUser}-${new Date().toISOString().slice(0, 10)}.txt`
    );
  };

  return (
    <div className="women-safety-dropdown" ref={wrapperRef}>
      <button
        type="button"
        className={`women-safety-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-label="Women safety support"
      >
        <span className="women-safety-trigger-icon">
          <HeartHandshake size={16} />
        </span>
        <span className="women-safety-trigger-copy">
          <span className="women-safety-trigger-title">Shakti Support</span>
          <span className="women-safety-trigger-subtitle">
            {womenIncidents.length > 0 ? `${womenIncidents.length} safety case${womenIncidents.length > 1 ? 's' : ''}` : 'Help, reports, helplines'}
          </span>
        </span>
        <ChevronDown size={16} className="women-safety-chevron" />
      </button>

      {open && (
        <div className="women-safety-menu animate-fade-in">
          <div className="women-safety-hero">
            <div className="women-safety-hero-badge">
              <ShieldAlert size={14} />
              Women-only safety desk
            </div>
            <h4>Immediate help if a chat crosses the line</h4>
            <p>
              Helplines, legal routes, and downloadable reports in one place.
            </p>
            {latestIncident && (
              <div className="women-safety-hero-incident">
                Latest flag: <strong>{latestIncident.category}</strong> from @{latestIncident.sender}
              </div>
            )}
          </div>

          <div className="women-safety-section">
            <div className="women-safety-section-title">Helplines</div>
            <div className="women-safety-helplines">
              {HELPLINES.map(helpline => (
                <a
                  key={helpline.number}
                  className="women-safety-helpline-card"
                  href={`tel:${helpline.number.replace(/-/g, '')}`}
                >
                  <span className="helpline-icon"><Phone size={14} /></span>
                  <span className="helpline-copy">
                    <span className="helpline-name">{helpline.name}</span>
                    <span className="helpline-note">{helpline.note}</span>
                  </span>
                  <span className="helpline-number">{helpline.number}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="women-safety-section">
            <div className="women-safety-section-title">Legal actions and reports</div>
            <div className="women-safety-actions">
              <button type="button" className="women-safety-action ncw" onClick={handleNCWReport}>
                <FileHeart size={16} />
                <span>
                  <strong>Download NCW complaint</strong>
                  <small>Prepared from your flagged incidents</small>
                </span>
                <Download size={16} />
              </button>

              <button type="button" className="women-safety-action evidence" onClick={handleEvidenceExport}>
                <ShieldAlert size={16} />
                <span>
                  <strong>Export evidence bundle</strong>
                  <small>Message timeline with harm scores</small>
                </span>
                <Download size={16} />
              </button>

              <button
                type="button"
                className="women-safety-action portal"
                onClick={() => window.open('https://cybercrime.gov.in', '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink size={16} />
                <span>
                  <strong>Open cybercrime portal</strong>
                  <small>File an official online complaint</small>
                </span>
                <ExternalLink size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}