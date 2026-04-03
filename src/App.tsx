import React, { useState, useEffect, useMemo } from 'react';
import { LogOut, Plus, LayoutDashboard, List, Wallet, Filter, Search, ChevronDown, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Auth from './components/Auth';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import Dashboard from './components/Dashboard';
import BudgetManager from './components/BudgetManager';
import { User, Expense, Category, AuthState, Budget, UserSettings } from './types';
import { cn } from './lib/utils';

export default function App() {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : { token: null, user: null };
  });

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    salary: 0,
    daily_budget: 0,
    monthly_budget: 0,
    yearly_budget: 0
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'budgets'>('dashboard');
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'month' | 'year'>('all');

  useEffect(() => {
    if (auth.token) {
      localStorage.setItem('auth', JSON.stringify(auth));
      fetchData();
    } else {
      localStorage.removeItem('auth');
    }
  }, [auth.token]);

  const fetchData = async () => {
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const headers = { 'Authorization': `Bearer ${auth.token}` };

      const results = await Promise.allSettled([
        fetch('/api/expenses', { headers }),
        fetch('/api/categories'),
        fetch(`/api/budgets?month=${month}&year=${year}`, { headers }),
        fetch('/api/user/settings', { headers })
      ]);

      const processResponse = async (result: any, name: string) => {
        if (result.status === 'fulfilled') {
          const res = result.value;
          if (res.status === 401 || res.status === 403) {
            handleLogout();
            return null;
          }
          if (res.ok) {
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              return await res.json();
            } else {
              const text = await res.text();
              console.error(`Unexpected response from ${name}:`, text.substring(0, 100));
              return null;
            }
          } else {
            console.error(`Error fetching ${name}:`, res.status, res.statusText);
            return null;
          }
        } else {
          console.error(`Failed to fetch ${name}:`, result.reason);
          return null;
        }
      };

      const expensesData = await processResponse(results[0], 'expenses');
      const categoriesData = await processResponse(results[1], 'categories');
      const budgetsData = await processResponse(results[2], 'budgets');
      const settingsData = await processResponse(results[3], 'settings');

      if (expensesData) setExpenses(expensesData);
      if (categoriesData) setCategories(categoriesData);
      if (budgetsData) setBudgets(budgetsData);
      if (settingsData) setUserSettings(settingsData);
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  const handleLogout = () => {
    setAuth({ token: null, user: null });
    setExpenses([]);
    setBudgets([]);
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchesSearch = exp.description?.toLowerCase().includes(search.toLowerCase()) || 
                           exp.category_name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || exp.category_id === Number(categoryFilter);
      
      const expDate = new Date(exp.date);
      const now = new Date();
      let matchesTime = true;
      
      if (timeFilter === 'today') {
        matchesTime = expDate.toDateString() === now.toDateString();
      } else if (timeFilter === 'month') {
        matchesTime = expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
      } else if (timeFilter === 'year') {
        matchesTime = expDate.getFullYear() === now.getFullYear();
      }
      
      return matchesSearch && matchesCategory && matchesTime;
    });
  }, [expenses, search, categoryFilter, timeFilter]);

  if (!auth.token) {
    return <Auth onAuth={(token, user) => setAuth({ token, user })} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-white border-r border-slate-100 flex-col sticky top-0 h-screen">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">SpendWise</span>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3",
                activeTab === 'dashboard' ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={cn(
                "w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3",
                activeTab === 'expenses' ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <List className="w-5 h-5" />
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('budgets')}
              className={cn(
                "w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3",
                activeTab === 'budgets' ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Target className="w-5 h-5" />
              Budgets
            </button>
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-slate-50">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
              {auth.user?.email?.[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate">{auth.user?.email}</p>
              <p className="text-sm font-bold text-slate-900">Premium Account</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-slate-50 hover:bg-red-50 hover:text-red-600 text-slate-500 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-100 z-50 px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">SpendWise</span>
        </div>
        <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-600">
          <LogOut className="w-5 h-5" />
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 pt-24 md:pt-0 min-h-screen">
        <div className="max-w-6xl mx-auto p-4 md:p-12">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
                {activeTab === 'dashboard' ? 'Financial Overview' : activeTab === 'expenses' ? 'All Transactions' : 'Budget Planning'}
              </h1>
              <p className="text-slate-500 mt-2 font-medium">
                {activeTab === 'dashboard' 
                  ? 'Analyze your spending patterns and habits' 
                  : activeTab === 'expenses' 
                  ? `Managing ${expenses.length} financial records`
                  : 'Set monthly limits to stay on track'}
              </p>
            </div>

            <button
              onClick={() => {
                setEditingExpense(undefined);
                setShowAddForm(!showAddForm);
              }}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-2xl shadow-slate-200 transition-all active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" />
              Add Expense
            </button>
          </header>

          <AnimatePresence>
            {(showAddForm || editingExpense) && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-12"
              >
                <ExpenseForm
                  categories={categories}
                  token={auth.token!}
                  editingExpense={editingExpense}
                  onCancelEdit={() => {
                    setEditingExpense(undefined);
                    setShowAddForm(false);
                  }}
                  onAdd={(newExp) => {
                    setExpenses([newExp, ...expenses]);
                    setShowAddForm(false);
                  }}
                  onUpdate={(updatedExp) => {
                    setExpenses(expenses.map(e => e.id === updatedExp.id ? updatedExp : e));
                    setEditingExpense(undefined);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-12">
            {activeTab === 'dashboard' ? (
              <Dashboard 
                expenses={expenses} 
                categories={categories} 
                budgets={budgets} 
                userSettings={userSettings}
              />
            ) : activeTab === 'budgets' ? (
              <BudgetManager 
                categories={categories} 
                token={auth.token!} 
                onUpdate={fetchData} 
                userSettings={userSettings}
              />
            ) : (
              <div className="space-y-8">
                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>

                  <div className="relative group">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium appearance-none"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>

                  <div className="relative group">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <select
                      value={timeFilter}
                      onChange={(e) => setTimeFilter(e.target.value as any)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium appearance-none"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="month">This Month</option>
                      <option value="year">This Year</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>

                  <div className="flex items-center justify-end px-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {filteredExpenses.length} Records
                    </span>
                  </div>
                </div>

                <ExpenseList
                  expenses={filteredExpenses}
                  token={auth.token!}
                  onDelete={(id) => setExpenses(expenses.filter(e => e.id !== id))}
                  onEdit={(exp) => {
                    setEditingExpense(exp);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-100 z-50 px-6 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'dashboard' ? "text-slate-900" : "text-slate-400"
          )}
        >
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'expenses' ? "text-slate-900" : "text-slate-400"
          )}
        >
          <List className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">History</span>
        </button>
        <button
          onClick={() => setActiveTab('budgets')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'budgets' ? "text-slate-900" : "text-slate-400"
          )}
        >
          <Target className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Budget</span>
        </button>
      </div>
    </div>
  );
}
