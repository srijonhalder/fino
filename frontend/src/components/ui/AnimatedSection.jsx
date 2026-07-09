import React from 'react';
import { motion } from 'framer-motion';

/**
 * Wraps children with scroll-triggered fade-up / slide-in animation.
 * Props: variant ('fade-up'|'fade-in'|'slide-left'|'slide-right'), delay (s), className
 */
const VARIANTS = {
  'fade-up':    { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } },
  'fade-in':    { hidden: { opacity: 0 },         visible: { opacity: 1 } },
  'slide-left': { hidden: { opacity: 0, x: -30 }, visible: { opacity: 1, x: 0 } },
  'slide-right':{ hidden: { opacity: 0, x: 30 },  visible: { opacity: 1, x: 0 } },
};

const AnimatedSection = ({
  children,
  variant = 'fade-up',
  delay = 0,
  duration = 0.6,
  className = '',
  as = 'div',
}) => {
  const anim = VARIANTS[variant] || VARIANTS['fade-up'];
  const Tag  = motion[as] || motion.div;

  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={anim}
      transition={{ duration, delay, ease: 'easeOut' }}
    >
      {children}
    </Tag>
  );
};

export default AnimatedSection;
