import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, Plus, Database, FileText, Tag as TagIcon, X, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { DocumentRecord, CATEGORIES } from './types';
import DocumentCard from './components/DocumentCard';
import AddDocumentModal from './components/AddDocumentModal';
import ViewDocumentModal from './components/ViewDocumentModal'; // 🔴 নতুন Viewer Modal ইমপোর্ট করা হলো

export default function App() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal, Editing & Viewing State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentRecord | null>(null);
  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null); // 🔴 ভিউয়ারের জন্য স্টেট

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Fetch Documents
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(err.message || 'Failed to connect to database. Please check your Supabase configuration.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Open Modal logic
  const handleOpenAddModal = () => {
    setEditingDoc(null);
    setIsModalOpen(true);
  };

  const handleEdit = (doc: DocumentRecord) => {
    setEditingDoc(doc);
    setIsModalOpen(true);
  };

  // 🔴 নতুন View Logic (Viewer Modal ওপেন করবে) 🔴
  const handleView = (doc: DocumentRecord) => {
    setViewingDoc(doc); 
  };

  // Add OR Update Logic
  const handleAddOrUpdateDocument = async (docData: Omit<DocumentRecord, 'id' | 'created_at' | 'ref_number'>) => {
    try {
      if (editingDoc) {
        // 🟢 Update Existing Document
        const { data, error } = await supabase
          .from('documents')
          .update(docData)
          .eq('id', editingDoc.id)
          .select();

        if (error) throw error;
        if (data) {
          setDocuments(documents.map(d => d.id === editingDoc.id ? data[0] : d));
        }
      } else {
        // 🟢 Add New Document (With Random Ref Number)
        const generatedRef = `IDX-${Math.floor(100000 + Math.random() * 900000)}`;
        const { data, error } = await supabase
          .from('documents')
          .insert([{ ...docData, ref_number: generatedRef }])
          .select();

        if (error) throw error;
        if (data) {
          setDocuments([data[0], ...documents]);
        }
      }
      setIsModalOpen(false);
      setEditingDoc(null);
    } catch (err: any) {
      console.error('Error saving document:', err);
      alert('Failed to save document: ' + err.message);
    }
  };

  // Delete Document
  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDocuments(documents.filter(doc => doc.id !== id));
    } catch (err: any) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document: ' + err.message);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (id: string, isPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ is_pinned: isPinned })
        .eq('id', id);

      if (error) throw error;
      setDocuments(documents.map(doc => 
        doc.id === id ? { ...doc, is_pinned: isPinned } : doc
      ));
    } catch (err: any) {
      console.error('Error toggling pin:', err);
    }
  };

  // Triple-Layer Search Logic
  const filteredDocuments = useMemo(() => {
    return documents
      .filter(doc => {
        const matchesSearch = 
          doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.ref_number.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
        const matchesTag = !selectedTag || (doc.tags && doc.tags.includes(selectedTag));

        return matchesSearch && matchesCategory && matchesTag;
      })
      .sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [documents, searchQuery, selectedCategory, selectedTag]);

  // Extract Popular Tags
  const popularTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    documents.forEach(doc => {
      doc.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag);
  }, [documents]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/30 selection:text-amber-400">
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <Database className="text-slate-950" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Digital Index</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Document Management</p>
            </div>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-amber-500/20 active:scale-95"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Document</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-10 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Search by title, description, or reference number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all placeholder:text-slate-600 shadow-inner"
              />
            </div>

            <div className="lg:col-span-4 relative group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={20} />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-10 py-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all appearance-none cursor-pointer shadow-inner"
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium shrink-0">
              <TagIcon size={16} />
              <span>Popular Tags:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  selectedTag === null 
                    ? 'bg-amber-500 text-slate-950 border-amber-500' 
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                All Tags
              </button>
              {popularTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    selectedTag === tag 
                      ? 'bg-amber-500 text-slate-950 border-amber-500' 
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="text-amber-500 animate-spin" size={48} />
            <p className="text-slate-500 font-medium animate-pulse">Synchronizing Index...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center max-w-2xl mx-auto">
            <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
            <h3 className="text-xl font-bold text-red-500 mb-2">System Error</h3>
            <p className="text-slate-400 mb-6">{error}</p>
            <button
              onClick={fetchDocuments}
              className="px-6 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : filteredDocuments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredDocuments.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onDelete={handleDeleteDocument}
                  onTogglePin={handleTogglePin}
                  onEdit={handleEdit}
                  onView={handleView}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-slate-800">
              <FileText className="text-slate-700" size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-300 mb-2">No Documents Found</h3>
            <p className="text-slate-500 max-w-xs">
              Try adjusting your search or filters to find what you're looking for.
            </p>
            {(searchQuery || selectedCategory !== 'All' || selectedTag) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedTag(null);
                }}
                className="mt-6 text-amber-500 hover:text-amber-400 font-bold flex items-center gap-2 transition-colors"
              >
                <X size={18} />
                Clear all filters
              </button>
            )}
          </motion.div>
        )}
      </main>

      <AddDocumentModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingDoc(null); }}
        onAdd={handleAddOrUpdateDocument}
        initialData={editingDoc}
      />

      {/* 🔴 নতুন Document Viewer Modal 🔴 */}
      <ViewDocumentModal 
        isOpen={!!viewingDoc} 
        onClose={() => setViewingDoc(null)} 
        doc={viewingDoc} 
      />
    </div>
  );
}