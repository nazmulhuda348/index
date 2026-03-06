import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Plus, Tag as TagIcon, Save, Maximize2, FileText, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JoditEditor from 'jodit-react';
import { CATEGORIES, DocumentRecord } from '../types';

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (doc: any) => Promise<void>;
  initialData?: DocumentRecord | null;
}

export default function AddDocumentModal({ isOpen, onClose, onAdd, initialData }: AddDocumentModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [fileUrl, setFileUrl] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔴 নতুন Editor Modal এর জন্য State 🔴
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [tempDescription, setTempDescription] = useState('');

  const editorRef = useRef(null);

  // Editor এর ডিজাইন কনফিগারেশন (উচ্চতা বাড়ানো হয়েছে)
  const editorConfig = useMemo(() => ({
    theme: 'dark',
    placeholder: 'Start typing your document details here...',
    height: 500, // এডিটরের উচ্চতা ফিক্স করা হয়েছে যাতে অনেক জায়গা পাওয়া যায়
    buttons: ['source', '|', 'bold', 'italic', 'underline', '|', 'ul', 'ol', '|', 'font', 'fontsize', 'brush', 'paragraph', '|', 'table', 'link', '|', 'align', 'undo', 'redo'],
  }), []);

  useEffect(() => {
    if (initialData && isOpen) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
      setCategory(initialData.category);
      setFileUrl(initialData.file_url || '');
      setIsPinned(initialData.is_pinned);
      setTags(initialData.tags || []);
    } else if (isOpen) {
      setTitle('');
      setDescription('');
      setCategory(CATEGORIES[0]);
      setFileUrl('');
      setIsPinned(false);
      setTags([]);
    }
  }, [initialData, isOpen]);

  const handleAddTag = (e: React.KeyboardEvent | React.FocusEvent) => {
    if ('key' in e && e.key !== 'Enter' && e.key !== ',') return;
    
    e.preventDefault();
    const newTag = tagInput.trim().replace(/,$/, '');
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        title,
        description,
        category,
        tags,
        file_url: fileUrl || undefined,
        is_pinned: isPinned,
      });
      onClose();
    } catch (error) {
      console.error('Error saving document:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Editor Modal Save করার লজিক
  const handleSaveEditor = () => {
    setDescription(tempDescription);
    setIsEditorOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {initialData ? <Save className="text-amber-500" size={24} /> : <Plus className="text-amber-500" size={24} />}
                {initialData ? 'Update Document' : 'Add New Document'}
              </h2>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Document Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                  placeholder="e.g. Annual Financial Report 2026"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-all"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">File URL (Optional)</label>
                  <input
                    type="url"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-all"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* 🔴 Updated Description Area (Button Instead of Editor) 🔴 */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Document Content</label>
                <button
                  type="button"
                  onClick={() => {
                    setTempDescription(description); // আগের লেখা থাকলে সেটা এডিটরে পাঠাবে
                    setIsEditorOpen(true);
                  }}
                  className={`w-full flex items-center justify-between border rounded-lg px-5 py-4 transition-all ${
                    description 
                      ? 'bg-amber-500/5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-amber-500/50 hover:text-amber-500'
                  }`}
                >
                  <span className="flex items-center gap-3 font-medium">
                    <FileText size={20} />
                    {description ? "Content generated. Click to modify." : "Click to open Full-Screen Editor..."}
                  </span>
                  <Maximize2 size={18} className="opacity-70" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-500/20">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-white"><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <div className="relative">
                  <TagIcon className="absolute left-3 top-3.5 text-slate-500" size={16} />
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    onBlur={handleAddTag}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-all"
                    placeholder="Add tags (press Enter or comma)"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="isPinned"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-amber-500 focus:ring-amber-500/50"
                />
                <label htmlFor="isPinned" className="text-sm font-medium text-slate-300 cursor-pointer">
                  Pin this document to top
                </label>
              </div>

              <div className="pt-4 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-slate-800 text-slate-100 rounded-lg font-medium hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-amber-500 text-slate-950 rounded-lg font-bold hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {initialData ? <Save size={20} /> : <Plus size={20} />}
                      {initialData ? 'Update Document' : 'Save Document'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      
      {/* 🔴 Secondary Pop-up: Full Screen Rich Text Editor 🔴 */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsEditorOpen(false)}
            className="absolute inset-0 bg-slate-950/95 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden h-full"
          >
            {/* Editor Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="text-amber-500" size={24} />
                  Document Content Editor
                </h2>
                <p className="text-slate-400 text-sm mt-1">Design your document perfectly before saving.</p>
              </div>
              <button 
                onClick={() => setIsEditorOpen(false)} 
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Editor Area */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-950">
              <div className="rounded-lg overflow-hidden border border-slate-800 h-full shadow-inner">
                <JoditEditor
                  ref={editorRef}
                  value={tempDescription}
                  config={editorConfig}
                  onBlur={newContent => setTempDescription(newContent)}
                />
              </div>
            </div>

            {/* Editor Footer Actions */}
            <div className="p-6 border-t border-slate-800 bg-slate-900 shrink-0 flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-6 py-3 bg-slate-800 text-slate-100 rounded-xl font-medium hover:bg-slate-700 transition-colors"
              >
                Discard Changes
              </button>
              <button
                type="button"
                onClick={handleSaveEditor}
                className="px-6 py-3 bg-emerald-500 text-slate-950 rounded-xl font-bold hover:bg-emerald-400 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Check size={20} />
                Save Content & Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}