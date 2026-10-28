import React, { useState } from 'react';
import AeroShards from './AeroShards';

export default function SiteBackground() {
  const [unavailable, setUnavailable] = useState(false);
  return <div className="site-background" aria-hidden="true">
    <div className="background-wash" />
    {!unavailable && <AeroShards
      shardColor="#84cc16"
      accentColor="#6366f1"
      backgroundColor="transparent"
      placement="full"
      material="glass"
      markers="plus"
      count={850}
      speed={0.42}
      depthOfField={0.75}
      glow={0.28}
      grain={0.035}
      vignette={0.4}
      dpr={1.25}
      mouseStrength={0.35}
      parallax={0.25}
      mouseInteraction
      pulseOnClick
      holdToGather
      onError={error => { console.info("AeroShards fallback:", error.message.slice(0, 160)); setUnavailable(true); }}
    />}
    {unavailable && <div className="shards-fallback">{Array.from({length:132},(_,i)=>{const band=Math.floor(i/44), t=(i%44)/43; return <i key={i} style={{left:`${-10+t*120}%`,top:`${8+band*32+Math.sin(t*6.28+band*1.8)*19+(i%3)*2}%`,'--rotation':`${i*47}deg`,'--drift':`${7+band*3}s`,animationDelay:`-${i%13}s`,width:`${12+i%4*8}px`,height:`${28+i%5*9}px`}} />;})}</div>}
    <div className="background-shade" />
  </div>;
}
