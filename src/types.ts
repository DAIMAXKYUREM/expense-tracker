export interface User {
  id: number;
  email: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
}

export interface Expense {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  description: string;
  date: string;
  category_name: string;
  category_color: string;
}

export interface Budget {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  month: number;
  year: number;
  category_name: string;
  category_color: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
}

export interface UserSettings {
  salary: number;
  daily_budget: number;
  monthly_budget: number;
  yearly_budget: number;
}
