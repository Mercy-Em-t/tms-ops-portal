import React, { useState } from 'react';
import { useCart } from '../hooks/use-cart';

/**
 * ShoppableImage Component
 * Allows placing interactive "hotspots" on an image that reveal product info and Add to Cart button.
 * 
 * @param {Object} props
 * @param {string} props.imageUrl - The base image
 * @param {Array} props.tags - List of { x, y, product } objects
 */
export default function ShoppableImage({ imageUrl, tags }) {
  const { addItem } = useCart();
  const [activeTag, setActiveTag] = useState(null);

  const handleTagClick = (tag, e) => {
    e.stopPropagation();
    setActiveTag(activeTag === tag ? null : tag);
  };

  return (
    <div className="relative inline-block rounded-3xl overflow-hidden shadow-2xl group cursor-crosshair">
      <img 
        src={imageUrl} 
        alt="Shoppable Content" 
        className="max-w-full h-auto object-cover"
        onClick={() => setActiveTag(null)}
      />

      {/* Overlay Tags */}
      {tags.map((tag, idx) => (
        <div 
          key={idx}
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${tag.x}%`, top: `${tag.y}%` }}
        >
          {/* Pulsing Hotspot */}
          <button 
            onClick={(e) => handleTagClick(tag, e)}
            className="w-6 h-6 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40 shadow-lg group/btn hover:scale-125 transition-transform"
          >
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            <div className="absolute inset-0 bg-white/80 rounded-full scale-50"></div>
          </button>

          {/* Product Tooltip */}
          {activeTag === tag && (
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-48 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-white shadow-2xl animate-in zoom-in-95 fade-in duration-200 z-20">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-black uppercase tracking-widest text-white">{tag.product.name}</p>
                <p className="text-sm font-bold text-amber-400">KSh {tag.product.price}</p>
                <button 
                  onClick={() => addItem(tag.product)}
                  className="mt-1 bg-white text-indigo-900 text-[10px] font-black uppercase tracking-tighter py-2 px-3 rounded-lg hover:bg-amber-400 hover:text-white transition-colors"
                >
                  Add to Cart
                </button>
              </div>
              {/* Tooltip Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white/10"></div>
            </div>
          )}
        </div>
      ))}

      {/* Instructional Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity uppercase font-black tracking-widest border border-white/5">
        Click items to reveal tags
      </div>
    </div>
  );
}
