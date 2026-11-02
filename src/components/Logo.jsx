// src/components/Logo.jsx
import React from "react";

export default function Logo({ 
  className = "h-8 w-8", 
  textClassName = "font-black text-xl tracking-tight text-white" 
}) {
  return (
    <div className="flex items-center gap-2 group cursor-pointer select-none">
      <div className={`${className} rounded-xl bg-emerald-600 flex items-center justify-center shadow-md font-bold text-white text-base`}>
        ⚙️
      </div>
      <span className={textClassName}>
        TMS Ops
      </span>
    </div>
  );
}
