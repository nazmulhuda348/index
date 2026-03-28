import { useState, FormEvent } from 'react';

// 🔴 এখানে supabaseClient এর বদলে শুধু supabase দেওয়া হয়েছে 🔴
import { supabase } from '../lib/supabase';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddTransactionModal({ isOpen, onClose, onSuccess }: AddTransactionModalProps) {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // e: FormEvent ব্যবহার করা হয়েছে যাতে React.FormEvent এর এরর না আসে
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // ... আপনার বাকি কোড হুবহু আগের মতোই থাকবে ...

    try {
      const { error } = await supabase
        .from('transactions')
        .insert([
          { 
            type, 
            amount: parseFloat(amount), 
            description 
          }
        ]);

      if (error) throw error;
      
      // সফল হলে ফর্ম ক্লিয়ার করে মডাল বন্ধ করা
      setType('expense');
      setAmount('');
      setDescription('');
      onSuccess(); 
      onClose();
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('ডেটা সেভ করতে সমস্যা হয়েছে!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800">নতুন লেনদেন যোগ করুন</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">লেনদেনের ধরন</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="deposit">ব্যাঙ্কে জমা (Deposit)</option>
              <option value="withdrawal">ক্যাশ উত্তোলন (Withdrawal)</option>
              <option value="expense">খরচ (Expense)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">পরিমাণ (৳)</label>
            <input 
              type="number" 
              required 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">বিবরণ</label>
            <textarea 
              required 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
              placeholder="কী বাবদ লেনদেন হলো?"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              বাতিল
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}