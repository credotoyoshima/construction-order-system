'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
  onSearch?: (searchTerm: string) => void;
  searchValue?: string;
  fullWidth?: boolean;
  hideHeaderOnMobile?: boolean;
}

interface User {
  id: string;
  role: 'admin' | 'user';
  companyName: string;
  storeName: string;
  contactPerson: string;
  email: string;
  phoneNumber: string;
  address: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

export default function AdminLayout({ children, currentPage = 'ホーム', onSearch, searchValue = '', fullWidth = false, hideHeaderOnMobile = false }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  // モバイル判定とサイドバー開閉制御
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [user, setUser] = useState<User | null>(null);

  // ユーザー情報を取得
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('ユーザー情報の取得に失敗:', error);
      }
    }
  }, []);

  // モバイル時は受注管理以外へアクセスすると自動リダイレクト
  useEffect(() => {
    if (isMobile && pathname !== '/admin/orders') {
      router.push('/admin/orders');
    }
  }, [isMobile, pathname, router]);

  // ナビゲーション項目
  const navItems = [
    { name: 'ホーム', href: '/admin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { name: '受注管理', href: '/admin/orders', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { name: 'アーカイブ', href: '/admin/archive', icon: 'M20 13v1a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-1m16 0H4m16-5V8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v5m16 0H4' },
    { name: 'ユーザー管理', href: '/admin/users', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' }
  ];

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  // 役割の日本語表示
  const getRoleDisplayName = (role: string) => {
    return role === 'admin' ? '管理者' : 'ユーザー';
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 overflow-hidden">
      {/* サイドバー */}
      <div className={`${isSidebarOpen ? 'w-72' : 'w-20'} bg-white shadow-xl transition-all duration-300 flex-shrink-0 border-r border-gray-100`}>
        <div className="p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            {isSidebarOpen && (
              <h1 className="ml-4 text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                工事受注システム
              </h1>
            )}
          </div>
        </div>

        <nav className="mt-8">
          {/* ナビゲーション項目（モバイルは受注管理のみ） */}
          {(() => {
            const displayedNavItems = isMobile
              ? navItems.filter(item => item.name === '受注管理')
              : navItems;
            return displayedNavItems.map((item, index) => {
            const isActive = currentPage === item.name;
            return (
              <div key={index} className={`${isSidebarOpen ? 'px-6' : 'px-3'} mt-3`}>
                <button
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center ${isSidebarOpen ? 'px-4' : 'px-3'} py-3 rounded-2xl transition-all duration-200 ${!isSidebarOpen ? 'justify-center' : ''} ${
                    isActive
                      ? 'text-blue-600 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 shadow-sm'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 border border-transparent hover:border-blue-100 hover:shadow-sm'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  {isSidebarOpen && <span className={`ml-3 ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.name}</span>}
                </button>
              </div>
            );
            });
          })()}
        </nav>

        {/* サイドバー切り替えボタン */}
        <div className="absolute bottom-6 left-6">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`flex items-center ${isSidebarOpen ? 'px-4' : 'px-3'} py-3 text-gray-600 hover:text-blue-600 transition-all duration-200 rounded-2xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 border border-transparent hover:border-blue-100`}
          >
            <svg 
              className={`w-5 h-5 transition-transform ${isSidebarOpen ? '' : 'rotate-180'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {isSidebarOpen && <span className="ml-3 font-medium">閉じる</span>}
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!(isMobile && hideHeaderOnMobile) && (
        <header className="bg-white shadow-sm border-b border-gray-100 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* ページタイトルと検索バー */}
            <div className="flex items-center space-x-6 flex-1">
              {/* フリーワード検索バー（ホーム・受注管理・ユーザー管理・レポートページ） */}
              {(currentPage === 'ホーム' || currentPage === '受注管理' || currentPage === 'ユーザー管理' || currentPage === 'アーカイブ') && onSearch && (
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder={
                      currentPage === 'ユーザー管理' 
                        ? "ユーザーID、会社名、メールアドレスで検索..."
                        : "受注ID、会社名で検索..."
                    }
                    value={searchValue}
                    onChange={(e) => onSearch(e.target.value)}
                    className="w-full px-4 py-2 pl-10 pr-10 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 focus:bg-white transition-all duration-200"
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchValue && (
                    <button
                      onClick={() => onSearch('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-800">
                  {user ? getRoleDisplayName(user.role) : '読み込み中...'}
                </div>
                <div className="text-xs text-gray-500">
                  {user ? `${user.companyName} ${user.storeName}` : ''}
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200 border border-red-200 hover:border-red-300 hover:shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>
        )}

        {/* メインコンテンツエリア */}
        <div className={`flex-1 overflow-y-auto min-h-0 ${fullWidth ? '' : 'p-6'}`}>
          {children}
        </div>
      </div>
    </div>
  );
} 