import React from 'react';
import { Feature } from '../../types';
import { CpuChipIcon, ShareIcon, ShieldCheckIcon } from '../../components/icons/FeatureIcons';

interface FeatureCardProps {
  feature: Feature;
  description: string;
  icon: React.ReactNode;
  iconContainerClass: string;
  borderColorClass: string;
  onSelect: (feature: Feature) => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature, description, icon, iconContainerClass, borderColorClass, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(feature)}
      className={`bg-slate-800/50 border border-slate-700 rounded-2xl p-6 lg:p-8 flex flex-col items-start text-left transform hover:-translate-y-1 transition-transform duration-300 cursor-pointer group hover:border-${borderColorClass}`}
      role="button"
      tabIndex={0}
      aria-label={`Select ${feature}`}
    >
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 border ${iconContainerClass}`}>
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-white mb-3">{feature}</h3>
      <p className="text-gray-400 text-base flex-grow">{description}</p>
    </div>
  );
};

const featureList = [
  {
    feature: Feature.AdversarialSimulator,
    description: "A single-run scenario where an AI Red Team attacks a system. If a bypass occurs, an AI Blue Team generates a patch and provides a full analysis of the incident and mitigation.",
    icon: <CpuChipIcon className="w-8 h-8 text-blue-300" />,
    iconContainerClass: "bg-blue-900/30 border-blue-600/50",
    borderColorClass: "blue-400",
  },
  {
    feature: Feature.WhisperNetwork,
    description: "Monitor social media & news to detect threat indicators via sentiment analysis. Demo uses the Pahalgam attack scenario to show pre-attack chatter detection.",
    icon: <ShareIcon className="w-8 h-8 text-green-300" />,
    iconContainerClass: "bg-green-900/30 border-green-600/50",
    borderColorClass: "green-400",
  },
  {
    feature: Feature.SkySecure,
    description: "Monitor system-wide security events, threat levels, and anomalies with an AI-powered analyst.",
    icon: <ShieldCheckIcon className="w-8 h-8 text-purple-300" />,
    iconContainerClass: "bg-purple-900/30 border-purple-600/50",
    borderColorClass: "purple-400",
  },
];


const Dashboard: React.FC<{ onSelectFeature: (feature: Feature) => void; }> = ({ onSelectFeature }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">Cyber Operations Suite</h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">An integrated platform for advanced AI security simulation, network monitoring, and threat analysis.</p>
        </div>
        <div className="w-full max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featureList.map((item) => (
                    <FeatureCard
                        key={item.feature}
                        feature={item.feature}
                        description={item.description}
                        icon={item.icon}
                        iconContainerClass={item.iconContainerClass}
                        borderColorClass={item.borderColorClass}
                        onSelect={onSelectFeature}
                    />
                ))}
            </div>
        </div>
    </div>
  );
};

export default Dashboard;