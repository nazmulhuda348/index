import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import AddTransactionModal from './AddTransactionModal';

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

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTransactions(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // 🔴 হিসাবের লজিক 🔴
  const totalDeposit = transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawal = transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const bankBalance = totalDeposit - totalWithdrawal;
  const cashInHand = totalWithdrawal - totalExpense;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">ফাইন্যান্স ড্যাশবোর্ড</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium shadow-sm"
        >
          + নতুন হিসাব
        </button>
      </div>

      {/* 🔴 সামারি কার্ডস 🔴 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
          <p className="text-sm text-gray-500 font-medium">ব্যাঙ্ক ব্যালেন্স</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">৳ {bankBalance.toLocaleString()}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
          <p className="text-sm text-gray-500 font-medium">হাতে থাকা ক্যাশ</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">৳ {cashInHand.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
          <p className="text-sm text-gray-500 font-medium">মোট খরচ</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">৳ {totalExpense.toLocaleString()}</p>
        </div>
      </div>

      {/* 🔴 লেনদেনের তালিকা 🔴 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">সাম্প্রতিক লেনদেন</h2>
        </div>
        
        {loading ? (
          <div className="p-6 text-center text-gray-500">লোড হচ্ছে...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 text-sm">
                <tr>
                  <th className="px-6 py-3">তারিখ</th>
                  <th className="px-6 py-3">বিবরণ</th>
                  <th className="px-6 py-3">ধরন</th>
                  <th className="px-6 py-3 text-right">পরিমাণ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(t.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{t.description}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        t.type === 'deposit' ? 'bg-blue-100 text-blue-700' : 
                        t.type === 'withdrawal' ? 'bg-green-100 text-green-700' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {t.type === 'deposit' ? 'Deposit' : t.type === 'withdrawal' ? 'Withdrawal' : 'Expense'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${
                      t.type === 'expense' ? 'text-red-600' : 'text-gray-800'
                    }`}>
                      {t.type === 'expense' ? '-' : '+'} ৳{t.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">কোনো লেনদেন পাওয়া যায়নি</td>
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
        onSuccess={fetchTransactions} // সেভ হওয়ার পর অটোমেটিক লিস্ট রিফ্রেশ হবে
      />
    </div>
  );
}