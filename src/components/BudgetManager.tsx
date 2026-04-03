import React, { useState, useEffect } from 'react';
import { Target, Save, AlertCircle, CheckCircle2, Loader2, Calendar, ChevronDown, Banknote, TrendingUp } from 'lucide-react';
import { Category, Budget, UserSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface BudgetManagerProps {
  categories: Category[];
  token: string;
  onUpdate: () => void;
  userSettings: UserSettings;
}

export default function BudgetManager({ categories, token, onUpdate, userSettings }: BudgetManagerProps) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [budgets, setBudgets] = useState<Record<number, number>>({});
  const [settings, setSettings] = useState<UserSettings>(userSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | 'settings' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    setSettings(userSettings);
  }, [userSettings]);

  useEffect(() => {
    fetchBudgets();
  }, [month, year]);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/budgets?month=${month}&year=${year}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
        if (res.ok) {
          const budgetMap: Record<number, number> = {};
          data.forEach((b: Budget) => {
            budgetMap[b.category_id] = b.amount;
          });
          setBudgets(budgetMap);
        }
      } else {
        const text = await res.text();
        console.error('Unexpected response from fetchBudgets:', text.substring(0, 100));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async (categoryId: number) => {
    setSaving(categoryId);
    setMessage(null);
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category_id: categoryId,
          amount: budgets[categoryId] || 0,
          month,
          year
        })
      });

      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || 'Server returned an unexpected response');
      }

      if (res.ok) {
        setMessage({ type: 'success', text: 'Category budget updated!' });
        onUpdate();
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update budget.' });
    } finally {
      setSaving(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSaveSettings = async () => {
    setSaving('settings');
    setMessage(null);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || 'Server returned an unexpected response');
      }

      if (res.ok) {
        setMessage({ type: 'success', text: 'Financial settings updated!' });
        onUpdate();
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update settings.' });
    } finally {
      setSaving(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Global Settings Section */}
      <div className="bg-white rounded-[2rem] border border-slate-100 p-10 shadow-sm">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Banknote className="w-7 h-7 text-slate-900" />
            Financial Targets
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-2">Set your income and overall spending limits</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Monthly Salary</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
              <input
                type="number"
                value={settings.salary || ''}
                onChange={(e) => setSettings({ ...settings, salary: Number(e.target.value) })}
                className="w-full pl-8 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Daily Budget</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
              <input
                type="number"
                value={settings.daily_budget || ''}
                onChange={(e) => setSettings({ ...settings, daily_budget: Number(e.target.value) })}
                className="w-full pl-8 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Monthly Budget</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
              <input
                type="number"
                value={settings.monthly_budget || ''}
                onChange={(e) => setSettings({ ...settings, monthly_budget: Number(e.target.value) })}
                className="w-full pl-8 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Yearly Budget</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
              <input
                type="number"
                value={settings.yearly_budget || ''}
                onChange={(e) => setSettings({ ...settings, yearly_budget: Number(e.target.value) })}
                className="w-full pl-8 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving === 'settings'}
          className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xl shadow-slate-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {saving === 'settings' ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              <Save className="w-5 h-5" />
              Save Financial Targets
            </>
          )}
        </button>
      </div>

      {/* Category Budgets Section */}
      <div className="bg-white rounded-[2rem] border border-slate-100 p-10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <TrendingUp className="w-7 h-7 text-slate-900" />
              Category Breakdown
            </h2>
            <p className="text-slate-500 text-sm font-medium mt-2">Allocate funds across your spending categories</p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
            <div className="relative group">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                value={month} 
                onChange={(e) => setMonth(Number(e.target.value))}
                className="pl-9 pr-8 py-2 bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 appearance-none transition-all"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative group">
              <select 
                value={year} 
                onChange={(e) => setYear(Number(e.target.value))}
                className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 appearance-none transition-all"
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-8 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <motion.div 
              key={category.id} 
              whileHover={{ y: -2 }}
              className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 group transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: category.color }} />
                <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">{category.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                  <input
                    type="number"
                    value={budgets[category.id] || ''}
                    onChange={(e) => setBudgets({ ...budgets, [category.id]: Number(e.target.value) })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  />
                </div>
                <button
                  onClick={() => handleSaveBudget(category.id)}
                  disabled={saving === category.id}
                  className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg shadow-slate-200 active:scale-95"
                  title="Save Budget"
                >
                  {saving === category.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
