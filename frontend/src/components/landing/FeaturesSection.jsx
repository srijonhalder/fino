import React, { useCallback, useEffect, useRef, useState } from "react";
import AsciiCube from "./AsciiCube";

const asciiAnimations = {
  neural: (frame) => {
    const states = ["◉", "◎", "○", "◎"];
    const getChar = (offset) => states[(frame + offset) % states.length];
    return `  ┌───────┐
  │ ${getChar(0)} ${getChar(1)} ${getChar(2)} │
  │ ${getChar(3)} ${getChar(4)} ${getChar(5)} │
  │ ${getChar(6)} ${getChar(7)} ${getChar(8)} │
  └───────┘`;
  },
  workflow: (frame) => {
    const arrows = ["─", "═", "━", "═"];
    const pulse = ["►", "▸", "▹", "▸"];
    const a = arrows[frame % arrows.length];
    const p = pulse[frame % pulse.length];
    return `  ┌─┐   ┌─┐
  │A├${a}${a}${p}│B│
  └─┘   └┬┘
        ┌▼┐
        │C│
        └─┘`;
  },
  security: (frame) => {
    const lock = ["◈", "◇", "◆", "◇"];
    const bars = ["░", "▒", "▓", "▒"];
    const l = lock[frame % lock.length];
    const b = bars[frame % bars.length];
    return `   ╔═══╗
   ║ ${l} ║
  ┌╨───╨┐
  │${b}${b}${b}${b}${b}│
  └─────┘`;
  },
  analytics: (frame) => {
    const heights = [
      [1, 2, 3, 2],
      [2, 3, 2, 3],
      [3, 2, 3, 1],
      [2, 1, 2, 2],
    ];
    const h = heights[frame % heights.length];
    const bar = (height) => (height === 3 ? "█" : height === 2 ? "▄" : "▁");
    return `  │${h[0] === 3 ? "▄" : " "}${h[1] === 3 ? "▄" : " "}${h[2] === 3 ? "▄" : " "}${h[3] === 3 ? "▄" : " "}
  │${bar(h[0])} ${bar(h[1])} ${bar(h[2])} ${bar(h[3])}
  │█ █ █ █
  └────────`;
  },
  globe: (frame) => {
    const rotations = [
      `    .--.
   /    \\
  | (  ) |
   \\    /
    '--'`,
      `    .--.
   /    \\
  |  () |
   \\    /
    '--'`,
      `    .--.
   /    \\
  |  (  )|
   \\    /
    '--'`,
      `    .--.
   /    \\
  | ()  |
   \\    /
    '--'`,
    ];
    return rotations[frame % rotations.length];
  },
  api: (frame) => {
    const methods = ["GET", "POST", "PUT", "GET"];
    const arrows = ["────────►", "═══════►", "━━━━━━━►", "────────►"];
    const m = methods[frame % methods.length];
    const a = arrows[frame % arrows.length];
    return `  ${m} /invest
  ${a}
  ◄────────
  { token }`;
  },
};

const features = [
  {
    title: "AI Credit Scoring",
    description:
      "Every business is evaluated by an AI risk model before it's allowed to raise capital, so you invest with transparency.",
    animationKey: "neural",
  },
  {
    title: "Fractional Ownership",
    description:
      "Buy tokenized shares of local businesses starting from ₹100. No minimums, no gatekeeping.",
    animationKey: "workflow",
  },
  {
    title: "Escrow-Backed Funding",
    description:
      "Capital sits in a Soroban escrow contract and only releases to businesses once funding milestones are met.",
    animationKey: "security",
  },
  {
    title: "Real-time Dividends",
    description:
      "Live dashboards track your payouts as revenue-share dividends are distributed on-chain, automatically.",
    animationKey: "analytics",
  },
  {
    title: "Borderless Access",
    description:
      "Connect any Freighter wallet and invest from anywhere — no bank account or paperwork required.",
    animationKey: "globe",
  },
  {
    title: "Open Investment API",
    description:
      "REST endpoints and on-chain contracts you can audit yourself. Nothing about your investment is a black box.",
    animationKey: "api",
  },
];

function AnimatedAscii({ animationKey }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setFrame((f) => f + 1), 400);
    return () => clearInterval(interval);
  }, []);

  const getAscii = useCallback(() => asciiAnimations[animationKey](frame), [animationKey, frame]);

  return (
    <pre className="font-mono text-xs text-primary-500 leading-tight whitespace-pre">
      {getAscii()}
    </pre>
  );
}

function FeatureCard({ feature, index }) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={`group relative rounded-xl p-8 card-shadow bg-dark-800/50 border border-white/5 transition-all duration-700 hover:border-primary-500/40 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="mb-6 h-20 flex items-center">
        <AnimatedAscii animationKey={feature.animationKey} />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
    </div>
  );
}

const FeaturesSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" ref={sectionRef} className="relative py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
          <div>
            <p className="text-sm font-mono text-primary-500 mb-3">{"// PLATFORM"}</p>
            <h2
              className={`text-3xl lg:text-5xl font-normal tracking-tight text-white mb-6 transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <span className="text-balance">Everything you need</span>
              <br />
              <span className="text-balance">to invest at scale.</span>
            </h2>
            <p
              className={`text-lg text-gray-400 leading-relaxed max-w-lg transition-all duration-700 delay-100 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              A complete platform for discovering, funding, and tracking returns from
              local businesses. From wallet connect to dividend payout in minutes.
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <AsciiCube className="w-[480px] h-[640px] max-w-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
