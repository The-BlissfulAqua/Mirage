
import React from 'react';
import { Feature } from '../types';
import { ShieldCheckIcon, CpuChipIcon, ShareIcon, CodeBracketSquareIcon } from './icons/FeatureIcons';

interface SidebarProps {
  activeFeature: Feature;
  onSelectFeature: (feature: Feature) => void;
}

const NavItem: React.FC<{
  feature: Feature;
  activeFeature: Feature;
  onSelectFeature: (feature: Feature) => void;
  children: React.ReactNode;
}> = ({ feature, activeFeature, onSelectFeature, children }) => {
  const isActive = activeFeature === feature;
  return (
    <li
      onClick={() => onSelectFeature(feature)}
      className={`flex items-center p-3 my-2 cursor-pointer rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-sky-500 text-white shadow-lg'
          : 'text-gray-400 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {children}
      <span className="ml-4 font-medium">{feature}</span>
    </li>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ activeFeature, onSelectFeature }) => {
  return (
    <aside className="w-64 bg-slate-800/50 p-4 flex flex-col border-r border-slate-700">
      <div className="flex items-center mb-10 p-3">
        <CodeBracketSquareIcon className="w-8 h-8 text-sky-400" />
        <h1 className="text-xl font-bold ml-3 text-white">Cyber Ops</h1>
      </div>
      <nav>
        <ul>
          <NavItem feature={Feature.AdversarialSimulator} activeFeature={activeFeature} onSelectFeature={onSelectFeature}>
            <CpuChipIcon className="w-6 h-6" />
          </NavItem>
          <NavItem feature={Feature.WhisperNetwork} activeFeature={activeFeature} onSelectFeature={onSelectFeature}>
            <ShareIcon className="w-6 h-6" />
          </NavItem>
          <NavItem feature={Feature.SkySecure} activeFeature={activeFeature} onSelectFeature={onSelectFeature}>
            <ShieldCheckIcon className="w-6 h-6" />
          </NavItem>
        </ul>
      </nav>
      <div className="mt-auto p-3 text-center text-xs text-gray-500">
        <p>&copy; 2024 SecureIntel Corp.</p>
        <p>Version 1.0.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;
