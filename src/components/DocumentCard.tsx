import React from 'react';
import { Pin, Trash2, ExternalLink, Calendar, Edit2, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { DocumentRecord } from '../types';

interface DocumentCardProps {
  doc: DocumentRecord;
  onDelete: (id: string) => void | Promise<void>;
  onTogglePin: (id: string, isPinned: boolean) => void | Promise<void>;
  onEdit: (doc: DocumentRecord) => void; 
  onView: (doc: DocumentRecord) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ doc, onDelete, onTogglePin, onEdit, onView }) => {
  const formattedDate = new Date(doc.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`group relative bg-slate-900 border ${
        doc.is_pinned ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-slate-800'
      } rounded-xl p-5 hover:border-slate-700 transition-all duration-300`}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">
              {doc.ref_number}
            </span>
            <h3 className="text-lg font-semibold text-slate-100 line-clamp-1 group-hover:text-amber-400 transition-colors">
              {doc.title}
            </h3>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* 🔴 এখন এই বাটনে ক্লিক করলে সুন্দর Viewer ওপেন হবে 🔴 */}
            <button 
              onClick={() => onView(doc)}
              className="p-2 text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Read Document"
            >
              <FileText size={16} />
            </button>
            <button 
              onClick={() => onEdit(doc)}
              className="p-2 text-amber-500 hover:bg-slate-800 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => onTogglePin(doc.id, !doc.is_pinned)}
              className={`p-2 rounded-lg transition-colors ${
                doc.is_pinned ? 'text-amber-500 bg-amber-500/10' : 'text-slate-400 hover:bg-slate-800'
              }`}
              title={doc.is_pinned ? "Unpin" : "Pin to top"}
            >
              <Pin size={16} />
            </button>
            <button
              onClick={() => onDelete(doc.id)}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-800 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <p className="text-sm text-slate-400 line-clamp-2 mb-4 flex-grow">
          {stripHtml(doc.description) || "No description provided."}
        </p>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <Calendar size={12} />
            {formattedDate}
          </div>
          {doc.file_url && (
            <a
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs font-semibold transition-colors"
            >
              File <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default DocumentCard;