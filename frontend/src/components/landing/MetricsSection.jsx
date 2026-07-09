import React, { useEffect, useRef, useState } from "react";
import AsciiWave from "./AsciiWave";

function AnimatedCounter({ end, suffix = "", prefix = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 2000;
          const startTime = performance.now();

          const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(animate);
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, hasAnimated]);

  return (
    <div ref={ref} className="font-mono text-4xl lg:text-6xl font-semibold tracking-tight text-white">
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </div>
  );
}

const metrics = [
  { value: 12482, suffix: "", label: "Active investors", sublabel: "+8.2% this month" },
  { value: 99, suffix: ".98%", label: "Contract uptime", sublabel: "Soroban mainnet" },
  { value: 4, suffix: "s", label: "Avg. settlement time", sublabel: "Stellar network" },
  { value: 500, suffix: "+", label: "Businesses funded", sublabel: "Across India" },
];

function ActivityLine({ time, event, region, status, latency }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-gray-600 w-8">{time}</span>
      <span className="text-white">{event}</span>
      <span className="text-gray-600">{region}</span>
      <span className={status.startsWith("2") ? "text-teal-400" : "text-yellow-500"}>{status}</span>
      <span className="text-primary-500">{latency}</span>
    </div>
  );
}

const MetricsSection = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="metrics" className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <AsciiWave className="w-full h-full object-cover" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
          <div>
            <p className="text-sm font-mono text-primary-500 mb-3">{"// LIVE METRICS"}</p>
            <h2 className="text-3xl lg:text-5xl font-normal tracking-tight text-white text-balance">
              Real-time investment
              <br />
              performance.
            </h2>
          </div>
          <div className="flex items-center gap-3 font-mono text-sm text-gray-400">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>All contracts operational</span>
            <span className="text-white/10">|</span>
            <span>{time.toLocaleTimeString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 rounded-xl overflow-hidden card-shadow">
          {metrics.map((metric) => (
            <div key={metric.label} className="bg-dark-800 p-8 flex flex-col gap-4">
              <div className="text-primary-500">
                <AnimatedCounter end={metric.value} suffix={metric.suffix} />
              </div>
              <div>
                <div className="text-white font-medium">{metric.label}</div>
                <div className="text-sm text-gray-500">{metric.sublabel}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 rounded-xl bg-dark-800 border border-white/10 card-shadow">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            <span className="font-mono text-sm text-gray-400">Live activity feed</span>
          </div>
          <div className="font-mono text-xs space-y-2 text-gray-400 overflow-hidden h-24">
            <ActivityLine time="now" event="POST /invest/biz_8841" region="mumbai" status="200" latency="23ms" />
            <ActivityLine time="1s" event="GET /businesses" region="bengaluru" status="200" latency="18ms" />
            <ActivityLine time="2s" event="POST /dividends/claim" region="delhi" status="200" latency="45ms" />
            <ActivityLine time="3s" event="POST /kyc/verify" region="pune" status="202" latency="12ms" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default MetricsSection;
