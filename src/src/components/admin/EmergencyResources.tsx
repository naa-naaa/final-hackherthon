import { Phone, Globe, Heart, ShieldCheck, ExternalLink, BookOpen } from 'lucide-react';
import './EmergencyResources.css';

const HELPLINES = [
  { category: 'Women Safety', items: [
    { name: 'Women Helpline', number: '181', desc: '24/7 toll-free, PAN India', icon: '🛡️' },
    { name: 'NCW Helpline', number: '7827-170-170', desc: 'National Commission for Women', icon: '⚖️' },
    { name: 'Police (Women)', number: '1091', desc: 'Women-specific police helpline', icon: '🚔' },
  ]},
  { category: 'Emergency', items: [
    { name: 'Emergency', number: '112', desc: 'National emergency number', icon: '🚨' },
    { name: 'Police', number: '100', desc: 'Police emergency', icon: '👮' },
    { name: 'Ambulance', number: '108', desc: 'Medical emergency', icon: '🚑' },
  ]},
  { category: 'Cyber Safety', items: [
    { name: 'Cyber Crime', number: '1930', desc: 'Report cyber crimes', icon: '💻' },
    { name: 'Childline (POCSO)', number: '1098', desc: 'For minors under 18', icon: '👧' },
    { name: 'Anti-Stalking', number: '1091', desc: 'Stalking and harassment', icon: '👁️' },
  ]},
  { category: 'Mental Health', items: [
    { name: 'iCall', number: '9152987821', desc: 'Tata Institute counselling', icon: '🧠' },
    { name: 'Vandrevala Foundation', number: '1860-2662-345', desc: '24/7 mental health', icon: '💙' },
    { name: 'NIMHANS', number: '080-46110007', desc: 'National Institute of Mental Health', icon: '🏥' },
  ]},
];

const GOV_LINKS = [
  { name: 'National Cyber Crime Portal', url: 'https://cybercrime.gov.in', desc: 'File complaints online' },
  { name: 'NCW Online Complaint', url: 'http://ncw.nic.in/frmComp_Online.aspx', desc: 'Women\'s commission complaints' },
  { name: 'CERT-In', url: 'https://www.cert-in.org.in', desc: 'Indian Computer Emergency Response Team' },
  { name: 'MeitY', url: 'https://www.meity.gov.in', desc: 'Ministry of Electronics & IT' },
  { name: 'NCRB', url: 'https://ncrb.gov.in', desc: 'National Crime Records Bureau' },
  { name: 'Cyber Swachhta Kendra', url: 'https://www.cyberswachhtakendra.gov.in', desc: 'Botnet cleaning & malware analysis' },
];

export default function EmergencyResources() {
  return (
    <div className="er-page">
      <div className="er-header">
        <div className="er-header-icon">
          <Phone size={22} />
        </div>
        <div>
          <h2>Emergency Resources</h2>
          <p className="er-subtitle">Helplines, government portals, and support organizations</p>
        </div>
      </div>

      {/* Helplines */}
      <div className="er-helplines">
        {HELPLINES.map(group => (
          <div key={group.category} className="er-group">
            <h3 className="er-group-title">{group.category}</h3>
            <div className="er-group-cards">
              {group.items.map(h => (
                <div key={h.number} className="er-card">
                  <span className="er-card-emoji">{h.icon}</span>
                  <div className="er-card-info">
                    <span className="er-card-name">{h.name}</span>
                    <span className="er-card-number font-mono">{h.number}</span>
                    <span className="er-card-desc">{h.desc}</span>
                  </div>
                  <a href={`tel:${h.number.replace(/-/g, '')}`} className="er-call-btn">
                    <Phone size={14} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Government Links */}
      <div className="er-section">
        <h3 className="er-section-title">
          <Globe size={16} />
          Government Portals
        </h3>
        <div className="er-links-grid">
          {GOV_LINKS.map(link => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener" className="er-link-card">
              <div className="er-link-info">
                <span className="er-link-name">{link.name}</span>
                <span className="er-link-desc">{link.desc}</span>
              </div>
              <ExternalLink size={14} />
            </a>
          ))}
        </div>
      </div>

      {/* Quick Reference */}
      <div className="er-section">
        <h3 className="er-section-title">
          <BookOpen size={16} />
          Legal Reference
        </h3>
        <div className="er-legal-grid">
          <div className="er-legal-card">
            <h4>IT Act 2000</h4>
            <ul>
              <li><strong>Sec 66E</strong> — Violation of privacy</li>
              <li><strong>Sec 67</strong> — Obscene material in electronic form</li>
              <li><strong>Sec 67A</strong> — Sexually explicit material</li>
              <li><strong>Sec 67B</strong> — Child pornography</li>
            </ul>
          </div>
          <div className="er-legal-card">
            <h4>Indian Penal Code</h4>
            <ul>
              <li><strong>Sec 354D</strong> — Stalking</li>
              <li><strong>Sec 499</strong> — Defamation</li>
              <li><strong>Sec 503</strong> — Criminal intimidation</li>
              <li><strong>Sec 509</strong> — Word/gesture to insult modesty</li>
            </ul>
          </div>
          <div className="er-legal-card">
            <h4>Special Acts</h4>
            <ul>
              <li><strong>POCSO 2012</strong> — Protection of children</li>
              <li><strong>DV Act 2005</strong> — Domestic violence</li>
              <li><strong>SH Act 2013</strong> — Sexual harassment at workplace</li>
              <li><strong>SC/ST Act</strong> — Caste-based harassment</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
