import React, { useEffect, useRef, useState } from "react";
import AsciiTorus from "./AsciiTorus";

const securityFeatures = [
  { title: "Escrow Smart Contracts", description: "Funds lock in Soroban escrow until milestones are verified", ascii: `  ╔═══╗\n  ║ ◈ ║\n  ╚═══╝` },
  { title: "KYC & Wallet Verification", description: "Every business owner and investor identity is checked", ascii: `  ┌───┐\n  │ ✓ │\n  └───┘` },
  { title: "AI Risk Scoring", description: "Independent risk model scores every business before listing", ascii: `  ╭───╮\n  │ ★ │\n  ╰───╯` },
  { title: "On-Chain Transparency", description: "Every investment and dividend is publicly verifiable", ascii: `  [===]\n  [===]` },
  { title: "Role-Based Access", description: "Granular permissions for investors, businesses, and admins", ascii: `  ◉─◉─◉\n  │ │ │` },
  { title: "Full Audit Trail", description: "Complete visibility into every transaction on the platform", ascii: `  ▪ ▪ ▪\n  ▪ ▪ ▪` },
];

const certifications = [
  { name: "Freighter", status: "Verified" },
  { name: "Soroban", status: "Audited" },
  { name: "KYC/AML", status: "Compliant" },
  { name: "Escrow", status: "On-Chain" },
];

const SecuritySection = () => {
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
      <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none hidden lg:block">
        <AsciiTorus className="w-[500px] h-[450px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div
          className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-sm font-mono text-primary-500 mb-4">{"// TRUST & SAFETY"}</p>
          <h2 className="text-4xl lg:text-5xl font-normal tracking-tight text-white mb-6 text-balance">
            Security you can verify yourself.
          </h2>
          <p className="text-lg text-gray-400 leading-relaxed">
            Your capital is protected by on-chain escrow, verified identities, and
            an AI risk layer — not just a promise.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {securityFeatures.map((feature, index) => (
            <div
              key={feature.title}
              className={`bg-dark-800/50 rounded-xl p-6 border border-white/5 card-shadow transition-all duration-500 hover:border-primary-500/40 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <pre className="font-mono text-sm text-primary-500 mb-4 leading-tight h-12 flex items-center">
                {feature.ascii}
              </pre>
              <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>

        <div
          className={`rounded-xl bg-dark-800 border border-white/10 card-shadow p-8 transition-all duration-700 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-semibold text-lg text-white mb-2">Verified & Audited</h3>
              <p className="text-sm text-gray-400">Independently reviewed contracts and compliance standards</p>
            </div>

            <div className="flex flex-wrap gap-4 justify-center md:justify-end">
              {certifications.map((cert) => (
                <div
                  key={cert.name}
                  className="flex flex-col items-center gap-2 px-6 py-4 rounded-lg bg-white/5 border border-white/10"
                >
                  <span className="font-mono text-xs text-primary-500">{cert.name}</span>
                  <span className="text-xs text-gray-500">{cert.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;
