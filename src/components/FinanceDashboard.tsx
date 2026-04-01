import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import AddTransactionModal from './AddTransactionModal';
import { Loader2, Plus, ArrowUpRight, ArrowDownLeft, Landmark, ChevronLeft, ChevronRight } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'expense';
  amount: number;
  description: string;
  created_at: string;
}

export default function FinanceDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔴 পেজিনেশনের জন্য নতুন স্টেট
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10; // প্রতি পেজে ১০টি আইটেম

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTransactions(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const totalDeposit = transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawal = transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const bankBalance = totalDeposit - totalWithdrawal;
  const cashInHand = totalWithdrawal - totalExpense;

  // 🔴 পেজিনেশনের হিসাব
  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-24 md:pb-6 relative min-h-full">
      
      <div className="flex justify-between items-center mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-white">Finance Dashboard</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="hidden md:flex items-center gap-2 bg-amber-500 text-slate-900 px-5 py-2.5 rounded-xl font-bold hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition-all"
        >
          <Plus size={20} /> New Transaction
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <div className="bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-800 border-l-4 border-l-blue-500">
          <p className="text-sm text-slate-400 font-medium">Bank Balance</p>
          <p className="text-2xl md:text-3xl font-bold text-white mt-1.5 md:mt-2">৳ {bankBalance.toLocaleString()}</p>
        </div>
        
        <div className="bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-800 border-l-4 border-l-emerald-500">
          <p className="text-sm text-slate-400 font-medium">Cash in Hand</p>
          <p className="text-2xl md:text-3xl font-bold text-white mt-1.5 md:mt-2">৳ {cashInHand.toLocaleString()}</p>
        </div>

        <div className="bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-800 border-l-4 border-l-rose-500">
          <p className="text-sm text-slate-400 font-medium">Total Expenses</p>
          <p className="text-2xl md:text-3xl font-bold text-white mt-1.5 md:mt-2">৳ {totalExpense.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-lg font-bold text-white">Recent Transactions</h2>
        </div>
        
        {loading ? (
           <div className="flex flex-col items-center justify-center py-16">
             <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
             <p className="text-slate-400 font-medium">Loading records...</p>
           </div>
        ) : (
          <>
            <div className="flex flex-col divide-y divide-slate-800/50 flex-1">
              {/* 🔴 এখানে paginatedTransactions ব্যবহার করা হয়েছে */}
              {paginatedTransactions.map((t) => (
                <div key={t.id} className="p-4 md:px-6 hover:bg-slate-800/30 transition-colors flex items-center justify-between gap-4">
                  
                  <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      t.type === 'deposit' ? 'bg-blue-500/10 text-blue-400' : 
                      t.type === 'withdrawal' ? 'bg-emerald-500/10 text-emerald-400' : 
                      'bg-rose-500/10 text-rose-400'
                    }`}>
                      {t.type === 'deposit' ? <Landmark size={20} /> : 
                       t.type === 'withdrawal' ? <ArrowDownLeft size={20} /> : 
                       <ArrowUpRight size={20} />}
                    </div>
                    
                    <div className="min-w-0">
                      <p className="text-sm md:text-base font-semibold text-slate-200 truncate">
                        {t.description}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        {new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        <span className="mx-1.5">•</span>
                        <span className="uppercase tracking-wider">{t.type}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-base md:text-lg font-bold ${
                      t.type === 'expense' ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {t.type === 'expense' ? '-' : '+'}৳{t.amount.toLocaleString()}
                    </p>
                  </div>

                </div>
              ))}
              {transactions.length === 0 && (
                <div className="px-6 py-12 text-center text-slate-500">
                  No transactions found
                </div>
              )}
            </div>

            {/* 🔴 পেজিনেশন কন্ট্রোলস 🔴 */}
            {totalPages > 0 && (
              <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, transactions.length)} of {transactions.length} entries
                </p>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                    disabled={currentPage === 1} 
                    className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 disabled:opacity-30 hover:bg-slate-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="px-4 py-2 bg-amber-400/10 border border-amber-400/20 rounded-xl">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
                  </div>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                    disabled={currentPage === totalPages} 
                    className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 disabled:opacity-30 hover:bg-slate-700 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <button 
        onClick={() => setIsModalOpen(true)}
        className="md:hidden fixed bottom-6 right-6 bg-amber-500 text-slate-900 p-4 rounded-full shadow-lg shadow-amber-500/30 z-20 hover:bg-amber-400 hover:scale-105 transition-all active:scale-95"
      >
        <Plus size={24} />
      </button>

      <AddTransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchTransactions}
      />
    </div>
  );
}