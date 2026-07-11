import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllBusinesses } from "../../services/business.api";
import BusinessCard from "../../components/business/BusinessCard";
import SuccessStories from "../../components/common/SuccessStories";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import HeroSection from "../../components/landing/HeroSection";
import FeaturesSection from "../../components/landing/FeaturesSection";
import HowItWorksSection from "../../components/landing/HowItWorksSection";
import InfrastructureSection from "../../components/landing/InfrastructureSection";
import MetricsSection from "../../components/landing/MetricsSection";
import IntegrationsSection from "../../components/landing/IntegrationsSection";
import SecuritySection from "../../components/landing/SecuritySection";
import DevelopersSection from "../../components/landing/DevelopersSection";
import CtaSection from "../../components/landing/CtaSection";
import { FiArrowRight } from "react-icons/fi";

const HomePage = () => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [bizRes] = await Promise.allSettled([
          getAllBusinesses({ status: "fundraising", limit: 3 }),
        ]);
        if (bizRes.status === "fulfilled")
          setBusinesses(bizRes.value.data.data?.businesses || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-dark-900">
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />

      {/* Featured Businesses */}
      <section className="relative py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-16 gap-4">
            <div>
              <p className="text-sm font-mono text-primary-500 mb-3">{"// LIVE NOW"}</p>
              <h2 className="text-3xl lg:text-5xl font-normal tracking-tight text-white text-balance">
                Featured businesses.
              </h2>
            </div>
            <Link
              to="/explore"
              className="inline-flex items-center h-11 px-6 text-sm font-medium border border-white/15 hover:bg-white/5 rounded-lg text-gray-200 transition-colors flex-shrink-0"
            >
              View All
              <FiArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : businesses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {businesses.map((b) => (
                <BusinessCard key={b._id} business={b} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-dark-800/50 card-shadow p-12 text-center">
              <p className="text-gray-400">No businesses currently fundraising. Check back soon.</p>
            </div>
          )}
        </div>
      </section>

      <InfrastructureSection />
      <MetricsSection />
      <IntegrationsSection />
      <SecuritySection />
      <DevelopersSection />

      <SuccessStories />

      <CtaSection />
    </main>
  );
};

export default HomePage;
