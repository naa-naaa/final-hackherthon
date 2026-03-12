import { Shield, AlertTriangle } from 'lucide-react';
import './POCSOBanner.css';

interface POCSOBannerProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function POCSOBanner({ visible, onDismiss }: POCSOBannerProps) {
  if (!visible) return null;

  return (
    <div className="pocso-banner animate-slide-down">
      <div className="pocso-icon">
        <Shield size={18} />
      </div>
      <div className="pocso-content">
        <p className="pocso-title">
          <AlertTriangle size={14} />
          POCSO Protection Active
        </p>
        <p className="pocso-desc">
          This conversation may involve a minor. Under <strong>POCSO Act 2012</strong>, 
          all harmful content is being automatically flagged and reported.
          Call <strong className="pocso-number">Childline: 1098</strong> for immediate help.
        </p>
      </div>
      <button className="pocso-dismiss" onClick={onDismiss}>OK</button>
    </div>
  );
}
