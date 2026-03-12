import { Incident } from '../../lib/types';
import { RefreshCw, CheckCircle, Clock, AlertTriangle, BookOpen, MessageSquare, Award } from 'lucide-react';
import './Rehabilitation.css';

interface RehabilitationProps {
  incidents: Incident[];
}

interface OffenderProfile {
  username: string;
  totalStrikes: number;
  stage: 1 | 2 | 3;
  lastIncident: string;
  categories: string[];
}

export default function Rehabilitation({ incidents }: RehabilitationProps) {
  // Build offender profiles from incidents
  const offenderMap = new Map<string, OffenderProfile>();
  incidents
    .filter(i => i.action === 'block' || i.action === 'alert')
    .forEach(i => {
      const existing = offenderMap.get(i.sender);
      if (existing) {
        existing.totalStrikes++;
        if (!existing.categories.includes(i.category)) {
          existing.categories.push(i.category);
        }
        if (new Date(i.timestamp) > new Date(existing.lastIncident)) {
          existing.lastIncident = i.timestamp;
        }
      } else {
        offenderMap.set(i.sender, {
          username: i.sender,
          totalStrikes: 1,
          stage: 1,
          lastIncident: i.timestamp,
          categories: [i.category],
        });
      }
    });

  // Assign stages based on strikes
  offenderMap.forEach(profile => {
    if (profile.totalStrikes >= 5) profile.stage = 3;
    else if (profile.totalStrikes >= 2) profile.stage = 2;
    else profile.stage = 1;
  });

  const offenders = [...offenderMap.values()].sort((a, b) => b.totalStrikes - a.totalStrikes);

  return (
    <div className="rehab-page">
      <div className="rehab-header">
        <div className="rehab-header-icon">
          <RefreshCw size={22} />
        </div>
        <div>
          <h2>Rehabilitation Pipeline</h2>
          <p className="rehab-subtitle">Tiered intervention system for offending users</p>
        </div>
      </div>

      {/* Pipeline Visual */}
      <div className="rehab-pipeline">
        <div className="pipeline-stage stage-1">
          <div className="pipeline-stage-header">
            <span className="pipeline-num">Stage 1</span>
            <h4>Awareness</h4>
          </div>
          <div className="pipeline-stage-body">
            <div className="pipeline-icon"><MessageSquare size={18} /></div>
            <p>Educational warning message shown. User informed their message was harmful and why.</p>
            <span className="pipeline-trigger">Trigger: 1st strike</span>
          </div>
          <span className="pipeline-count font-mono">{offenders.filter(o => o.stage === 1).length} users</span>
        </div>

        <div className="pipeline-arrow">→</div>

        <div className="pipeline-stage stage-2">
          <div className="pipeline-stage-header">
            <span className="pipeline-num">Stage 2</span>
            <h4>Intervention</h4>
          </div>
          <div className="pipeline-stage-body">
            <div className="pipeline-icon"><BookOpen size={18} /></div>
            <p>Cooldown enforced. Empathy quiz required. Resources shared about impact of cyberbullying.</p>
            <span className="pipeline-trigger">Trigger: 2–4 strikes</span>
          </div>
          <span className="pipeline-count font-mono">{offenders.filter(o => o.stage === 2).length} users</span>
        </div>

        <div className="pipeline-arrow">→</div>

        <div className="pipeline-stage stage-3">
          <div className="pipeline-stage-header">
            <span className="pipeline-num">Stage 3</span>
            <h4>Restriction</h4>
          </div>
          <div className="pipeline-stage-body">
            <div className="pipeline-icon"><AlertTriangle size={18} /></div>
            <p>Account restricted. Case escalated to admin. Evidence exported for legal action.</p>
            <span className="pipeline-trigger">Trigger: 5+ strikes</span>
          </div>
          <span className="pipeline-count font-mono">{offenders.filter(o => o.stage === 3).length} users</span>
        </div>
      </div>

      {/* Offender List */}
      <div className="rehab-section">
        <h3 className="rehab-section-title">
          Offender Profiles
          <span className="rehab-section-count">{offenders.length} users</span>
        </h3>

        {offenders.length === 0 ? (
          <div className="rehab-empty">
            <CheckCircle size={40} />
            <p>No offending users</p>
            <p className="text-muted">All users are in good standing.</p>
          </div>
        ) : (
          <div className="rehab-offender-list">
            {offenders.map(o => (
              <div key={o.username} className={`rehab-offender-card stage-${o.stage}`}>
                <div className="rehab-offender-avatar">
                  {o.username.charAt(0).toUpperCase()}
                </div>
                <div className="rehab-offender-info">
                  <span className="rehab-offender-name">{o.username}</span>
                  <span className="rehab-offender-meta">
                    {o.categories.join(', ')} · Last: {new Date(o.lastIncident).toLocaleDateString()}
                  </span>
                </div>
                <div className="rehab-offender-stats">
                  <span className="rehab-strikes font-mono">{o.totalStrikes} strikes</span>
                  <span className={`rehab-stage-badge stage-${o.stage}`}>
                    Stage {o.stage}
                  </span>
                </div>
                <div className="rehab-offender-actions">
                  <button className="rehab-btn" title="Send educational resources">
                    <BookOpen size={14} />
                  </button>
                  <button className="rehab-btn" title="Reinstate user">
                    <Award size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
