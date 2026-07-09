'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export default function NavItem({ href, icon, label }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link 
      href={href}
      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
        isActive 
          ? 'bg-slate-800 text-white font-semibold shadow-inner border border-slate-700/50' 
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
      }`}
    >
      <div className={`transition-colors duration-200 ${isActive ? 'text-blue-400' : 'text-slate-200'}`}>
        {icon}
      </div>
      <span>{label}</span>
    </Link>
  );
}
