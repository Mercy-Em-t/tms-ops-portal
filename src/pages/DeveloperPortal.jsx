import { Link } from "react-router-dom";
import { getCurrentUser } from "../services/auth-service";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function DeveloperPortal() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  useEffect(() => {
    if (!user || user.system_role !== "system_admin") {
      navigate("/login");
    }
  }, [user, navigate]);

  const features = [
    {
      id: "wholesale",
      title: "Wholesale Sales Engine",
      description: "Propel sales with a structured catalogue and agent-assisted checkout flow.",
      icon: "📦",
      path: "/developer/wholesale",
      status: "ACTIVE"
    },
    {
      id: "journey",
      title: "Interaction Journey Map",
      description: "Visualize the transformation of high-friction inquiries into seamless sales.",
      icon: "🚀",
      path: "/developer/journey",
      status: "LIVE"
    },
    {
      id: "gateway",
      title: "API Gateway Console",
      description: "Monitor packets, latency, and system health for interconnected nodes.",
      icon: "🌐",
      path: "/admin/gateway",
      status: "ACTIVE"
    },
    {
        id: "sandbox",
        title: "Developer Sandbox",
        description: "Test custom hooks and API integrations in a zero-risk environment.",
        icon: "🧪",
        path: "/admin/engineering",
        status: "ACTIVE"
      }
  ];

  return (
    <div className="min-h-screen bg-black text-blue-400 font-mono">
      <header className="border-b border-blue-900 bg-gray-900/50 p-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
             <Link to="/admin" className="text-blue-900 hover:text-blue-400 transition">&lt; Exit Hub</Link>
             <h1 className="text-xl font-black uppercase tracking-widest text-blue-500 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                Developers Portal
             </h1>
          </div>
          <div className="text-[10px] text-blue-900 font-bold uppercase">
             Authenticated: {user?.full_name || 'System User'}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-12">
        <div className="mb-12">
          <h2 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">Accelerate Development</h2>
          <p className="text-blue-700 max-w-2xl leading-relaxed">
            Access advanced platform utilities designed to optimize business logic, monitor infrastructure, and enable complex sales workflows. 
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <Link 
              key={feature.id} 
              to={feature.path}
              className="bg-gray-900 border border-blue-900/40 p-8 rounded-xl hover:bg-blue-900/10 hover:border-blue-500 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                 <span className="px-2 py-1 border border-blue-500 text-[10px] font-bold rounded text-blue-400 uppercase">{feature.status}</span>
              </div>
              <div className="text-4xl mb-6">{feature.icon}</div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors uppercase">{feature.title}</h3>
              <p className="text-sm text-gray-500 group-hover:text-gray-300 transition-colors">{feature.description}</p>
              
              <div className="mt-8 pt-6 border-t border-blue-900/20 text-xs font-black uppercase tracking-widest text-blue-900 group-hover:text-blue-500 transition-colors">
                 Inquire Protocol &gt;
              </div>
            </Link>
          ))}
        </div>

        <section className="mt-20 border-t border-blue-900/20 pt-12">
           <div className="bg-blue-900/5 p-8 rounded-2xl border border-blue-900/20 flex flex-col md:flex-row gap-8 items-center justify-between">
              <div className="flex-1">
                 <h4 className="text-white font-bold mb-2 uppercase">Custom Integration Required?</h4>
                 <p className="text-blue-900 text-sm">Our engineering team can assist in bridging legacy systems with The Modern Savannah Wholesale Engine.</p>
              </div>
              <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold transition uppercase text-xs tracking-widest">
                 Open Ticket
              </button>
           </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto p-12 text-[10px] text-blue-900 font-bold uppercase tracking-[0.3em] flex justify-between">
         <span>Secure Environment v4.0.1</span>
         <span className="animate-pulse">Connected to Master Cluster</span>
      </footer>
    </div>
  );
}
