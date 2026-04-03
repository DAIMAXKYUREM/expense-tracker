import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LineChart, Line, AreaChart, Area } from 'recharts';
import { Expense, Category, Budget, UserSettings } from '../types';
import { TrendingUp, TrendingDown, Wallet, AlertCircle, CheckCircle2, ArrowUpRight, ArrowDownRight, PiggyBank, Calendar, Clock, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface DashboardProps {
  expenses: Expense[];
  categories: Category[];
  budgets: Budget[];
  userSettings: UserSettings;
}

const COLORS = ['#0F172A', '#334155', '#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0'];

export default function Dashboard({ expenses, categories, budgets, userSettings }: DashboardProps) {
  const now = new Date();
  const todayStr = now.toDateString();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Helper to get start of yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  // Helper to get last month
  const lastMonthDate = new Date(now);
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonth = lastMonthDate.getMonth();
  const lastMonthYear = lastMonthDate.getFullYear();

  // Helper to get last year
  const lastYear = currentYear - 1;

  // Spending Calculations
  const stats = useMemo(() => {
    const todaySpending = expenses
      .filter(e => new Date(e.date).toDateString() === todayStr)
      .reduce((sum, e) => sum + e.amount, 0);

    const yesterdaySpending = expenses
      .filter(e => new Date(e.date).toDateString() === yesterdayStr)
      .reduce((sum, e) => sum + e.amount, 0);

    const monthSpending = expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const lastMonthSpending = expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const yearSpending = expenses
      .filter(e => new Date(e.date).getFullYear() === currentYear)
      .reduce((sum, e) => sum + e.amount, 0);

    const lastYearSpending = expenses
      .filter(e => new Date(e.date).getFullYear() === lastYear)
      .reduce((sum, e) => sum + e.amount, 0);

    const calculateSpike = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? current * 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      today: { amount: todaySpending, spike: calculateSpike(todaySpending, yesterdaySpending) },
      month: { amount: monthSpending, spike: calculateSpike(monthSpending, lastMonthSpending) },
      year: { amount: yearSpending, spike: calculateSpike(yearSpending, lastYearSpending) },
      savings: userSettings.salary - monthSpending
    };
  }, [expenses, userSettings, todayStr, yesterdayStr, currentMonth, currentYear, lastMonth, lastMonthYear, lastYear]);

  // Chart Data
  const dailyCurveData = useMemo(() => {
    const hours: { [key: string]: number } = {};
    for (let i = 0; i < 24; i++) hours[`${i}:00`] = 0;
    
    expenses
      .filter(e => new Date(e.date).toDateString() === todayStr)
      .forEach(e => {
        const hour = new Date(e.date).getHours();
        hours[`${hour}:00`] += e.amount;
      });

    return Object.entries(hours).map(([name, amount]) => ({ name, amount }));
  }, [expenses, todayStr]);

  const monthlyCurveData = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days: { [key: string]: number } = {};
    for (let i = 1; i <= daysInMonth; i++) days[i] = 0;

    expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .forEach(e => {
        const day = new Date(e.date).getDate();
        days[day] += e.amount;
      });

    return Object.entries(days).map(([name, amount]) => ({ name: `Day ${name}`, amount }));
  }, [expenses, currentMonth, currentYear]);

  const yearlyCurveData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = months.map(m => ({ name: m, amount: 0 }));

    expenses
      .filter(e => new Date(e.date).getFullYear() === currentYear)
      .forEach(e => {
        const monthIdx = new Date(e.date).getMonth();
        data[monthIdx].amount += e.amount;
      });

    return data;
  }, [expenses, currentYear]);

  const categoryData = useMemo(() => {
    return categories.map(cat => {
      const amount = expenses
        .filter(e => e.category_id === cat.id)
        .reduce((sum, e) => sum + e.amount, 0);
      return { name: cat.name, value: amount };
    }).filter(d => d.value > 0);
  }, [expenses, categories]);

  const budgetProgress = useMemo(() => {
    return categories.map(cat => {
      const budget = budgets.find(b => b.category_id === cat.id);
      const spent = expenses
        .filter(e => {
          const d = new Date(e.date);
          return e.category_id === cat.id && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      
      if (!budget) return null;
      
      const percent = (spent / budget.amount) * 100;
      return {
        name: cat.name,
        budget: budget.amount,
        spent,
        percent,
        status: percent > 100 ? 'over' : percent > 80 ? 'warning' : 'ok'
      };
    }).filter(Boolean);
  }, [expenses, categories, budgets, currentMonth, currentYear]);

  const SpikeBadge = ({ value }: { value: number }) => {
    const isUp = value > 0;
    return (
      <div className={cn(
        "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
        isUp ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50"
      )}>
        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {Math.abs(value).toFixed(1)}% {isUp ? 'Spike' : 'Drop'}
      </div>
    );
  };

  return (
    <div className="space-y-10">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div whileHover={{ y: -5 }} className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-2xl shadow-slate-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <Clock className="w-20 h-20" />
          </div>
          <div className="relative z-10">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">Today's Spending</p>
            <h3 className="text-3xl font-bold tracking-tight">${stats.today.amount.toLocaleString()}</h3>
            <div className="mt-6 flex items-center justify-between">
              <SpikeBadge value={stats.today.spike} />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Limit: ${userSettings.daily_budget}</span>
            </div>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
            <Calendar className="w-20 h-20" />
          </div>
          <div className="relative z-10">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">Monthly Spending</p>
            <h3 className="text-3xl font-bold tracking-tight text-slate-900">${stats.month.amount.toLocaleString()}</h3>
            <div className="mt-6 flex items-center justify-between">
              <SpikeBadge value={stats.month.spike} />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Limit: ${userSettings.monthly_budget}</span>
            </div>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
            <BarChart3 className="w-20 h-20" />
          </div>
          <div className="relative z-10">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">Yearly Spending</p>
            <h3 className="text-3xl font-bold tracking-tight text-slate-900">${stats.year.amount.toLocaleString()}</h3>
            <div className="mt-6 flex items-center justify-between">
              <SpikeBadge value={stats.year.spike} />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Limit: ${userSettings.yearly_budget}</span>
            </div>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="bg-emerald-500 p-8 rounded-[2rem] text-white shadow-2xl shadow-emerald-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform">
            <PiggyBank className="w-20 h-20" />
          </div>
          <div className="relative z-10">
            <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-4">Monthly Savings</p>
            <h3 className="text-3xl font-bold tracking-tight">${stats.savings.toLocaleString()}</h3>
            <div className="mt-6 flex items-center gap-2 text-emerald-100 text-[10px] font-bold uppercase tracking-widest">
              <TrendingUp className="w-4 h-4" />
              <span>Salary: ${userSettings.salary}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Spending Curves */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Daily Curve</h3>
            <div className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hourly</div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyCurveData}>
                <defs>
                  <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F172A" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0F172A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#0F172A" strokeWidth={3} fillOpacity={1} fill="url(#colorDaily)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Monthly Curve</h3>
            <div className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">Daily</div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyCurveData}>
                <defs>
                  <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorMonthly)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Yearly Curve</h3>
            <div className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly</div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yearlyCurveData}>
                <defs>
                  <linearGradient id="colorYearly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorYearly)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Distribution Chart */}
        <div className="bg-white p-10 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Expense Distribution</h3>
            <div className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">By Category</div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget Monitoring */}
        <div className="bg-white p-10 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Category Budgets</h3>
              <p className="text-slate-500 text-sm font-medium mt-1">Real-time tracking of your monthly limits</p>
            </div>
            <div className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Month</div>
          </div>
          
          <div className="space-y-8 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
            {budgetProgress.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">No budgets set for this month</p>
              </div>
            ) : (
              budgetProgress.map((budget, idx) => (
                <div key={idx} className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-sm font-bold text-slate-900">{budget?.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        {budget?.status === 'over' ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            <AlertCircle className="w-3 h-3" /> Over Budget
                          </span>
                        ) : budget?.status === 'warning' ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            <AlertCircle className="w-3 h-3" /> Near Limit
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" /> Healthy
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900">${budget?.spent.toLocaleString()}</span>
                      <span className="text-xs font-bold text-slate-400 ml-1">/ ${budget?.budget.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(budget?.percent || 0, 100)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        budget?.status === 'over' ? "bg-red-500" : 
                        budget?.status === 'warning' ? "bg-amber-500" : "bg-slate-900"
                      )}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
