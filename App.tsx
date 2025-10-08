import React, { useState, useCallback } from 'react';
import { Feature } from './types';
import Header from './components/Header';
import AdversarialSimulator from './features/adversarial_simulator/AdversarialSimulator';
import WhisperNetwork from './features/whisper_network/WhisperNetwork';
import SkySecure from './features/sky_secure/SkySecure';
import Dashboard from './features/dashboard/Dashboard';

const App: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<Feature | null>(null);

  const handleFeatureSelect = useCallback((feature: Feature) => {
    setActiveFeature(feature);
  }, []);

  const handleGoBack = useCallback(() => {
    setActiveFeature(null);
  }, []);

  const renderActiveFeature = () => {
    switch (activeFeature) {
      case Feature.AdversarialSimulator:
        return <AdversarialSimulator />;
      case Feature.WhisperNetwork:
        return <WhisperNetwork />;
      case Feature.SkySecure:
        return <SkySecure />;
      default:
        // When no feature is selected, show dashboard.
        // This case handles potential invalid state, defaulting to dashboard.
        return <Dashboard onSelectFeature={handleFeatureSelect} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-gray-200 font-sans">
      <Header activeFeature={activeFeature} onGoBack={handleGoBack} />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-900">
        {activeFeature === null ? (
          <Dashboard onSelectFeature={handleFeatureSelect} />
        ) : (
          renderActiveFeature()
        )}
      </main>
    </div>
  );
};

export default App;
