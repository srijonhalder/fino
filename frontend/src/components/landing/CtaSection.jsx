import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiLink } from "react-icons/fi";
import { useWallet } from "../../hooks/useWallet";
import AsciiSphere from "./AsciiSphere";

const CtaSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);
  const { isConnected, connectWallet } = useWallet();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div
          className={`relative rounded-2xl overflow-hidden transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="absolute inset-0 bg-white" />
          <div className="absolute inset-0 grid-pattern opacity-10" />

          <div className="absolute right-0 top-1/2 -translate-y-1/2 overflow-hidden opacity-15 hidden lg:block">
            <AsciiSphere />
          </div>

          <div className="relative z-10 px-8 lg:px-16 py-16">
            <div className="flex items-center justify-between gap-8">
              <div className="max-w-2xl">
                <h2 className="text-3xl lg:text-5xl font-normal tracking-tight mb-6 text-dark-900 text-balance">
                  Start earning from local businesses, today.
                </h2>

                <p className="text-lg text-dark-900/70 mb-8 leading-relaxed max-w-lg">
                  Join thousands of investors already earning passive income on
                  Fino. Free to start, no minimums.
                </p>

                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {!isConnected ? (
                    <button
                      onClick={connectWallet}
                      className="inline-flex items-center bg-dark-900 hover:bg-dark-900/90 text-white px-6 h-12 text-sm font-medium rounded-lg group transition-colors"
                    >
                      <FiLink className="w-4 h-4 mr-2" />
                      Connect Wallet
                      <FiArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ) : (
                    <Link
                      to="/explore"
                      className="inline-flex items-center bg-dark-900 hover:bg-dark-900/90 text-white px-6 h-12 text-sm font-medium rounded-lg group transition-colors"
                    >
                      Explore Businesses
                      <FiArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  )}
                  <Link
                    to="/raise-funds"
                    className="inline-flex items-center h-12 px-6 text-sm font-medium border border-dark-900/30 text-dark-900 hover:bg-dark-900/10 rounded-lg transition-colors"
                  >
                    List Your Business
                  </Link>
                </div>

                <p className="text-sm text-dark-900/50 mt-6 font-mono">No credit card. No minimum investment.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;
