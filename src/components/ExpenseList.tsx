import React from 'react';
import { Expense } from '../types';
import { Trash2, Edit2, Calendar, Tag, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';

interface ExpenseListProps {
  expenses: Expense[];
  token: string;
  onDelete: (id: number) => void;
  onEdit: (expense: Expense) => void;
}

export default function ExpenseList({ expenses, token, onDelete, onEdit }: ExpenseListProps) {
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) onDelete(id);
    } catch (err) {
      console.error('Failed to delete expense', err);
    }
  };

  if (expenses.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <DollarSign className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">No transactions found</h3>
        <p className="text-slate-500 mt-2 font-medium">Start adding your expenses to see them here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {expenses.map((expense, idx) => (
        <motion.div
          key={expense.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="group bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6"
        >
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform">
              <span className="text-white font-bold text-lg">{expense.category_name[0]}</span>
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900 tracking-tight">{expense.description}</h4>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <Tag className="w-3.5 h-3.5" />
                  {expense.category_name}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-8">
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900 tracking-tight">
                ${expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Transaction Amount</p>
            </div>
            
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(expense)}
                className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                title="Edit"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleDelete(expense.id)}
                className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                title="Delete"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
