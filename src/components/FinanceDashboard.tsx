import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import AddTransactionModal from './AddTransactionModal';
import { Loader2 } from 'lucide-react';

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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-white">Finance Dashboard</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-amber-500 text-slate-900 px-5 py-2.5 rounded-xl font-bold hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition-all"
        >
          + New Transaction
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 border-l-4 border-l-blue-500">
          <p className="text-sm text-slate-400 font-medium">Bank Balance</p>
          <p className="text-3xl font-bold text-white mt-2">৳ {bankBalance.toLocaleString()}</p>
        </div>
        
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 border-l-4 border-l-emerald-500">
          <p className="text-sm text-slate-400 font-medium">Cash in Hand</p>
          <p className="text-3xl font-bold text-white mt-2">৳ {cashInHand.toLocaleString()}</p>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 border-l-4 border-l-rose-500">
          <p className="text-sm text-slate-400 font-medium">Total Expenses</p>
          <p className="text-3xl font-bold text-white mt-2">৳ {totalExpense.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-lg font-bold text-white">Recent Transactions</h2>
        </div>
        
        {loading ? (
           <div className="flex flex-col items-center justify-center py-16">
             <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
             <p className="text-slate-400 font-medium">Loading records...</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Description</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-200">{t.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${
                        t.type === 'deposit' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                        t.type === 'withdrawal' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-right whitespace-nowrap ${
                      t.type === 'expense' ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {t.type === 'expense' ? '-' : '+'} ৳{t.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">No transactions found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddTransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchTransactions}
      />
    </div>
  );
}