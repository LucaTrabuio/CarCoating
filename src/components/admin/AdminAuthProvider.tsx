'use client';
import { createContext, useContext, type ReactNode } from 'react';

export interface AdminUser {
  uid: string;
  email: string;
  role: 'super_admin' | 'store_admin';
  managed_stores: string[];
}

const AdminAuthContext = createContext<AdminUser | null>(null);

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}

export function AdminAuthProvider({ user, children }: { user: AdminUser; children: ReactNode }) {
  return <AdminAuthContext value={user}>{children}</AdminAuthContext>;
}
