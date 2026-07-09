import React from 'react';

/**
 * Decorative neon gradient background orbs — purely visual.
 * Place inside a relative-positioned container.
 */
const BackgroundOrbs = ({ variant = 'default' }) => {
  if (variant === 'hero') {
    return (
      <>
        <div
          className="glow-orb absolute top-[-10%] left-[-5%] w-[600px] h-[600px]"
          style={{ background: '#22D3A5' }}
        />
        <div
          className="glow-orb absolute top-[20%] right-[-8%] w-[500px] h-[500px]"
          style={{ background: '#22D3EE' }}
        />
        <div
          className="glow-orb absolute bottom-[-5%] left-[30%] w-[400px] h-[400px]"
          style={{ background: '#34D399', opacity: 0.08 }}
        />
      </>
    );
  }
  if (variant === 'subtle') {
    return (
      <>
        <div
          className="glow-orb absolute top-0 left-[-10%] w-[400px] h-[400px]"
          style={{ background: '#22D3A5', opacity: 0.08 }}
        />
        <div
          className="glow-orb absolute bottom-0 right-[-10%] w-[350px] h-[350px]"
          style={{ background: '#22D3EE', opacity: 0.06 }}
        />
      </>
    );
  }
  // default
  return (
    <>
      <div
        className="glow-orb absolute top-[10%] right-[5%] w-[500px] h-[500px]"
        style={{ background: '#22D3A5' }}
      />
      <div
        className="glow-orb absolute bottom-[10%] left-[5%] w-[400px] h-[400px]"
        style={{ background: '#22D3EE' }}
      />
    </>
  );
};

export default BackgroundOrbs;
