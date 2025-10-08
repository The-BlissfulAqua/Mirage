import React from 'react';
import { Feature } from '../types';
import { ArrowLeftIcon } from './icons/FeatureIcons';

interface HeaderProps {
  activeFeature: Feature | null;
  onGoBack: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeFeature, onGoBack }) => {
  return (
    <header className="bg-slate-800/50 p-4 border-b border-slate-700 flex justify-between items-center z-10">
      <div className="flex items-center">
        {activeFeature && (
          <button
            onClick={onGoBack}
            className="mr-4 p-2 rounded-full hover:bg-slate-700 transition-colors"
            aria-label="Go back to dashboard"
          >
            <ArrowLeftIcon className="w-6 h-6 text-gray-300" />
          </button>
        )}
        <h2 className="text-2xl font-bold text-white">
          {activeFeature ? activeFeature : 'Cyber Operations Dashboard'}
        </h2>
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 hover:text-white cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-slate-800"></span>
        </div>
        <img
          src="https://picsum.photos/100"
          alt="User Avatar"
          className="w-10 h-10 rounded-full border-2 border-sky-400"
        />
      </div>
    </header>
  );
};

export default Header;
