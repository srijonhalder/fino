import React from "react";
import { Link } from "react-router-dom";
import { FiExternalLink, FiGithub, FiTwitter } from "react-icons/fi";
import finoLogo from "../../assets/fino-logo-white.png";

const footerLinks = {
  Platform: [
    { to: "/explore", label: "Explore Businesses" },
    { to: "/governance", label: "Governance" },
    { to: "/raise-funds", label: "Raise Funds" },
  ],
  Investors: [
    { to: "/dashboard/investor", label: "My Portfolio" },
    { to: "/dividends", label: "Dividend History" },
    { to: "/kyc", label: "Complete KYC" },
  ],
  Resources: [
    { href: "https://stellar.expert/explorer/testnet", label: "Block Explorer", external: true },
    { href: "https://developers.stellar.org", label: "Stellar Docs", external: true },
  ],
};

const FooterCol = ({ title, links }) => (
  <div>
    <h3 className="text-sm font-medium text-gray-300 mb-4">{title}</h3>
    <ul className="space-y-3">
      {links.map((l) =>
        l.external ? (
          <li key={l.label}>
            <a
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-white transition-colors flex items-center gap-1 group"
            >
              <span>{l.label}</span>
              <FiExternalLink size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          </li>
        ) : (
          <li key={l.label}>
            <Link to={l.to} className="text-sm text-gray-500 hover:text-white transition-colors">
              {l.label}
            </Link>
          </li>
        )
      )}
    </ul>
  </div>
);

const Footer = () => (
  <footer className="relative border-t border-white/10 bg-dark-900">
    <div className="max-w-7xl mx-auto px-6 lg:px-8">
      <div className="py-16 grid grid-cols-2 md:grid-cols-6 gap-8">
        {/* Brand */}
        <div className="col-span-2">
          <Link to="/" className="flex items-center gap-2 mb-6 group">
            <img src={finoLogo} alt="Fino" className="h-6 w-auto" />
            <span className="font-semibold text-lg tracking-tight text-white">Fino</span>
          </Link>

          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            Community-powered micro-investment in local businesses, secured by
            Soroban smart contracts on Stellar.
          </p>

          <div className="flex gap-3">
            <a
              href="https://github.com/srijonhalder"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-white transition-colors"
              aria-label="GitHub"
            >
              <FiGithub className="w-5 h-5" />
            </a>
            <a
              href="https://x.com/AnindhaBiswas"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-white transition-colors"
              aria-label="Twitter"
            >
              <FiTwitter className="w-5 h-5" />
            </a>
          </div>
        </div>

        {Object.entries(footerLinks).map(([title, links]) => (
          <FooterCol key={title} title={title} links={links} />
        ))}
      </div>

      <div className="py-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Fino. Built on{" "}
          <span className="text-gradient font-medium">Stellar Blockchain</span>.
        </p>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
          All contracts operational
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
