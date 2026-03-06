import React, { useRef, useState } from 'react';
import { X, Download, Calendar, Tag as TagIcon, ExternalLink, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2pdf from 'html2pdf.js';
import { DocumentRecord } from '../types';

interface ViewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: DocumentRecord | null;
}

export default function ViewDocumentModal({ isOpen, onClose, doc }: ViewDocumentModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!doc) return null;

  const formattedDate = new Date(doc.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

 const handleDownloadPDF = async () => {
    const element = printRef.current;
    if (!element) return;
    setIsGenerating(true);
    
    // 🔴 TypeScript Error ফিক্স করার জন্য as '...' যুক্ত করা হয়েছে 🔴
    const opt = {
      margin: 15,
      filename: `${doc.ref_number}_Document.pdf`,
      image: { type: 'jpeg' as 'jpeg', quality: 1 }, 
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm' as 'mm', format: 'a4' as 'a4', orientation: 'portrait' as 'portrait' }
    };
    
    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("Error generating PDF", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* 🔴 Header: Top Bar 🔴 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 z-10">
              <div className="flex items-center gap-3">
                <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-lg text-xs font-bold tracking-widest uppercase border border-amber-500/20">
                  {doc.ref_number}
                </span>
                <span className="text-slate-400 text-sm font-medium">{doc.category}</span>
              </div>
              <div className="flex items-center gap-3">
                {/* PDF Download Button */}
                <button
                  onClick={handleDownloadPDF}
                  disabled={isGenerating}
                  className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 px-4 py-2 rounded-xl font-bold transition-all border border-emerald-500/20 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  <span className="hidden sm:inline">{isGenerating ? 'Generating...' : 'Download PDF'}</span>
                </button>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* 🔴 Document Scrollable Area (A4 View) 🔴 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 bg-slate-950 flex justify-center">
              
              {/* 📄 The Beautiful Paper View 📄 */}
              <div 
                ref={printRef}
                className="bg-white text-slate-900 w-full max-w-[800px] min-h-[1122px] p-10 sm:p-16 rounded-xl shadow-xl flex flex-col"
              >
                {/* Doc Header */}
                <div className="border-b-2 border-slate-200 pb-6 mb-8 shrink-0">
                  <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4 font-serif leading-tight">
                    {doc.title}
                  </h1>
                  <div className="flex flex-wrap items-center justify-between text-sm text-slate-500 font-medium gap-4">
                    <div className="flex items-center gap-4">
                      <span className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700">Ref: <strong>{doc.ref_number}</strong></span>
                      <span className="flex items-center gap-1"><Calendar size={14}/> {formattedDate}</span>
                    </div>
                  </div>
                </div>

                {/* 🔴 Doc Body (Beautiful Typography rendering your HTML) 🔴 */}
                <div 
                  className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-blue-600 prose-table:border-collapse prose-td:border prose-td:border-slate-300 prose-th:border prose-th:border-slate-300 prose-th:bg-slate-100 font-serif text-slate-800 leading-relaxed flex-grow" 
                  dangerouslySetInnerHTML={{ __html: doc.description || '<p class="italic text-slate-400">No content provided.</p>' }}
                />

                {/* Doc Footer */}
                <div className="mt-20 pt-8 border-t border-slate-200 shrink-0">
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <TagIcon size={16} className="text-slate-400" />
                      <div className="flex gap-2 flex-wrap">
                        {doc.tags.map(tag => (
                          <span key={tag} className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">#{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <p>Generated securely via Digital Index System</p>
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
                        Attached File <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}