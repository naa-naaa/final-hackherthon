import { useState } from 'react';
import { Heart, X, Phone, ExternalLink, ShieldCheck } from 'lucide-react';
import './SakhiCompanionCard.css';

interface SakhiCompanionCardProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function SakhiCompanionCard({ visible, onDismiss }: SakhiCompanionCardProps) {
  const [minimized, setMinimized] = useState(false);

  if (!visible) return null;

  if (minimized) {
    return (
      <button className="sakhi-minimized" onClick={() => setMinimized(false)}>
        <Heart size={16} />
        <span>Sakhi</span>
      </button>
    );
  }

  return (
    <div className="sakhi-card animate-slide-up">
      <button className="sakhi-close" onClick={onDismiss}>
        <X size={14} />
      </button>

      <div className="sakhi-header">
        <div className="sakhi-avatar">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h4 className="sakhi-title">Sakhi — Your Safety Companion</h4>
          <p className="sakhi-sub">You are not alone 💙</p>
        </div>
      </div>

      <p className="sakhi-message">
        We noticed a concerning message in this conversation. 
        Here are some resources if you need help:
      </p>

      <div className="sakhi-actions">
        <a href="tel:181" className="sakhi-action-btn sakhi-call">
          <Phone size={14} />
          <span>Call 181</span>
        </a>
        <a href="https://cybercrime.gov.in" target="_blank" rel="noopener" className="sakhi-action-btn sakhi-report">
          <ExternalLink size={14} />
          <span>Report Online</span>
        </a>
      </div>

      <div className="sakhi-tips">
        <p className="sakhi-tips-title">Safety Tips:</p>
        <ul>
          <li>Take screenshots of harmful messages</li>
          <li>Don't delete the evidence</li>
          <li>Talk to someone you trust</li>
        </ul>
      </div>

      <button className="sakhi-minimize" onClick={() => setMinimized(true)}>
        Minimize
      </button>
    </div>
  );
}
