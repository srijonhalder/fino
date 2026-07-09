import React, { useEffect, useRef, useState } from "react";
import AsciiDna from "./AsciiDna";

const regions = [
  { name: "India", nodes: 5, latency: "< 20ms" },
  { name: "Southeast Asia", nodes: 4, latency: "< 25ms" },
  { name: "Middle East", nodes: 3, latency: "< 30ms" },
  { name: "Europe", nodes: 2, latency: "< 40ms" },
  { name: "North America", nodes: 2, latency: "< 35ms" },
  { name: "Africa", nodes: 1, latency: "< 50ms" },
];

const InfrastructureSection = () => {
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
    <section ref={sectionRef} className="relative py-32 bg-dark-800/20 overflow-hidden">
      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none hidden lg:block">
        <AsciiDna className="w-[600px] h-[500px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            }`}
          >
            <p className="text-sm font-mono text-primary-500 mb-4">{"// GLOBAL INFRASTRUCTURE"}</p>
            <h2 className="text-4xl lg:text-5xl font-normal tracking-tight text-white mb-6 text-balance">
              Built on Stellar's global rails.
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed mb-8">
              Every investment and dividend settles on the Stellar network — fast,
              cheap, and verifiable by anyone, anywhere in the world.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <pre className="font-mono text-2xl text-primary-500">⚡</pre>
                <div>
                  <h3 className="font-semibold text-white mb-1">5-Second Finality</h3>
                  <p className="text-sm text-gray-400">Investments confirm on-chain in seconds, not days</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <pre className="font-mono text-2xl text-primary-500">💸</pre>
                <div>
                  <h3 className="font-semibold text-white mb-1">Near-Zero Fees</h3>
                  <p className="text-sm text-gray-400">Distribute dividends to 1,000 investors for less than $1</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <pre className="font-mono text-2xl text-primary-500">🛡️</pre>
                <div>
                  <h3 className="font-semibold text-white mb-1">Escrow Protected</h3>
                  <p className="text-sm text-gray-400">Funds only release when milestones are independently verified</p>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            }`}
          >
            <div className="grid grid-cols-1 gap-3">
              {regions.map((region, index) => (
                <div
                  key={region.name}
                  className="group relative bg-dark-800/50 rounded-lg p-5 border border-white/5 card-shadow hover:border-primary-500/40 transition-all duration-300"
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">{region.name}</h4>
                    <span className="font-mono text-xs text-primary-500">{region.latency}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {Array.from({ length: region.nodes }).map((_, i) => (
                        <span
                          key={i}
                          className="w-2 h-2 rounded-full bg-primary-500/70 animate-pulse"
                          style={{ animationDelay: `${i * 200}ms` }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 font-mono">
                      {region.nodes} {region.nodes === 1 ? "validator" : "validators"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 rounded-lg bg-white/5 border border-white/10">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="font-mono text-2xl font-semibold text-primary-500">17</div>
                  <div className="text-xs text-gray-500">Live Regions</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-semibold text-primary-500">99.99%</div>
                  <div className="text-xs text-gray-500">Uptime SLA</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-semibold text-primary-500">₹2.4Cr</div>
                  <div className="text-xs text-gray-500">Total Invested</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InfrastructureSection;
