import { useState, useEffect } from "react";
import { upsertGoogleMetadata, getGoogleMetadata } from "../services/seo-service";

export default function GoogleListingModal({ isOpen, onClose, targetType, targetId, targetName }) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Form Fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [businessType, setBusinessType] = useState("LocalBusiness");
  const [url, setUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState({
    streetAddress: "",
    addressLocality: "",
    addressRegion: "",
    postalCode: ""
  });

  const BUSINESS_TYPES = [
    "LocalBusiness",
    "CafeOrCoffeeShop",
    "Restaurant",
    "RetailStore",
    "BarOrPub",
    "ClothingStore",
    "Bakery"
  ];

  // Derive URL defaults
  const BASE_URL = "https://www.shopqrplatform.com";
  
  useEffect(() => {
    if (isOpen) {
      loadExistingData();
    }
  }, [isOpen, targetType, targetId]);

  const loadExistingData = async () => {
    setFetching(true);
    setName(targetName || "");
    setUrl(targetType === 'platform' ? BASE_URL : `${BASE_URL}/shops/${targetId}`);
    
    // Attempt to load from DB
    const existing = await getGoogleMetadata(targetType, targetId);
    if (existing && existing.json_ld) {
      const ld = existing.json_ld;
      setName(ld.name || targetName || "");
      setDescription(ld.description || "");
      setBusinessType(ld["@type"] || (targetType === 'shop' ? "CafeOrCoffeeShop" : "Organization"));
      setPhone(ld.telephone || "");
      if (ld.url) setUrl(ld.url);
      if (ld.address) {
        setAddress({
          streetAddress: ld.address.streetAddress || "",
          addressLocality: ld.address.addressLocality || "",
          addressRegion: ld.address.addressRegion || "",
          postalCode: ld.address.postalCode || ""
        });
      }
    } else {
       // Defaults if empty
       if (targetType === 'platform') {
          setBusinessType("Organization");
       } else {
          setBusinessType("CafeOrCoffeeShop");
       }
    }
    setFetching(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": businessType,
      "name": name,
      "url": url,
    };

    if (description) jsonLd.description = description;
    if (phone) jsonLd.telephone = phone;
    
    if (address.streetAddress || address.addressLocality) {
      jsonLd.address = {
        "@type": "PostalAddress",
        ...address
      };
    }

    const { error } = await upsertGoogleMetadata(targetType, targetId, jsonLd);
    setLoading(false);

    if (error) {
      alert("Error saving metadata: " + error.message);
    } else {
      onClose(true); // pass true to indicate a refresh is needed
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-800">
            Configure Google Listing ({targetType === 'platform' ? 'Platform' : 'Shop'})
          </h2>
          <button onClick={() => onClose(false)} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="p-6">
          {fetching ? (
            <div className="text-center py-12 text-gray-500">Loading existing schema...</div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entity Name</label>
                  <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Schema Type</label>
                  {targetType === 'platform' ? (
                     <input disabled type="text" value="Organization" className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-500" />
                  ) : (
                     <select value={businessType} onChange={e => setBusinessType(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                        {BUSINESS_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                     </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target URL</label>
                <input required type="text" value={url} onChange={e => setUrl(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea rows="2" value={description} onChange={e => setDescription(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"></textarea>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h3 className="font-semibold text-gray-800 mb-4">Location & Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                    <input type="text" value={address.streetAddress} onChange={e => setAddress({...address, streetAddress: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City / Locality</label>
                    <input type="text" value={address.addressLocality} onChange={e => setAddress({...address, addressLocality: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                      <input type="text" value={address.addressRegion} onChange={e => setAddress({...address, addressRegion: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                      <input type="text" value={address.postalCode} onChange={e => setAddress({...address, postalCode: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-xl text-xs font-mono text-gray-600 overflow-x-auto border border-gray-200">
                <p className="font-bold text-gray-500 mb-2">// JSON-LD Preview</p>
                <pre>
{JSON.stringify({
  "@context": "https://schema.org",
  "@type": businessType,
  "name": name,
  "url": url,
  "telephone": phone || undefined,
  "address": (address.streetAddress || address.addressLocality) ? { "@type": "PostalAddress", ...address } : undefined
}, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => onClose(false)} className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition">Cancel</button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white transition shadow-md disabled:bg-blue-400">
                  {loading ? "Saving..." : "Deploy Metadata"}
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
