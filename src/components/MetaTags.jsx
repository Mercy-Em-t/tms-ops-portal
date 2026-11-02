import { useEffect } from "react";

/**
 * Helper function to safely truncate metadata strings
 */
const truncate = (str, max) => {
  if (!str) return "";
  if (str.length <= max) return str;
  return str.substring(0, max - 3) + "...";
};

/**
 * MetaTags Component
 * Dynamically updates document title, meta descriptions, and structured JSON-LD schemas.
 * Enforces search engine length constraints (60 chars for titles, 160 chars for descriptions).
 * 
 * @param {Object} props
 * @param {string} props.title - The page title (max 60 characters)
 * @param {string} props.description - The meta description (max 160 characters)
 * @param {string} props.ogImage - Optional OpenGraph image URL
 * @param {Object|string} props.jsonLd - Optional structured JSON-LD schema object or string
 */
export default function MetaTags({ title, description, ogImage, jsonLd }) {
  useEffect(() => {
    // 1. Dynamic Title Update (strictly max 60 characters)
    if (title) {
      document.title = truncate(title, 60);
    }

    // 2. Dynamic Description Update (strictly max 160 characters)
    if (description) {
      const cleanDesc = truncate(description, 160);
      
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", cleanDesc);
      
      // Also update OpenGraph description
      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute("content", cleanDesc);
    }

    // 3. Dynamic OpenGraph Image Update
    if (ogImage) {
      let metaOgImage = document.querySelector('meta[property="og:image"]');
      if (metaOgImage) {
        metaOgImage.setAttribute("content", ogImage);
      }
    }

    // 4. Dynamic JSON-LD Schema.org Injection
    let script = document.getElementById("savannah-json-ld");
    if (jsonLd) {
      if (!script) {
        script = document.createElement('script');
        script.id = "savannah-json-ld";
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.text = typeof jsonLd === "string" ? jsonLd : JSON.stringify(jsonLd);
    } else {
      if (script) script.remove();
    }

    // Cleanup function on unmount to prevent head tag pollution during SPA transitions
    return () => {
      const activeScript = document.getElementById("savannah-json-ld");
      if (activeScript) activeScript.remove();
    };
  }, [title, description, ogImage, jsonLd]);

  return null; // This component doesn't render anything
}

