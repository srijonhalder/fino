import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiLink, FiSearch } from "react-icons/fi";
import { useWallet } from "../../hooks/useWallet";
import AsciiWave from "./AsciiWave";

const STATS = [
  { value: "500+", label: "verified businesses raising capital.", company: "STELLAR" },
  { value: "5 sec", label: "finality on every investment.", company: "SOROBAN" },
  { value: "₹100", label: "minimum ticket to start investing.", company: "FREIGHTER" },
  { value: "12K+", label: "investors earning monthly dividends.", company: "FINO" },
];

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { isConnected, connectWallet } = useWallet();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20">
      <div className="absolute inset-0 grid-pattern opacity-50" />

      <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
        <AsciiWave className="w-full h-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-24 w-full">
        <div className="text-center max-w-5xl mx-auto mb-10">
          <h1
            className={`text-5xl md:text-7xl font-normal tracking-tight leading-[0.95] mb-8 transition-all duration-700 delay-100 lg:text-7xl ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <span className="text-balance">The complete platform to</span>
            <br />
            <span className="text-balance">invest in your</span>{" "}
            <span className="text-primary-500">community.</span>
          </h1>

          <p
            className={`text-lg text-gray-400 max-w-xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Connect your Freighter wallet, buy fractional tokens of verified local
            businesses, and earn monthly dividends — all secured by Soroban smart
            contracts on Stellar.
          </p>
        </div>

        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-3 mb-20 transition-all duration-700 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {!isConnected ? (
            <button
              onClick={connectWallet}
              className="inline-flex items-center bg-white hover:bg-white/90 text-dark-900 px-6 h-11 text-sm font-medium rounded-lg group transition-colors"
            >
              <FiLink className="w-4 h-4 mr-2" />
              Connect Wallet to Invest
              <FiArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
            </button>
          ) : (
            <Link
              to="/explore"
              className="inline-flex items-center bg-white hover:bg-white/90 text-dark-900 px-6 h-11 text-sm font-medium rounded-lg group transition-colors"
            >
              <FiSearch className="w-4 h-4 mr-2" />
              Explore & Invest Now
              <FiArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
          <Link
            to="/raise-funds"
            className="inline-flex items-center h-11 px-6 text-sm font-medium border border-white/15 hover:bg-white/5 rounded-lg text-gray-200 transition-colors"
          >
            Raise Funds for Your Business
          </Link>
        </div>

        <div
          className={`grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 rounded-xl overflow-hidden card-shadow transition-all duration-700 delay-400 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {STATS.map((stat) => (
            <div
              key={stat.company}
              className="p-6 lg:p-8 flex justify-between min-h-[140px] bg-dark-950 flex-col"
            >
              <div>
                <span className="text-xl lg:text-2xl font-semibold text-white">{stat.value}</span>
                <span className="text-gray-400 text-sm lg:text-base"> {stat.label}</span>
              </div>
              <div className="font-mono text-xs text-gray-500 tracking-widest mt-4">
                {stat.company}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
