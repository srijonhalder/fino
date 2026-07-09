import React, { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "01",
    title: "Connect",
    description: "Link your Freighter wallet in one click. No signup, no KYC required to browse and invest.",
    code: `fino.connect({
  wallet: 'freighter',
  network: 'stellar-testnet'
})`,
  },
  {
    number: "02",
    title: "Invest",
    description: "Choose a verified business, pick your amount, and buy fractional tokens instantly.",
    code: `fino.invest('biz_8841', {
  amount: 500,
  currency: 'XLM'
})`,
  },
  {
    number: "03",
    title: "Earn",
    description: "Soroban smart contracts split monthly revenue and route dividends straight to your wallet.",
    code: `fino.claimDividends({
  wallet: myWallet
}) // Paid in < 5s`,
  },
];

const CODE_TOKEN = /(\/\/.*$)|('.*?'|".*?")|(\.\w+)|\b(fino|wallet|network|amount|currency)\b|([{}()[\]:])/g;

const highlightCode = (line) =>
  line.replace(CODE_TOKEN, (match, comment, str, dot, keyword, punct) => {
    if (comment) return `<span class="text-gray-500">${comment}</span>`;
    if (str) return `<span class="text-teal-400">${str}</span>`;
    if (dot) return `<span class="text-primary-400">${dot}</span>`;
    if (keyword) return `<span class="text-white">${keyword}</span>`;
    if (punct) return `<span class="text-gray-500">${punct}</span>`;
    return match;
  });

const HowItWorksSection = () => {
  const [activeStep, setActiveStep] = useState(0);
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

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="how-it-works" ref={sectionRef} className="relative py-32 overflow-hidden bg-dark-800/30">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mb-20">
          <p className="text-sm font-mono text-primary-500 mb-3">{"// TECHNOLOGY"}</p>
          <h2
            className={`text-3xl lg:text-5xl font-normal tracking-tight text-white mb-6 transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <span className="text-balance">Three steps to</span>
            <br />
            <span className="text-balance">your first dividend.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-2">
            {steps.map((step, index) => (
              <button
                key={step.number}
                type="button"
                onClick={() => setActiveStep(index)}
                className={`w-full text-left p-6 rounded-xl border transition-all duration-300 ${
                  activeStep === index
                    ? "bg-dark-800 border-primary-500/50 card-shadow"
                    : "bg-transparent border-transparent hover:bg-dark-800/50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`font-mono text-sm transition-colors ${
                      activeStep === index ? "text-primary-500" : "text-gray-500"
                    }`}
                  >
                    {step.number}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{step.title}</h3>
                    <p
                      className={`text-sm leading-relaxed transition-colors ${
                        activeStep === index ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>

                {activeStep === index && (
                  <div className="mt-4 ml-8">
                    <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full animate-[progress_4s_linear]" style={{ width: "100%" }} />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="lg:sticky lg:top-32">
            <div className="rounded-xl overflow-hidden bg-dark-800 border border-white/10 card-shadow">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3 bg-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                </div>
                <span className="text-xs font-mono text-gray-400">invest.ts</span>
              </div>

              <div className="p-6 font-mono text-sm min-h-[200px]">
                <pre className="text-gray-400">
                  {steps[activeStep].code.split("\n").map((line, i) => (
                    <div key={`${activeStep}-${i}`} className="leading-relaxed">
                      <span className="text-gray-600 select-none w-6 inline-block">{i + 1}</span>
                      <span dangerouslySetInnerHTML={{ __html: highlightCode(line) }} />
                    </div>
                  ))}
                </pre>
              </div>

              <div className="border-t border-white/10 p-4 bg-white/5 font-mono text-xs">
                <div className="flex items-center gap-2 text-teal-400">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  Ready
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </section>
  );
};

export default HowItWorksSection;
