import React, { useState, useEffect } from 'react';
import { BusinessWorker } from '../services/BusinessWorker';
import MetaTags from './MetaTags';

/**
 * BusinessModeler Component
 * Premium interface for defining business intelligence and SEO.
 */
export const BusinessModeler = ({ shopData, onSave }) => {
  const [engine, setEngine] = useState(new BusinessWorker(shopData));
  const [metadata, setMetadata] = useState(engine.attributes);
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  const handleUpdate = (field, value) => {
    const updated = { ...metadata, [field]: value };
    setMetadata(updated);
    engine.setModel(updated);
  };

  const testDiscovery = () => {
    const result = engine.matchesQuery(query);
    setSearchResult(result);
  };

  const seo = engine.getSEOMetadata();

  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 text-white shadow-2xl space-y-8 max-w-4xl mx-auto my-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Business Creator Worker
          </h2>
          <p className="text-gray-400 mt-2">Model your business intelligence and optimize for discovery.</p>
        </div>
        <button 
          onClick={() => onSave?.(metadata)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30"
        >
          <span>Save Intelligence</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
        {/* Definition Section */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-300">Mission Statement</label>
          <textarea 
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none h-24"
            placeholder="What is the primary purpose of your business?"
            value={metadata.mission}
            onChange={(e) => handleUpdate('mission', e.target.value)}
          />

          <label className="block text-sm font-medium text-gray-300">Brand Tone</label>
          <select 
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={metadata.brandTone}
            onChange={(e) => handleUpdate('brandTone', e.target.value)}
          >
            <option value="professional">Professional</option>
            <option value="friendly">Friendly / Peer-to-Peer</option>
            <option value="luxury">Luxury / High-End</option>
            <option value="quirky">Quirky / Creative</option>
          </select>
        </div>

        {/* SEO & Keywords Section */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-300">Keywords (Comma separated)</label>
          <input 
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="organic, delivery, express..."
            value={metadata.keywords.join(', ')}
            onChange={(e) => handleUpdate('keywords', e.target.value.split(',').map(s => s.trim()))}
          />

          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <h4 className="text-blue-400 font-semibold flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"/></svg>
              SEO Preview
            </h4>
            <div className="mt-3 text-sm">
              <div className="text-blue-500 truncate">{seo.title}</div>
              <div className="text-green-600 truncate text-xs">https://{shopData.subdomain}.tmsavannah.com</div>
              <div className="text-gray-400 line-clamp-2 mt-1 italic">"{seo.description}"</div>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-white/5" />

      {/* Discovery Tool Section */}
      <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>🔍</span> Discovery Logic Test
        </h3>
        <p className="text-sm text-gray-400 mb-4 italic">Example: "Where can I get fresh organic coffee?"</p>
        <div className="flex gap-4">
          <input 
            className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
            placeholder="Type a customer query..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button 
            onClick={testDiscovery}
            className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl transition-all"
          >
            Run Test
          </button>
        </div>

        {searchResult && (
          <div className={`mt-6 p-4 rounded-xl border animate-in fade-in slide-in-from-top-4 ${searchResult.matched ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{searchResult.matched ? '✅' : '❌'}</span>
              <div>
                <div className="font-bold">{searchResult.matched ? 'Business Found!' : 'No direct match found.'}</div>
                <div className="text-sm text-gray-400">{searchResult.matched ? searchResult.message : 'Try adding more keywords or USPs above.'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
