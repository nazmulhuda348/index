import React, { useEffect, useState, useCallback, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Loader2, Plus, Trash2, Edit2, RefreshCw, 
  Landmark, Wallet, DollarSign, History, Layers, Calendar 
} from 'lucide-react';

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  balance: number;
}

interface FinancialTransaction {
  id: string;
  account_id: string;
  type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out';
  amount: number;
  purpose: string;
  transfer_to_account_id?: string;
  created_at: string;
  bank_accounts?: { bank_name: string; account_name: string; account_number: string };
}

interface MonthlyExpense {
  id: string;
  amount: number;
  purpose: string;
  expense_date: string;
  created_at: string;
}

export default function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState<'banks' | 'transactions' | 'expenses'>('banks');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [expenses, setExpenses] = useState<MonthlyExpense[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals States
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Forms States
  const [accountForm, setAccountForm] = useState({ bank_name: '', account_name: '', account_number: '', balance: '' });
  const [txForm, setTxForm] = useState({ account_id: '', type: 'deposit', amount: '', purpose: '', transfer_to_account_id: '' });
  const [expenseForm, setExpenseForm] = useState({ amount: '', purpose: '', expense_date: new Date().toISOString().split('T')[0] });

  // Fetch All Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Fetch Accounts
      let { data: acData } = await supabase.from('bank_accounts').select('*').order('bank_name');
      
      // 'Cash in Hand' ডিফল্ট অ্যাকাউন্ট চেক ও অটো-জেনারেট
      const hasCash = acData?.some((a: any) => (a.account_name || '').toLowerCase() === 'cash in hand');
      if (acData && !hasCash) {
        await supabase.from('bank_accounts').insert([{ 
          bank_name: 'Cash', 
          account_name: 'Cash in Hand', 
          account_number: 'N/A', 
          balance: 0, 
          user_id: session.user.id 
        }]);
        const { data: updatedAc } = await supabase.from('bank_accounts').select('*').order('bank_name');
        acData = updatedAc;
      }
      setAccounts(acData || []);

      // 2. Fetch Transactions
      const { data: txData } = await supabase
        .from('financial_transactions')
        .select('*, bank_accounts(bank_name, account_name, account_number)')
        .order('created_at', { ascending: false });
      setTransactions(txData || []);

      // 3. Fetch Expenses
      const { data: expData } = await supabase
        .from('monthly_expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      setExpenses(expData || []);

    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Modal for Editing Account
  const openEditAccountModal = (acc: BankAccount) => {
    setEditingAccount(acc);
    setAccountForm({
      bank_name: acc.bank_name,
      account_name: acc.account_name,
      account_number: acc.account_number === 'N/A' ? '' : acc.account_number,
      balance: acc.balance.toString()
    });
    setIsAccountModalOpen(true);
  };

  // Handle Add or Update Bank Account
  const handleSaveAccount = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (editingAccount) {
        // 🔄 এডিট/আপডেট লজিক
        const { error } = await supabase
          .from('bank_accounts')
          .update({
            bank_name: accountForm.bank_name,
            account_name: accountForm.account_name,
            account_number: accountForm.account_number || 'N/A',
            balance: parseFloat(accountForm.balance) || 0,
          })
          .eq('id', editingAccount.id);
        
        if (error) throw error;
      } else {
        // ➕ নতুন অ্যাকাউন্ট তৈরির লজিক
        const { error } = await supabase.from('bank_accounts').insert([{
          bank_name: accountForm.bank_name,
          account_name: accountForm.account_name,
          account_number: accountForm.account_number || 'N/A',
          balance: parseFloat(accountForm.balance) || 0,
          user_id: session?.user?.id
        }]);
        
        if (error) throw error;
      }

      setIsAccountModalOpen(false);
      setEditingAccount(null);
      setAccountForm({ bank_name: '', account_name: '', account_number: '', balance: '' });
      fetchData();
    } catch (err) { alert('Failed to save bank account'); }
  };

  // Handle Delete Bank Account
  const handleDeleteAccount = async (id: string, accountName: string) => {
    if (accountName.toLowerCase() === 'cash in hand') {
      alert('Security Protection: "Cash in Hand" account cannot be deleted!');
      return;
    }
    if (!confirm(`CRITICAL WARNING: Are you sure you want to delete "${accountName}"? Deleting this account will permanently erase all its associated transaction logs. Proceed?`)) return;
    
    try {
      const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) { alert('Failed to delete bank account'); }
  };

  // Handle Add Transaction
  const handleAddTransaction = async (e: FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(txForm.amount);
    if (!txForm.account_id || isNaN(amt)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const sourceAccount = accounts.find((a: BankAccount) => a.id === txForm.account_id);
      if (!sourceAccount) return;

      if (txForm.type === 'deposit') {
        await supabase.from('bank_accounts').update({ balance: sourceAccount.balance + amt }).eq('id', sourceAccount.id);
        await supabase.from('financial_transactions').insert([{ account_id: sourceAccount.id, type: 'deposit', amount: amt, purpose: txForm.purpose, user_id: session?.user?.id }]);
      } 
      else if (txForm.type === 'withdrawal') {
        if (sourceAccount.balance < amt) { alert('Insufficient balance!'); return; }
        await supabase.from('bank_accounts').update({ balance: sourceAccount.balance - amt }).eq('id', sourceAccount.id);
        await supabase.from('financial_transactions').insert([{ account_id: sourceAccount.id, type: 'withdrawal', amount: amt, purpose: txForm.purpose, user_id: session?.user?.id }]);
        
        if (txForm.purpose.trim().toLowerCase() === 'monthly expense') {
          await supabase.from('monthly_expenses').insert([{ amount: amt, purpose: `Withdrawn from ${sourceAccount.bank_name} (${sourceAccount.account_name})`, expense_date: new Date().toISOString().split('T')[0], user_id: session?.user?.id }]);
        }
      } 
      else if (txForm.type === 'transfer') {
        if (!txForm.transfer_to_account_id) return;
        const targetAccount = accounts.find((a: BankAccount) => a.id === txForm.transfer_to_account_id);
        if (!targetAccount) return;
        if (sourceAccount.balance < amt) { alert('Insufficient balance!'); return; }

        await supabase.from('bank_accounts').update({ balance: sourceAccount.balance - amt }).eq('id', sourceAccount.id);
        await supabase.from('bank_accounts').update({ balance: targetAccount.balance + amt }).eq('id', targetAccount.id);
        
        await supabase.from('financial_transactions').insert([
          { account_id: sourceAccount.id, type: 'transfer_out', amount: amt, purpose: `Transferred to ${targetAccount.bank_name} (${targetAccount.account_name}): ${txForm.purpose}`, transfer_to_account_id: targetAccount.id, user_id: session?.user?.id },
          { account_id: targetAccount.id, type: 'transfer_in', amount: amt, purpose: `Received from ${sourceAccount.bank_name} (${sourceAccount.account_name}): ${txForm.purpose}`, user_id: session?.user?.id }
        ]);
      }

      setIsTxModalOpen(false);
      setTxForm({ account_id: '', type: 'deposit', amount: '', purpose: '', transfer_to_account_id: '' });
      fetchData();
    } catch (err) { alert('Transaction Failed!'); }
  };

  // Handle Add Direct Expense
  const handleAddExpense = async (e: FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expenseForm.amount);
    if (isNaN(amt)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const cashAc = accounts.find((a: BankAccount) => a.account_name.toLowerCase() === 'cash in hand');
      if (!cashAc) return;
      if (cashAc.balance < amt) { alert('Insufficient money in Cash in Hand!'); return; }

      await supabase.from('bank_accounts').update({ balance: cashAc.balance - amt }).eq('id', cashAc.id);
      await supabase.from('financial_transactions').insert([{ account_id: cashAc.id, type: 'withdrawal', amount: amt, purpose: `Expense: ${expenseForm.purpose}`, user_id: session?.user?.id }]);
      await supabase.from('monthly_expenses').insert([{ amount: amt, purpose: expenseForm.purpose, expense_date: expenseForm.expense_date, user_id: session?.user?.id }]);

      setIsExpenseModalOpen(false);
      setExpenseForm({ amount: '', purpose: '', expense_date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (err) { alert('Failed to save expense'); }
  };

  // Handle Delete Transaction (Rollback)
  const handleDeleteTransaction = async (tx: FinancialTransaction) => {
    if (!confirm('Are you sure you want to delete this transaction? Balance will be rolled back.')) return;
    try {
      const targetAc = accounts.find((a: BankAccount) => a.id === tx.account_id);
      if (!targetAc) return;

      if (tx.type === 'deposit') {
        await supabase.from('bank_accounts').update({ balance: targetAc.balance - tx.amount }).eq('id', targetAc.id);
      } else if (tx.type === 'withdrawal') {
        await supabase.from('bank_accounts').update({ balance: targetAc.balance + tx.amount }).eq('id', targetAc.id);
      } else if (tx.type === 'transfer_out') {
        await supabase.from('bank_accounts').update({ balance: targetAc.balance + tx.amount }).eq('id', targetAc.id);
        if (tx.transfer_to_account_id) {
          const destAc = accounts.find((a: BankAccount) => a.id === tx.transfer_to_account_id);
          if (destAc) await supabase.from('bank_accounts').update({ balance: destAc.balance - tx.amount }).eq('id', destAc.id);
        }
      }

      await supabase.from('financial_transactions').delete().eq('id', tx.id);
      fetchData();
    } catch (err) { alert('Rollback failed'); }
  };

  // Handle Delete Expense
  const handleDeleteExpense = async (exp: MonthlyExpense) => {
    if (!confirm('Deleting this expense will refund the amount to Cash in Hand. Proceed?')) return;
    try {
      const cashAc = accounts.find((a: BankAccount) => a.account_name.toLowerCase() === 'cash in hand');
      if (cashAc) {
        await supabase.from('bank_accounts').update({ balance: cashAc.balance + exp.amount }).eq('id', cashAc.id);
      }
      await supabase.from('monthly_expenses').delete().eq('id', exp.id);
      fetchData();
    } catch (err) { alert('Failed to delete expense'); }
  };

  // Handle Reset Expenses
  const handleResetExpenses = async () => {
    if (!confirm('CRITICAL ACTION: This will completely wipe out the monthly expense ledger to 0. No money will be refunded anywhere. Confirm?')) return;
    try {
      const { error } = await supabase.from('monthly_expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      fetchData();
      alert('Monthly expenses ledger has been reset to 0! 📑');
    } catch (err) { alert('Reset failed'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  const totalBankBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalMonthlyExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-200">
      
      {/* Financial Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Fund Available</p>
            <h3 className="text-3xl font-black text-emerald-400 mt-1">৳{totalBankBalance.toLocaleString('en-IN')}</h3>
          </div>
          <div className="p-4 bg-emerald-500/10 rounded-xl text-emerald-400"><Wallet size={28} /></div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Month Expense Ledger</p>
            <h3 className="text-3xl font-black text-rose-400 mt-1">৳{totalMonthlyExpense.toLocaleString('en-IN')}</h3>
          </div>
          <div className="p-4 bg-rose-500/10 rounded-xl text-rose-400"><DollarSign size={28} /></div>
        </div>
      </div>

      {/* Modern Tabs Menu */}
      <div className="flex border-b border-slate-800 gap-2">
        <button onClick={() => setActiveTab('banks')} className={`px-5 py-3 font-bold text-sm rounded-t-xl flex items-center gap-2 transition ${activeTab === 'banks' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-900'}`}><Landmark size={16} /> Bank Accounts</button>
        <button onClick={() => setActiveTab('transactions')} className={`px-5 py-3 font-bold text-sm rounded-t-xl flex items-center gap-2 transition ${activeTab === 'transactions' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-900'}`}><History size={16} /> Bank Ledger</button>
        <button onClick={() => setActiveTab('expenses')} className={`px-5 py-3 font-bold text-sm rounded-t-xl flex items-center gap-2 transition ${activeTab === 'expenses' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-900'}`}><Layers size={16} /> Monthly Expenses</button>
      </div>

      {/* TAB 1: BANK ACCOUNTS */}
      {activeTab === 'banks' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-black text-white">Linked Accounts & Wallets</h4>
            <button onClick={() => { setEditingAccount(null); setAccountForm({ bank_name: '', account_name: '', account_number: '', balance: '' }); setIsAccountModalOpen(true); }} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"><Plus size={14} /> Add Bank / Wallet</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accounts.map(acc => (
              <div key={acc.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition relative group">
                
                {/* Action Buttons (Top Right Corner) */}
                <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditAccountModal(acc)} className="p-1.5 bg-slate-800 text-slate-400 hover:text-amber-400 rounded-lg transition" title="Edit Account"><Edit2 size={12} /></button>
                  {acc.account_name.toLowerCase() !== 'cash in hand' && (
                    <button onClick={() => handleDeleteAccount(acc.id, acc.account_name)} className="p-1.5 bg-slate-800 text-slate-400 hover:text-rose-500 rounded-lg transition" title="Delete Account"><Trash2 size={12} /></button>
                  )}
                </div>

                <div className="text-xs font-bold text-slate-500 tracking-wider uppercase">{acc.bank_name}</div>
                <div className="text-lg font-black text-white mt-0.5">{acc.account_name}</div>
                <div className="text-xs text-amber-500/80 font-mono mt-1">{acc.account_number}</div>
                <div className="text-2xl font-black text-emerald-400 mt-4">৳{acc.balance.toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: BANK TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-black text-white">Bank Fund Activities</h4>
            <button onClick={() => setIsTxModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"><RefreshCw size={14} /> Deposit / Withdraw / Transfer</button>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs text-slate-500 uppercase font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Source Account</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Purpose / Destination Details</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 text-xs text-slate-500">{new Date(tx.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="font-bold text-white">{tx.bank_accounts?.bank_name || 'N/A'}</div>
                      <div className="text-[11px] text-slate-400">{tx.bank_accounts?.account_name || 'Deleted Account'} ({tx.bank_accounts?.account_number || ''})</div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${tx.type === 'deposit' || tx.type === 'transfer_in' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{tx.type}</span>
                    </td>
                    <td className="p-4 text-xs max-w-xs truncate" title={tx.purpose}>{tx.purpose}</td>
                    <td className={`p-4 text-right font-black ${tx.type === 'deposit' || tx.type === 'transfer_in' ? 'text-emerald-400' : 'text-rose-400'}`}>৳{tx.amount.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => handleDeleteTransaction(tx)} className="text-slate-500 hover:text-rose-500 p-1 rounded transition" title="Delete & Rollback"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MONTHLY EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-black text-white">Monthly Expense Ledger</h4>
            <div className="flex gap-2">
              <button onClick={handleResetExpenses} className="bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"><RefreshCw size={14} /> Reset Ledger (0)</button>
              <button onClick={() => setIsExpenseModalOpen(true)} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"><Plus size={14} /> Add Direct Expense</button>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs text-slate-500 uppercase font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">Expense Date</th>
                  <th className="p-4">Expense Description / Purpose</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 text-xs font-bold text-slate-400 flex items-center gap-1"><Calendar size={12}/> {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : new Date(exp.created_at).toLocaleDateString()}</td>
                    <td className="p-4 font-bold text-white">{exp.purpose}</td>
                    <td className="p-4 text-right font-black text-rose-400">৳{exp.amount.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => handleDeleteExpense(exp)} className="text-slate-500 hover:text-rose-500 p-1 rounded transition" title="Delete & Refund"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT ACCOUNT MODAL --- */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveAccount} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white">{editingAccount ? 'Edit Bank Account' : 'Link Bank / Digital Wallet'}</h3>
            <div>
              <label className="text-xs font-bold text-slate-400">Bank Name</label>
              <input type="text" required placeholder="e.g., DBBL, bKash, City Bank" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl mt-1 outline-none text-white focus:border-amber-500" value={accountForm.bank_name} onChange={e => setAccountForm({...accountForm, bank_name: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400">Account Name</label>
              <input type="text" required placeholder="e.g., Business Account, Personal Wallet" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl mt-1 outline-none text-white focus:border-amber-500" value={accountForm.account_name} onChange={e => setAccountForm({...accountForm, account_name: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400">Account Number (Optional)</label>
              <input type="text" placeholder="e.g., 142.120.XXXX" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl mt-1 outline-none text-white focus:border-amber-500" value={accountForm.account_number} onChange={e => setAccountForm({...accountForm, account_number: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400">Balance (৳)</label>
              <input type="number" placeholder="0.00" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl mt-1 outline-none text-white focus:border-amber-500" value={accountForm.balance} onChange={e => setAccountForm({...accountForm, balance: e.target.value})} />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => { setIsAccountModalOpen(false); setEditingAccount(null); }} className="flex-1 bg-slate-800 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-700 transition">Cancel</button>
              <button type="submit" className="flex-1 bg-amber-500 text-slate-950 py-2.5 rounded-xl font-bold text-xs hover:bg-amber-400 transition">Save Account</button>
            </div>
          </form>
        </div>
      )}

      {/* --- BANK ACTIVITY MODAL --- */}
      {isTxModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddTransaction} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white">Bank Fund Movement</h3>
            
            <div>
              <label className="text-xs font-bold text-slate-400">Source Account</label>
              <select required className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl mt-1 text-white outline-none focus:border-amber-500" value={txForm.account_id} onChange={e => setTxForm({...txForm, account_id: e.target.value})}>
                <option value="">Choose Wallet/Bank</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} - {a.account_name} (৳{a.balance})</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400">Activity Type</label>
              <select className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl mt-1 text-white outline-none focus:border-amber-500" value={txForm.type} onChange={e => setTxForm({...txForm, type: e.target.value as any, transfer_to_account_id: ''})}>
                <option value="deposit">Deposit (টাকা জমা করা)</option>
                <option value="withdrawal">Withdrawal (টাকা উত্তোলন করা)</option>
                <option value="transfer">Transfer (অন্য অ্যাকাউন্টে পাঠানো)</option>
              </select>
            </div>

            {txForm.type === 'transfer' && (
              <div>
                <label className="text-xs font-bold text-slate-400">Destination Account (কোথায় পাঠাবেন)</label>
                <select required className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl mt-1 text-white outline-none focus:border-amber-500" value={txForm.transfer_to_account_id} onChange={e => setTxForm({...txForm, transfer_to_account_id: e.target.value})}>
                  <option value="">Transfer To...</option>
                  {accounts.filter((a: BankAccount) => a.id !== txForm.account_id).map((a: BankAccount) => <option key={a.id} value={a.id}>{a.bank_name} - {a.account_name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-400">Amount (৳)</label>
              <input type="number" required placeholder="0.00" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl mt-1 outline-none text-white focus:border-amber-500" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400">Purpose / Remarks</label>
              <input type="text" required placeholder="e.g., Office Rent, Monthly Expense, Emergency" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl mt-1 outline-none text-white focus:border-amber-500" value={txForm.purpose} onChange={e => setTxForm({...txForm, purpose: e.target.value})} />
              {txForm.type === 'withdrawal' && <p className="text-[10px] text-amber-500 mt-1">💡 টিপস: পারপাস হুবহু "Monthly Expense" লিখলে তা অটোমেটিক মাসিক খরচের ড্যাশবোর্ডে চলে যাবে।</p>}
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setIsTxModalOpen(false)} className="flex-1 bg-slate-800 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-700 transition">Cancel</button>
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-blue-500 transition">Confirm</button>
            </div>
          </form>
        </div>
      )}

      {/* --- ADD DIRECT EXPENSE MODAL --- */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddExpense} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white">Log Expense (From Cash in Hand)</h3>
            <div>
              <label className="text-xs font-bold text-slate-400">Expense Date (খরচের তারিখ)</label>
              <input type="date" required className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl mt-1 outline-none text-white focus:border-amber-500" value={expenseForm.expense_date} onChange={e => setExpenseForm({...expenseForm, expense_date: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400">Expense Amount (৳)</label>
              <input type="number" required placeholder="0.00" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl mt-1 outline-none text-white focus:border-amber-500" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400">Purpose / Description</label>
              <input type="text" required placeholder="What was this expense for?" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl mt-1 outline-none text-white focus:border-amber-500" value={expenseForm.purpose} onChange={e => setExpenseForm({...expenseForm, purpose: e.target.value})} />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 bg-slate-800 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-700 transition">Cancel</button>
              <button type="submit" className="flex-1 bg-amber-500 text-slate-950 py-2.5 rounded-xl font-bold text-xs hover:bg-amber-400 transition">Save Expense</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}