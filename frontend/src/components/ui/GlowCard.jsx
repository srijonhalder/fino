import React from 'react';
import { motion } from 'framer-motion';

/**
 * Glassmorphism card with optional hover glow.
 * Props: className, onClick, children, glowColor ('purple'|'cyan'|'teal'|'none'), animate
 */
const GLOW_MAP = {
  purple: 'hover:shadow-card-hover hover:border-primary-500/30',
  cyan:   'hover:shadow-neon-cyan hover:border-cyan-500/30',
  teal:   'hover:shadow-neon-teal hover:border-teal-400/30',
  none:   '',
};

const GlowCard = ({
  children,
  className = '',
  glowColor = 'purple',
  onClick,
  animate = true,
  as = 'div',
}) => {
  const Tag = animate ? motion[as] || motion.div : as;
  const glowClass = GLOW_MAP[glowColor] || '';

  const motionProps = animate
    ? {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.5 },
        whileHover: { y: -4, transition: { duration: 0.2 } },
      }
    : {};

  return (
    <Tag
      className={`glass rounded-2xl transition-all duration-300 ${glowClass} ${className}`}
      onClick={onClick}
      {...motionProps}
    >
      {children}
    </Tag>
  );
};

export default GlowCard;
