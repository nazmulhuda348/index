import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, Plus, Database, FileText, Tag as TagIcon, X, Loader2, AlertCircle, Wallet, FolderKanban, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { DocumentRecord, CATEGORIES } from './types';
import DocumentCard from './components/DocumentCard';
import AddDocumentModal from './components/AddDocumentModal';
import ViewDocumentModal from './components/ViewDocumentModal'; 
import FinanceDashboard from './components/FinanceDashboard';
import Auth from './components/Auth'; // 🔴 নতুন Auth কম্পোনেন্ট ইমপোর্ট করা হলো

export default function App() {
  const [session, setSession] = useState<any>(null); // 🔴 সেশন স্টেট
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'documents' | 'finance'>('documents');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentRecord | null>(null);
  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // 🔴 সেশন চেক করা হচ্ছে
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchDocuments = useCallback(async () => {
    if (!session) return; // লগইন না থাকলে ডেটা আনবে না
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(err.message || 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleAddOrUpdateDocument = async (docData: Partial<DocumentRecord>) => {
    try {
      if (editingDoc) {
        const { error } = await supabase.from('documents').update(docData).eq('id', editingDoc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('documents').insert([docData]);
        if (error) throw error;
      }
      await fetchDocuments();
      setIsModalOpen(false);
      setEditingDoc(null);
    } catch (error: any) {
      console.error('Error saving document:', error);
      alert('Failed to save document.');
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
      await fetchDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
    }
  };

  const handleTogglePin = async (id: string, currentPinStatus: boolean) => {
    try {
      const { error } = await supabase.from('documents').update({ is_pinned: !currentPinStatus }).eq('id', id);
      if (error) throw error;
      await fetchDocuments();
    } catch (error: any) {
      console.error('Error toggling pin status:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    documents.forEach(doc => {
      if (doc.tags && Array.isArray(doc.tags)) {
        doc.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.ref_number?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
      const matchesTag = !selectedTag || (doc.tags && doc.tags.includes(selectedTag));
      return matchesSearch && matchesCategory && matchesTag;
    });
  }, [documents, searchQuery, selectedCategory, selectedTag]);

  // 🔴 লগইন না থাকলে Auth পেজ দেখাবে
  if (!session) {
    return <Auth />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-300 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 relative z-20 shadow-2xl">
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-amber-500 p-2 rounded-xl shadow-lg shadow-amber-500/20">
              <Database className="text-slate-900" size={24} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Digital<span className="text-amber-500">Index</span></h1>
          </div>

          <div className="mb-8">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-3">Main Menu</h2>
            <div className="space-y-1">
              <button
                onClick={() => setCurrentView('documents')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  currentView === 'documents' ? 'bg-amber-500/10 text-amber-500 font-bold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 font-medium'
                }`}
              >
                <FolderKanban size={18} />
                <span>Documents</span>
              </button>
              <button
                onClick={() => setCurrentView('finance')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  currentView === 'finance' ? 'bg-amber-500/10 text-amber-500 font-bold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 font-medium'
                }`}
              >
                <Wallet size={18} />
                <span>Finance</span>
              </button>
            </div>
          </div>
          
          <div className="w-full h-px bg-slate-800/50 mb-6"></div>

          <div className="mb-8">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-3">Categories</h2>
            <div className="space-y-1">
              {['All', ...CATEGORIES].map(category => (
                <button
                  key={category}
                  onClick={() => { setSelectedCategory(category); setCurrentView('documents'); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate pr-2">{category}</span>
                  {category !== 'All' && (
                    <span className="bg-slate-950 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">
                      {documents.filter(d => d.category === category).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {allTags.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-3">Tags</h2>
              <div className="flex flex-wrap gap-2 px-3">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => { setSelectedTag(tag === selectedTag ? null : tag); setCurrentView('documents'); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      selectedTag === tag ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* 🔴 লগআউট সেকশন */}
        <div className="p-4 border-t border-slate-800">
           <button 
             onClick={handleLogout}
             className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors text-sm font-bold"
           >
             <LogOut size={16} /> Log Out
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950/50 relative">
        {currentView === 'documents' ? (
          <>
            <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-6 sticky top-0 z-10">
              <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
                <div className="flex-1 max-w-2xl relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents by title, content, or reference..."
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all shadow-inner"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300">
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => { setEditingDoc(null); setIsModalOpen(true); }}
                  className="bg-amber-500 text-slate-900 px-6 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-400 transition-all active:scale-95 shadow-lg shadow-amber-500/20 whitespace-nowrap"
                >
                  <Plus size={20} />
                  New Document
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className="max-w-7xl mx-auto">
                {(selectedCategory !== 'All' || selectedTag) && (
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-sm text-slate-500">Filtered by:</span>
                    {selectedCategory !== 'All' && (
                      <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-md text-sm font-medium flex items-center gap-2 border border-slate-700">
                        <Filter size={14} /> {selectedCategory}
                        <button onClick={() => setSelectedCategory('All')} className="hover:text-amber-500"><X size={14}/></button>
                      </span>
                    )}
                    {selectedTag && (
                      <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-md text-sm font-medium flex items-center gap-2 border border-amber-500/20">
                        <TagIcon size={14} /> {selectedTag}
                        <button onClick={() => setSelectedTag(null)} className="hover:text-amber-400"><X size={14}/></button>
                      </span>
                    )}
                  </div>
                )}

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
                    <p className="text-slate-400 font-medium">Syncing documents...</p>
                  </div>
                ) : error ? (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center max-w-md mx-auto mt-10">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h3 className="text-red-400 font-bold mb-1">Connection Error</h3>
                    <p className="text-red-400/80 text-sm mb-4">{error}</p>
                    <button onClick={fetchDocuments} className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg font-medium hover:bg-red-500/30 transition-colors">
                      Try Again
                    </button>
                  </div>
                ) : filteredDocuments.length > 0 ? (
                  <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence>
                      {filteredDocuments.map(doc => (
                        <DocumentCard
                          key={doc.id}
                          doc={doc}
                          onDelete={handleDeleteDocument}
                          onTogglePin={handleTogglePin}
                          onEdit={(doc) => { setEditingDoc(doc); setIsModalOpen(true); }}
                          onView={(doc) => setViewingDoc(doc)}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-slate-800">
                      <FileText className="text-slate-700" size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-300 mb-2">No Documents Found</h3>
                    <p className="text-slate-500 max-w-xs">Try adjusting your search or filters to find what you're looking for.</p>
                  </motion.div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-200">
            <FinanceDashboard />
          </div>
        )}
      </main>

      <AddDocumentModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingDoc(null); }} onAdd={handleAddOrUpdateDocument} initialData={editingDoc} />
      <ViewDocumentModal isOpen={!!viewingDoc} onClose={() => setViewingDoc(null)} document={viewingDoc} />
    </div>
  );
}