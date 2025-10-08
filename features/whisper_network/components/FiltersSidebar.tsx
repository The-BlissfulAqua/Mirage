import React, { useState, useEffect } from 'react';
import { FilterOptions } from '../types';

interface FiltersSidebarProps {
  onFilterChange: (filters: FilterOptions) => void;
  activeFilters: FilterOptions;
  searchInputRef: React.RefObject<HTMLInputElement>;
}

type Platform = 'Twitter' | 'Reddit' | 'Telegram' | 'News';
type Sentiment = 'positive' | 'neutral' | 'negative' | 'hostile';
type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';

const platformOptions: Platform[] = ['Twitter', 'Reddit', 'Telegram', 'News'];
const sentimentOptions: Sentiment[] = ['positive', 'neutral', 'negative', 'hostile'];
const threatLevelOptions: ThreatLevel[] = ['low', 'medium', 'high', 'critical'];
const locationOptions = ['All Locations', 'Pahalgam', 'Anantnag', 'Srinagar', 'Pahalgam Town', 'Anantnag-Pahalgam Road', 'Near Pahalgam', 'Pahalgam Market', 'Pahalgam Attack Site'];

const FiltersSidebar: React.FC<FiltersSidebarProps> = ({ onFilterChange, activeFilters, searchInputRef }) => {
  const [searchQuery, setSearchQuery] = useState(activeFilters.searchQuery);
  const [openSection, setOpenSection] = useState<string | null>('search');

  // Debounce search query changes before notifying the parent
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery !== activeFilters.searchQuery) {
        onFilterChange({ ...activeFilters, searchQuery });
      }
    }, 300); // 300ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, activeFilters, onFilterChange]);

  // Update local search query if parent changes it (e.g., keyword click)
  useEffect(() => {
    setSearchQuery(activeFilters.searchQuery);
  }, [activeFilters.searchQuery]);


  const handleFilterChange = <K extends keyof FilterOptions>(key: K, value: FilterOptions[K]) => {
    onFilterChange({ ...activeFilters, [key]: value });
  };
  
  const handleCheckboxChange = <T extends Platform | Sentiment | ThreatLevel>(
    key: 'platforms' | 'sentiments' | 'threatLevels',
    value: T
  ) => {
    const currentValues = activeFilters[key] as T[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    handleFilterChange(key, newValues as any);
  };
  
  const handleClear = () => {
    const cleared: FilterOptions = {
        platforms: [], sentiments: [], threatLevels: [],
        dateRange: { start: null, end: null }, searchQuery: '', location: 'All Locations'
    };
    setSearchQuery('');
    onFilterChange(cleared);
  }

  const activeFilterCount =
    activeFilters.platforms.length +
    activeFilters.sentiments.length +
    activeFilters.threatLevels.length +
    (activeFilters.location !== 'All Locations' ? 1 : 0) +
    (activeFilters.dateRange.start ? 1 : 0) +
    (activeFilters.searchQuery ? 1 : 0);

  return (
    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">Intel Filters</h3>
        {activeFilterCount > 0 && <span className="text-xs bg-sky-500 text-white font-bold px-2 py-1 rounded-full">{activeFilterCount} Active</span>}
      </div>
      
      <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
        <CollapsibleSection title="Search (Press / to focus)" isOpen={openSection === 'search'} onToggle={() => setOpenSection(openSection === 'search' ? null : 'search')}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search content, users, keywords..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
          />
        </CollapsibleSection>
        
        <CollapsibleSection title="Platforms" isOpen={openSection === 'platform'} onToggle={() => setOpenSection(openSection === 'platform' ? null : 'platform')}>
            {platformOptions.map(p => (
                <Checkbox key={p} label={p} isChecked={activeFilters.platforms.includes(p)} onChange={() => handleCheckboxChange('platforms', p)} />
            ))}
        </CollapsibleSection>

        <CollapsibleSection title="Sentiments" isOpen={openSection === 'sentiment'} onToggle={() => setOpenSection(openSection === 'sentiment' ? null : 'sentiment')}>
             {sentimentOptions.map(s => (
                <Checkbox key={s} label={s} isChecked={activeFilters.sentiments.includes(s)} onChange={() => handleCheckboxChange('sentiments', s)} />
            ))}
        </CollapsibleSection>

        <CollapsibleSection title="Threat Levels" isOpen={openSection === 'threat'} onToggle={() => setOpenSection(openSection === 'threat' ? null : 'threat')}>
            {threatLevelOptions.map(t => (
                <Checkbox key={t} label={t} isChecked={activeFilters.threatLevels.includes(t)} onChange={() => handleCheckboxChange('threatLevels', t)} />
            ))}
        </CollapsibleSection>
        
         <CollapsibleSection title="Location" isOpen={openSection === 'location'} onToggle={() => setOpenSection(openSection === 'location' ? null : 'location')}>
            <select
                value={activeFilters.location}
                onChange={e => handleFilterChange('location', e.target.value)}
                 className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none">
                 {locationOptions.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
        </CollapsibleSection>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700">
        <button onClick={handleClear} className="w-full px-4 py-2 text-sm font-bold text-white bg-slate-600 rounded-md hover:bg-slate-700 transition-colors">Clear All Filters</button>
      </div>
    </div>
  );
};

const CollapsibleSection: React.FC<{title: string, isOpen: boolean, onToggle: () => void, children: React.ReactNode}> = ({ title, isOpen, onToggle, children }) => (
    <div className="border-b border-slate-700 pb-2">
        <button onClick={onToggle} className="w-full flex justify-between items-center text-left font-semibold text-white">
            <span>{title}</span>
            <span className={`transform transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`}>{isOpen ? '▲' : '▼'}</span>
        </button>
        {isOpen && <div className="mt-3 space-y-2">{children}</div>}
    </div>
);

const Checkbox: React.FC<{label: string, isChecked: boolean, onChange: () => void}> = ({ label, isChecked, onChange }) => (
    <label className="flex items-center space-x-2 cursor-pointer text-gray-300">
        <input type="checkbox" checked={isChecked} onChange={onChange} className="form-checkbox h-4 w-4 bg-slate-700 border-slate-600 rounded text-sky-500 focus:ring-sky-500" />
        <span className="capitalize">{label}</span>
    </label>
);

export default FiltersSidebar;
