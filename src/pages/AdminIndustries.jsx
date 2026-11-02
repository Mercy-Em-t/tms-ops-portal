import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase-client";
import { getCurrentUser, logout } from "../services/auth-service";

export default function AdminIndustries() {
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const navigate = useNavigate();
  const user = getCurrentUser();

  useEffect(() => {
    if (!user || user.system_role !== "system_admin") {
      navigate("/login");
      return;
    }
    fetchIndustries();
  }, [navigate]);

  const fetchIndustries = async () => {
    setLoading(true);
    const { data } = await supabase.from("industry_types").select("*").order("created_at", { ascending: true });
    if (data) setIndustries(data);
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newSlug || !newName) return;
    try {
      const { error } = await supabase.from("industry_types").insert([{
        slug: newSlug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
        name: newName,
        description: newDesc
      }]);
      if (error) throw error;
      setNewSlug("");
      setNewName("");
      setNewDesc("");
      fetchIndustries();
    } catch (err) {
      alert("Failed to insert category: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently delete this industry taxonomy?")) return;
    try {
      const { error } = await supabase.from("industry_types").delete().eq("id", id);
      if (error) throw error;
      fetchIndustries();
    } catch(err) {
      alert("Delete failed: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/admin" className="text-indigo-600 font-medium hover:text-indigo-700 transition-colors">← System Admin</Link>
          <h1 className="text-xl font-bold text-gray-800">Industry Taxonomy Builder</h1>
          <button onClick={() => { logout(); navigate("/login"); }} className="text-sm font-bold text-red-500 hover:text-red-700 cursor-pointer transition-colors">Logout</button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8 grid md:grid-cols-[2fr_1.5fr] gap-8">
        <div>
          <h2 className="text-lg font-bold mb-4 text-gray-800">Active Map Classifications</h2>
          {loading ? <p className="text-gray-500">Retrieving taxonomy nodes...</p> : (
            <div className="space-y-3">
              {industries.map(ind => (
                <div key={ind.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{ind.name}</h3>
                    <p className="text-xs font-mono text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 inline-block mb-2">slug: {ind.slug}</p>
                    <p className="text-sm text-gray-600">{ind.description}</p>
                  </div>
                  <button onClick={() => handleDelete(ind.id)} className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold cursor-pointer h-fit border border-transparent hover:border-red-100 shadow-sm">Delete</button>
                </div>
              ))}
              {industries.length === 0 && <p className="text-gray-500 italic bg-white p-4 rounded-xl border border-gray-100">No industry types currently mapped. The sandbox builder will lack options.</p>}
            </div>
          )}
        </div>
        <div>
          <form onSubmit={handleCreate} className="bg-indigo-600 p-6 rounded-xl shadow-lg sticky top-24 text-white">
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
               <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
               Add Taxonomy Node
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-indigo-100 mb-1">Database Slug</label>
                <input required value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="e.g. hospitality" className="w-full bg-indigo-700/50 border border-indigo-400 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-white transition font-mono text-sm" />
                <p className="text-[10px] text-indigo-300 mt-1">Unique database identifier structure.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-indigo-100 mb-1">Client Display Name</label>
                <input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Travel & Hospitality" className="w-full bg-indigo-700/50 border border-indigo-400 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-white transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-indigo-100 mb-1">Definition (Optional)</label>
                <textarea rows="3" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Hotels, Airbnb, resorts..." className="w-full bg-indigo-700/50 border border-indigo-400 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-white transition text-sm"></textarea>
              </div>
              <button type="submit" className="w-full bg-white text-indigo-800 font-bold py-3 mt-2 rounded-lg hover:bg-indigo-50 transition cursor-pointer shadow-md">Deploy Category</button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
