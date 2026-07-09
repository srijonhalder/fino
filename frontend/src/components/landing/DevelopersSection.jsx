import React, { useState } from "react";
import { FiCheck, FiCopy } from "react-icons/fi";

const codeExamples = [
  {
    label: "Initialize",
    code: `import { Fino } from '@fino/sdk'

const fino = new Fino({
  network: 'stellar-testnet'
})`,
  },
  {
    label: "Invest",
    code: `const receipt = await fino.invest({
  businessId: 'biz_8841',
  amount: 500,
  wallet: freighterWallet
})

console.log('Tokens minted:', receipt.tokens)`,
  },
  {
    label: "Dividends",
    code: `const history = await fino.dividends.history({
  wallet: freighterWallet
})

// Streamed on-chain, no manual claims
console.log('Total earned:', history.total)`,
  },
];

const SYNTAX_TOKEN = /(\/\/.*$)|('.*?'|".*?")|\b(import|from|const|await|console)\b|([{}()[\]])/g;

const highlightSyntax = (line) =>
  line.replace(SYNTAX_TOKEN, (match, comment, str, keyword, punct) => {
    if (comment) return `<span class="text-gray-500">${comment}</span>`;
    if (str) return `<span class="text-teal-400">${str}</span>`;
    if (keyword) return `<span class="text-primary-500">${keyword}</span>`;
    if (punct) return `<span class="text-gray-500">${punct}</span>`;
    return match;
  });

const features = [
  { title: "TypeScript-first", description: "Full type safety with auto-generated types for every API response." },
  { title: "Wallet-native", description: "First-class support for Freighter and Stellar wallet signing flows." },
  { title: "Escrow-aware", description: "SDK methods mirror the Soroban escrow and dividend contract calls exactly." },
  { title: "Zero dependencies", description: "Lightweight SDK with no external dependencies. Just 14KB gzipped." },
];

const DevelopersSection = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeExamples[activeTab].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="developers" className="relative py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-sm font-mono text-primary-500 mb-3">{"// FOR DEVELOPERS"}</p>
            <h2 className="text-3xl lg:text-5xl font-normal tracking-tight text-white mb-6 text-balance">
              Built for developers,
              <br />
              by developers.
            </h2>
            <p className="text-lg text-gray-400 mb-10 leading-relaxed">
              A thoughtfully designed SDK that mirrors our on-chain contracts. Ship
              investment features faster with intuitive APIs.
            </p>

            <div className="grid gap-6">
              {features.map((feature) => (
                <div key={feature.title} className="flex gap-4">
                  <div className="w-1 bg-primary-500/30 rounded-full shrink-0" />
                  <div>
                    <h3 className="font-medium text-white mb-1">{feature.title}</h3>
                    <p className="text-sm text-gray-400">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:sticky lg:top-32">
            <div className="rounded-xl overflow-hidden bg-dark-800 border border-white/10 card-shadow">
              <div className="flex items-center gap-1 p-2 border-b border-white/10 bg-white/5">
                {codeExamples.map((example, idx) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => setActiveTab(idx)}
                    className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
                      activeTab === idx ? "bg-dark-800 text-white" : "text-gray-500 hover:text-white"
                    }`}
                  >
                    {example.label}
                  </button>
                ))}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-2 text-gray-500 hover:text-white transition-colors"
                  aria-label="Copy code"
                >
                  {copied ? <FiCheck className="w-4 h-4 text-teal-400" /> : <FiCopy className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-6 font-mono text-sm overflow-x-auto">
                <pre className="text-gray-400">
                  <code>
                    {codeExamples[activeTab].code.split("\n").map((line, i) => (
                      <div key={i} className="leading-relaxed">
                        <span className="text-gray-600 select-none w-8 inline-block">{i + 1}</span>
                        <span dangerouslySetInnerHTML={{ __html: highlightSyntax(line) }} />
                      </div>
                    ))}
                  </code>
                </pre>
              </div>

              <div className="border-t border-white/10 p-4 bg-white/5">
                <div className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-2">
                  <span className="text-teal-400">$</span>
                  <span>npm install @fino/sdk</span>
                </div>
                <div className="text-xs font-mono text-gray-600">added 1 package in 0.4s</div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-4 text-sm">
              <button type="button" className="text-primary-500 hover:underline font-mono">Read the docs</button>
              <span className="text-white/10">|</span>
              <button type="button" className="text-gray-400 hover:text-white font-mono">View on GitHub</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DevelopersSection;
