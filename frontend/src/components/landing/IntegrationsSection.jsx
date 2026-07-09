import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AsciiCube from "./AsciiCube";

const integrations = [
  { name: "Freighter", category: "Wallet", ascii: `  ┌─┐\n  │◆│\n  └─┘` },
  { name: "Soroban", category: "Smart Contracts", ascii: `  ╔═╗\n  ║S║\n  ╚═╝` },
  { name: "Stellar", category: "Settlement Layer", ascii: `  ┌*┐\n  └─┘` },
  { name: "MongoDB", category: "Database", ascii: `  [█]\n  [█]` },
  { name: "Pinata / IPFS", category: "Document Storage", ascii: `  ◈◈\n  ◈◈` },
  { name: "Render", category: "Hosting", ascii: `  ≋≋\n  ≋≋` },
  { name: "Nodemailer", category: "Notifications", ascii: `  {@}\n  ---` },
  { name: "Recharts", category: "Analytics", ascii: `  ▲\n  ─` },
];

const IntegrationsSection = () => {
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
    <section ref={sectionRef} className="relative py-32 overflow-hidden">
      <div className="absolute left-10 top-1/3 opacity-5 pointer-events-none hidden xl:block">
        <AsciiCube className="w-[400px] h-[350px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div
          className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-sm font-mono text-primary-500 mb-4">{"// THE STACK"}</p>
          <h2 className="text-4xl lg:text-5xl font-normal tracking-tight text-white mb-6 text-balance">
            Built on tools you trust.
            <br />
            Verified on-chain.
          </h2>
          <p className="text-lg text-gray-400 leading-relaxed">
            Fino connects your wallet, business documents, and dividend payouts
            through an auditable, open stack — no black boxes.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {integrations.map((integration, index) => (
            <div
              key={integration.name}
              className={`group relative bg-dark-800/50 rounded-xl p-6 border border-white/5 card-shadow hover:border-primary-500/40 transition-all duration-500 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <pre className="font-mono text-lg text-primary-500 mb-4 leading-tight h-12 flex items-center justify-center">
                {integration.ascii}
              </pre>
              <div className="text-center">
                <h3 className="font-semibold text-white mb-1">{integration.name}</h3>
                <p className="text-xs text-gray-500">{integration.category}</p>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-primary-500 font-mono text-xs">→</span>
              </div>
            </div>
          ))}
        </div>

        <div
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-dark-800 to-dark-900 border border-white/10 card-shadow transition-all duration-700 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="relative z-10 p-8 lg:p-12">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl lg:text-3xl font-semibold text-white mb-4">
                  Building on top of Fino?
                </h3>
                <p className="text-gray-400 mb-6">
                  Our escrow and governance contracts are open for review. Get in
                  touch to integrate Fino's investment rails into your own product.
                </p>
                <Link
                  to="/raise-funds"
                  className="inline-block px-6 py-3 bg-white text-dark-900 rounded-lg font-medium hover:bg-white/90 transition-colors"
                >
                  Get in Touch
                </Link>
              </div>

              <div className="font-mono text-xs text-gray-400 space-y-2 bg-dark-950/60 rounded-lg p-6 border border-white/10">
                <div className="text-primary-500 mb-2">{"// Example: Claim dividend"}</div>
                <div>
                  <span className="text-purple-400">const</span> tx = <span className="text-blue-400">await</span> fino.dividends.claim({"{"}
                </div>
                <div className="pl-4">
                  <span className="text-teal-400">businessId</span>: <span className="text-yellow-400">&quot;biz_8841&quot;</span>,
                </div>
                <div className="pl-4">
                  <span className="text-teal-400">wallet</span>: <span className="text-yellow-400">&quot;G...FREIGHTER&quot;</span>
                </div>
                <div>{"}"});</div>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 opacity-5 grid-pattern pointer-events-none" />
        </div>
      </div>
    </section>
  );
};

export default IntegrationsSection;
