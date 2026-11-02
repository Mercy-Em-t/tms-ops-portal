import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMenuItemsByCategory } from "../services/menu-service";
import { supabase } from "../services/supabase-client";
import LoadingSpinner from "../components/LoadingSpinner";

export default function WholesaleSalesSystem() {
  const shopId = "d0dbf20e-1134-46c5-9c9d-c4e1a8f0d882"; // Wholesale Demo Shop
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState({});
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [cart, setCart] = useState([]);
  const [isAgentVisible, setIsAgentVisible] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("MPesa");
  
  // Chat Logic
  const [chatMessages, setChatMessages] = useState([
    { sender: "ai", text: "Hello! I am your Sales Assistant. Looking for anything specific in our wholesale catalog?" }
  ]);
  const [userInput, setUserInput] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const catData = await getMenuItemsByCategory(shopId);
      setCategories(catData);
      setAllProducts(Object.values(catData).flat());
    } catch (err) {
      console.error("Fetch Failed", err);
    } finally {
      setLoading(false);
    }
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const addToCart = (product) => {
    // Use functional update to avoid stale closure issues
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleSendMessage = async (customText = null) => {
    const text = customText || userInput;
    if (!text.trim()) return;

    const newMessages = [...chatMessages, { sender: "user", text }];
    setChatMessages(newMessages);
    setUserInput("");

    // Simulate AI / Agent Logic
    setTimeout(() => {
        let aiResponse = "I'm checking our inventory for you...";
        let recommendations = [];

        const lowerText = text.toLowerCase();
        
        // Simple keyword search
        if (lowerText.includes("yarn") || lowerText.includes("thread")) {
            recommendations = allProducts.filter(p => (p.category === "Yarns" || p.category === "Threads")).slice(0, 3);
            aiResponse = `Based on your interest in ${lowerText.includes("yarn") ? "yarns" : "threads"}, I've found these high-quality wholesale batches. Shall I add them to your cart?`;
        } else if (lowerText.includes("button") || lowerText.includes("bead")) {
            recommendations = allProducts.filter(p => (p.category === "Buttons" || p.category === "Beads")).slice(0, 3);
            aiResponse = `We have a great selection of ${lowerText.includes("button") ? "buttons" : "beads"}. I recommend these for bulk projects:`;
        } else if (lowerText.includes("catalog")) {
            aiResponse = "Of course! You can see our full catalog on the left. We specialize in Yarns, Threads, Buttons, Fabrics, and Beads.";
        } else {
            aiResponse = "I can help you with specific item availability. Try asking about 'Yarns', 'Buttons' or 'Fabrics'.";
        }

        setChatMessages([...newMessages, { sender: "ai", text: aiResponse, recommendations }]);
    }, 1000);
  };

  const propelCart = (product) => {
    // Functional cart update avoids the stale state closure
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setChatMessages(prev => [...prev, { sender: "ai", text: `Done! ✅ I've added "${product.name}" to your batch order. Shall we keep going or head to checkout?` }]);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Your batch order is empty. Add items first!");
    if (isCheckingOut) return;
    
    try {
       setIsCheckingOut(true);

       const payload = {
         shop_id: shopId,
         table_id: "WHOLESALE",
         total_price: subtotal,
         discount_amount: 0,
         client_name: "Wholesale Buyer",
         client_phone: "+254000000000",
         customer_email: "buyer@wholesale.com",
         fulfillment_type: "delivery",
         delivery_address: "Wholesale Warehouse A",
         delivery_fee_charged: 0,
         items: cart.map(i => ({ id: i.id, quantity: i.quantity }))
       };

       const { data: orderId, error } = await supabase.rpc("checkout_cart", { payload });

       if (error) {
         console.error("Checkout RPC error:", error);
         setChatMessages(prev => [...prev, { sender: "ai", text: `⚠️ Order could not be logged: ${error.message}` }]);
       } else {
         const ref = (orderId || crypto.randomUUID()).toString().slice(0, 8).toUpperCase();
         setCart([]);
         setIsAgentVisible(true);
         setChatMessages(prev => [...prev, { sender: "ai", text: `🎉 Order #${ref} confirmed! Your batch is pending fulfillment. I'll notify you once dispatched.` }]);
         alert(`✅ Order Placed! Ref: ${ref}`);
       }
    } catch (err) {
       console.error("Checkout error:", err);
       setChatMessages(prev => [...prev, { sender: "ai", text: `⚠️ Checkout encountered an issue: ${err.message}` }]);
    } finally {
       setIsCheckingOut(false);
    }
  };

  if (loading && Object.keys(categories).length === 0) return <LoadingSpinner message="Syncing Wholesale Registry..." />;

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans text-[#2D3748]">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-50 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
           <Link to="/developer/portal" className="text-gray-400 hover:text-blue-600 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
           </Link>
           <div>
              <h1 className="text-xl font-black text-[#1A365D] tracking-tight">Craft Supplies Wholesale</h1>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Global Distribution Portal</p>
           </div>
        </div>
        <div className="flex items-center gap-6">
           <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-gray-400 uppercase">Registry Status</div>
              <div className="text-sm font-black text-blue-600 uppercase">Live Sync Active</div>
           </div>
           <button className="bg-[#1A365D] text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-blue-800 transition">
              Help Desk
           </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-10">
        <div className="grid lg:grid-cols-[3fr_1fr] gap-10">
          
          {/* CATALOG SECTION */}
          <section>
            <div className="mb-8 items-end flex justify-between">
               <div>
                  <h2 className="text-2xl font-black text-[#1A365D] mb-2 uppercase">Professional Catalogue</h2>
                  <p className="text-gray-500 text-sm">Real-time stock from the Master Registry. wholesale prices shown.</p>
               </div>
            </div>

            <div className="space-y-12">
               {Object.keys(categories).length === 0 ? (
                  <div className="p-20 text-center bg-white border border-dashed border-gray-200 rounded-3xl text-gray-400">
                     <p>Product feed is currently empty. Run the seed script to populate.</p>
                  </div>
               ) : (
                  Object.keys(categories).map(catName => (
                    <div key={catName}>
                       <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 mb-6 border-b border-gray-100 pb-2">{catName}</h3>
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                         {categories[catName].map((product) => (
                           <div key={product.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col">
                              <div className="bg-gray-50 aspect-[4/3] flex items-center justify-center text-4xl group-hover:scale-110 transition-transform bg-gradient-to-br from-white to-gray-50 relative">
                                 {catName === "Yarns" && "🧶"}
                                 {catName === "Threads" && "🧵"}
                                 {catName === "Buttons" && "🔘"}
                                 {catName === "Fabrics" && "📦"}
                                 {catName === "Beads" && "📿"}
                                 {!["Yarns", "Threads", "Buttons", "Fabrics", "Beads"].includes(catName) && "📦"}
                                 
                                 <div className="absolute top-2 right-2 bg-white/80 backdrop-blur px-2 py-0.5 rounded text-[9px] font-black uppercase text-blue-800 border border-blue-50">
                                    MOQ: {product.metadata?.moq || 1}
                                 </div>
                              </div>
                              <div className="p-4 flex-1 flex flex-col justify-between">
                                 <div>
                                   <h3 className="font-bold text-gray-800 group-hover:text-blue-700 transition-colors uppercase text-sm line-clamp-1">{product.name}</h3>
                                   <div className="text-xs text-gray-400 mt-1">${product.price} / unit</div>
                                 </div>
                                 <button 
                                   onClick={() => addToCart(product)}
                                   className="mt-4 w-full border border-gray-200 py-1.5 rounded-lg text-[10px] font-black uppercase text-gray-400 group-hover:border-blue-700 group-hover:text-blue-700 transition-all"
                                 >
                                   Add to Batch
                                 </button>
                              </div>
                           </div>
                         ))}
                       </div>
                    </div>
                  ))
               )}
            </div>
          </section>

          {/* SIDEBAR: CART */}
          <aside className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm sticky top-28">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black uppercase text-xs tracking-widest text-gray-400">Batch Order</h3>
                  <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px]">{cart.length} ITEMS</span>
               </div>

               <div className="space-y-4 mb-8 max-h-[300px] overflow-y-auto pr-2">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                       <div className="flex items-center gap-3">
                          <div className="font-bold text-gray-700 line-clamp-1">{item.name}</div>
                       </div>
                       <div className="font-black text-gray-800">${item.price * item.quantity}</div>
                    </div>
                  ))}
                  {cart.length === 0 && <div className="text-center py-10 text-gray-300 text-xs italic">Selection is empty</div>}
               </div>

               <div className="border-t border-gray-100 pt-6 space-y-3">
                  <div className="flex justify-between text-base pt-2">
                     <span className="text-gray-400 font-black uppercase text-xs">Total Est:</span>
                     <span className="font-black text-[#1A365D] tracking-tighter text-xl">${subtotal}</span>
                  </div>
               </div>

               <div className="mt-8 space-y-2">
                  <button 
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className="w-full bg-[#1A365D] text-white py-4 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-blue-800 transition shadow-lg shadow-blue-900/10 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isCheckingOut ? "Processing..." : "Yes, Checkout"}
                  </button>
                  <button 
                    onClick={() => setCart([])}
                    className="w-full bg-white border border-gray-200 text-gray-400 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-gray-50 transition"
                  >
                    Clear All
                  </button>
               </div>
            </div>
          </aside>
        </div>
      </main>

      {/* RESTORE BUTTON: shown when agent is minimized */}
      {!isAgentVisible && (
        <button
          onClick={() => setIsAgentVisible(true)}
          className="fixed bottom-6 right-6 z-[200] bg-[#1A365D] text-white px-5 py-3 rounded-full shadow-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition animate-bounce"
        >
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          Sales Agent
        </button>
      )}

      {/* FLOATING: AGENT INTERFACE (INTERACTIVE) */}
      {isAgentVisible && (
        <div className="fixed bottom-10 right-10 w-[380px] bg-white border-t-4 border-[#1A365D] rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-500 z-[100] flex flex-col h-[500px]">
           <div className="bg-[#1A365D] px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-xs font-bold ring-2 ring-blue-900 text-white">SA</div>
                 <h4 className="text-white font-black uppercase text-[11px] tracking-widest">Sales Assistant</h4>
              </div>
              <button onClick={() => setIsAgentVisible(false)} className="text-blue-300 hover:text-white">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>
           </div>

           <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                   <div className={`max-w-[80%] p-3 rounded-2xl text-[11px] leading-relaxed ${msg.sender === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-gray-100 text-gray-700 rounded-tl-none border border-gray-200"}`}>
                      {msg.text}
                      
                      {msg.recommendations?.length > 0 && (
                        <div className="mt-3 space-y-2">
                           {msg.recommendations.map(rec => (
                             <div key={rec.id} className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between gap-2">
                                <span className="font-bold text-gray-800 truncate">{rec.name}</span>
                                <button 
                                  onClick={() => propelCart(rec)}
                                  className="bg-green-600 text-white px-2 py-1 rounded text-[9px] font-black uppercase whitespace-nowrap"
                                >
                                   Propel
                                </button>
                             </div>
                           ))}
                        </div>
                      )}
                   </div>
                </div>
              ))}
           </div>

           <div className="p-4 border-t border-gray-100 bg-white shrink-0">
              <div className="flex gap-2">
                 <input 
                   type="text" 
                   value={userInput}
                   onChange={(e) => setUserInput(e.target.value)}
                   onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                   placeholder="Ask about Yarns, Buttons, etc..." 
                   className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-blue-500"
                 />
                 <button 
                   onClick={() => handleSendMessage()}
                   className="bg-[#1A365D] text-white p-2 rounded-xl"
                 >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
                 </button>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                 <button onClick={() => handleSendMessage("Do you have yarns?")} className="shrink-0 bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[10px] font-bold border border-blue-100">Check Yarns</button>
                 <button onClick={() => handleSendMessage("Share catalogue")} className="shrink-0 bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[10px] font-bold border border-blue-100">Show Catalog</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
