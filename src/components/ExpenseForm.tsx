import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Tag, FileText, Loader2, Save, ChevronDown } from 'lucide-react';
import { Category, Expense } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ExpenseFormProps {
  categories: Category[];
  onAdd: (expense: Expense) => void;
  onUpdate: (expense: Expense) => void;
  editingExpense?: Expense;
  onCancelEdit: () => void;
  token: string;
}

export default function ExpenseForm({ categories, onAdd, onUpdate, editingExpense, onCancelEdit, token }: ExpenseFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    amount: '',
    category_id: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        amount: editingExpense.amount.toString(),
        category_id: editingExpense.category_id.toString(),
        description: editingExpense.description || '',
        date: new Date(editingExpense.date).toISOString().split('T')[0],
      });
    } else {
      setFormData({
        amount: '',
        category_id: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
    }
  }, [editingExpense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const method = editingExpense ? 'PUT' : 'POST';
    const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses';

    try {
      setError('');
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          amount: Number(formData.amount),
          category_id: Number(formData.category_id),
        }),
      });

      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || 'Server returned an unexpected response');
      }

      if (!res.ok) throw new Error(data.error || 'Failed to save transaction');

      if (editingExpense) {
        onUpdate({ 
          ...editingExpense, 
          ...formData, 
          amount: Number(formData.amount),
          category_id: Number(formData.category_id),
          category_name: categories.find(c => c.id === Number(formData.category_id))?.name || '', 
          category_color: categories.find(c => c.id === Number(formData.category_id))?.color || '' 
        } as Expense);
      } else {
        onAdd(data);
      }
      
      if (!editingExpense) {
        setFormData({
          amount: '',
          category_id: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 p-10 shadow-sm">
      <div className="flex items-center justify-between mb-10">
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          {editingExpense ? 'Edit Transaction' : 'New Transaction'}
        </h3>
        {editingExpense && (
          <button 
            onClick={onCancelEdit}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {error && (
          <div className="md:col-span-2 p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
            {error}
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Amount</label>
          <div className="relative group">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Category</label>
          <div className="relative group">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <select
              required
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold appearance-none cursor-pointer"
            >
              <option value="">Select Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none transition-colors group-focus-within:text-blue-500" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Date</label>
          <div className="relative group">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Description</label>
          <div className="relative group">
            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold"
              placeholder="What was this for?"
            />
          </div>
        </div>

        <div className="md:col-span-2 flex justify-end gap-4 mt-4">
          {editingExpense && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-8 py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-2xl transition-all active:scale-95"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl shadow-slate-200 transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                <Save className="w-5 h-5" />
                {editingExpense ? 'Update Transaction' : 'Save Transaction'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
