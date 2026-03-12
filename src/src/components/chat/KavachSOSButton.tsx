import { useState } from 'react';
import { ShieldAlert, Phone, Copy, Check, X } from 'lucide-react';
import './KavachSOSButton.css';

interface KavachSOSButtonProps {
  currentUser: string;
  activeChat: string | null;
}

export default function KavachSOSButton({ currentUser, activeChat }: KavachSOSButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSOS = () => {
    setExpanded(true);
  };

  const handleCopyEvidence = () => {
    const evidence = `
🚨 SOS ALERT — CyberShield Kavach
User: ${currentUser}
Chat with: ${activeChat || 'N/A'}
Time: ${new Date().toLocaleString('en-IN')}
Platform: SafeChat (CyberShield AI)
Status: User triggered emergency SOS
    `.trim();

    navigator.clipboard.writeText(evidence).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!expanded) {
    return (
      <button className="kavach-sos-btn" onClick={handleSOS} title="Emergency SOS">
        <ShieldAlert size={18} />
        <span>SOS</span>
      </button>
    );
  }

  return (
    <div className="kavach-panel">
      <div className="kavach-panel-header">
        <div className="kavach-panel-title">
          <ShieldAlert size={18} />
          <span>Kavach Emergency</span>
        </div>
        <button className="kavach-close" onClick={() => setExpanded(false)}>
          <X size={16} />
        </button>
      </div>

      <p className="kavach-desc">If you feel unsafe, contact these helplines immediately:</p>

      <div className="kavach-helplines">
        <a href="tel:181" className="kavach-line">
          <Phone size={14} />
          <span className="kavach-line-name">Women Helpline</span>
          <span className="kavach-line-num font-mono">181</span>
        </a>
        <a href="tel:112" className="kavach-line">
          <Phone size={14} />
          <span className="kavach-line-name">Emergency</span>
          <span className="kavach-line-num font-mono">112</span>
        </a>
        <a href="tel:1930" className="kavach-line">
          <Phone size={14} />
          <span className="kavach-line-name">Cyber Crime</span>
          <span className="kavach-line-num font-mono">1930</span>
        </a>
      </div>

      <button className="kavach-copy-btn" onClick={handleCopyEvidence}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'Evidence Copied!' : 'Copy Evidence to Clipboard'}
      </button>
    </div>
  );
}
