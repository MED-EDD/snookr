import React, { useEffect, useState } from 'react';

interface PowerBarProps {
  engineRef: any; // GameEngine reference
}

const PowerBar: React.FC<PowerBarProps> = ({ engineRef }) => {
  const [power, setPower] = useState(0);
  const [charging, setCharging] = useState(false);

  useEffect(() => {
    let raf = 0;
    function tick() {
      const eng = engineRef?.current;
      if (eng) {
        setPower(eng.shotPower || 0);
        setCharging(eng.isChargingPower || eng.isShooting);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engineRef]);

  const max = engineRef?.current?.maxPower || 200;
  const ratio = Math.min(1, power / max);

  const gradient = `linear-gradient(90deg, #16a34a ${Math.floor(ratio*60)}%, #fbbf24 ${Math.floor(ratio*85)}%, #ef4444 100%)`;

  return (
    <div className={`powerbar-wrapper ${charging ? 'charging' : ''}`}>
      <div className="powerbar-track">
        <div className="powerbar-fill" style={{ width: `${ratio*100}%`, background: gradient }} />
      </div>
    </div>
  );
};

export default PowerBar;
