import { useState } from 'react';
import { Incident } from '../../lib/types';
import { ChevronDown, ChevronRight } from 'lucide-react';
import './IncidentFeed.css';

interface IncidentFeedProps {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
  selectedId: string | null;
}

interface ConversationGroup {
  key: string;
  sender: string;
  receiver: string;
  incidents: Incident[];
  latestAction: string;
  latestTimestamp: string;
  maxHarmScore: number;
  blockedCount: number;
  alertedCount: number;
}

function getTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function generateFakeIP(): string {
  const ips = ['185.220.101.45', '192.168.1.105', '10.0.0.42', '172.16.0.88', '203.0.113.50'];
  return ips[Math.floor(Math.random() * ips.length)];
}

function groupByConversation(incidents: Incident[]): ConversationGroup[] {
  const groupMap = new Map<string, ConversationGroup>();

  incidents.forEach(incident => {
    // Create a key that's the same regardless of direction
    const participants = [incident.sender, incident.receiver].sort();
    const key = `${participants[0]}↔${participants[1]}`;

    if (groupMap.has(key)) {
      const group = groupMap.get(key)!;
      group.incidents.push(incident);
      if (new Date(incident.timestamp) > new Date(group.latestTimestamp)) {
        group.latestTimestamp = incident.timestamp;
        group.latestAction = incident.action;
      }
      group.maxHarmScore = Math.max(group.maxHarmScore, incident.harm_score);
      if (incident.action === 'block') group.blockedCount++;
      if (incident.action === 'alert') group.alertedCount++;
    } else {
      groupMap.set(key, {
        key,
        sender: incident.sender,
        receiver: incident.receiver,
        incidents: [incident],
        latestAction: incident.action,
        latestTimestamp: incident.timestamp,
        maxHarmScore: incident.harm_score,
        blockedCount: incident.action === 'block' ? 1 : 0,
        alertedCount: incident.action === 'alert' ? 1 : 0,
      });
    }
  });

  // Sort groups by latest timestamp (most recent first)
  return [...groupMap.values()].sort(
    (a, b) => new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime()
  );
}

export default function IncidentFeed({ incidents, onSelectIncident, selectedId }: IncidentFeedProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const groups = groupByConversation(incidents);

  return (
    <div className="incident-feed">
      <div className="feed-header">
        <h3>Live Incident Feed</h3>
        <span className="feed-count font-mono">{groups.length} conversations · {incidents.length} incidents</span>
      </div>
      <div className="feed-list">
        {groups.length === 0 ? (
          <div className="feed-empty">
            <p>No incidents yet</p>
            <p className="text-muted">Incidents will appear here in real-time when CyberShield analyzes messages.</p>
          </div>
        ) : (
          groups.map((group) => {
            const isExpanded = expandedGroup === group.key;
            const worstAction = group.blockedCount > 0 ? 'block' : group.alertedCount > 0 ? 'alert' : 'allow';

            return (
              <div key={group.key} className="conversation-group">
                {/* Group Summary Card */}
                <div
                  className={`group-card ${worstAction} ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => setExpandedGroup(isExpanded ? null : group.key)}
                >
                  <div className="group-card-left">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className={`action-dot ${worstAction}`} />
                    <span className="group-users">
                      {group.sender} ↔ {group.receiver}
                    </span>
                  </div>
                  <div className="group-card-right">
                    {group.blockedCount > 0 && (
                      <span className="group-count-badge badge-block">{group.blockedCount} blocked</span>
                    )}
                    {group.alertedCount > 0 && (
                      <span className="group-count-badge badge-alert">{group.alertedCount} alerted</span>
                    )}
                    <span className="group-total font-mono">{group.incidents.length} msgs</span>
                    <span className="group-score font-mono">{group.maxHarmScore.toFixed(2)}</span>
                    <span className="group-time">{getTimeAgo(group.latestTimestamp)}</span>
                  </div>
                </div>

                {/* Expanded Incident List */}
                {isExpanded && (
                  <div className="group-incidents">
                    {group.incidents.map((incident, i) => {
                      const isSelected = incident.id === selectedId;
                      const ip = incident.ip_address || generateFakeIP();
                      const isTor = ip.startsWith('185.');

                      return (
                        <div
                          key={incident.id}
                          className={`incident-card ${incident.action} ${isSelected ? 'selected' : ''} ${i === 0 ? 'animate-slide-down' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectIncident(incident);
                          }}
                        >
                          <div className="incident-card-header">
                            <span className={`action-dot ${incident.action}`} />
                            <span className="incident-users">
                              {incident.sender} → {incident.receiver}
                            </span>
                            <span className="incident-divider">|</span>
                            <span className="incident-category">{incident.category}</span>
                            <span className="incident-divider">|</span>
                            <span className="incident-score font-mono">{incident.harm_score.toFixed(2)}</span>
                          </div>
                          <div className="incident-card-footer">
                            <span className={`action-badge ${incident.action}`}>
                              {incident.action.toUpperCase()}
                            </span>
                            <span className="incident-time">· {getTimeAgo(incident.timestamp)}</span>
                            <span className="incident-ip font-mono">
                              · IP: {ip} {isTor && <span className="tor-tag">[TOR]</span>}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}