import React from 'react';
import { Smartphone } from 'lucide-react';

export const LandscapePrompt: React.FC = () => {
  return (
    <div className="orientation-blocker">
      <div className="blocker-content">
        <Smartphone className="rotate-icon" size={48} />
        <h1>Please Rotate Your Device</h1>
        <p>This application is optimized for portrait (vertical) orientation on mobile devices.</p>
      </div>
    </div>
  );
};
