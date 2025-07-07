'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, 
  Calendar, 
  MapPin, 
  Eye, 
  RefreshCw,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Key
} from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

interface Order {
  id: string;
  userId: string;
  contactPerson: string;
  orderDate: string;
  constructionDate: string;
  propertyName: string;
  roomNumber: string;
  roomArea?: number;
  address: string;
  keyLocation: string;
  keyReturn: string;
  keyStatus?: 'pending' | 'handed';
  status: '日程待ち' | '日程確定' | '施工中' | '施工完了' | '請求済み' | '依頼キャンセル';
  notes: string;
  createdAt: string;
  updatedAt: string;
  services?: string[];
}

export default function UserOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterFrom, setDateFilterFrom] = useState('');
  const [dateFilterTo, setDateFilterTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ナビゲーション項目
  const navItems = [
    { 
      name: '案件管理',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      active: true,
      href: '/user/orders'
    },
    { 
      name: '新規発注', 
      icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
      href: '/user/new-order'
    },
    { 
      name: 'アカウント設定', 
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      href: '/user/settings'
    }
  ];

  // SWRで全受注をキャッシュ取得し、currentUserでフィルタリング
  const { data: raw, error, mutate } = useSWR<{ success: boolean; data: (Order & { services: string[] })[] }>('/api/orders/with-items', fetcher);
  const allOrders = raw?.success ? raw.data : [];
  const swrLoading = !raw && !error;

  // currentUserをlocalStorageから取得
  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      try {
        setCurrentUser(JSON.parse(u));
      } catch {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  // ソート機能
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // currentUserが取得できるまで待機
  const userOrders = currentUser ? allOrders.filter(order => order.userId === currentUser.id) : [];
  // フィルター適用
  const filteredOrders = userOrders.filter(order => {
    // 依頼キャンセルされた注文は表示しない
    if (order.status === '依頼キャンセル') {
      return false;
    }
    
    // 検索クエリフィルター
    const searchMatch = searchQuery === '' || 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.propertyName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 日付フィルター
    const constructionDate = new Date(order.constructionDate);
    const fromDate = dateFilterFrom ? new Date(dateFilterFrom) : null;
    const toDate = dateFilterTo ? new Date(dateFilterTo) : null;
    
    const dateMatch = (!fromDate || constructionDate >= fromDate) && 
                     (!toDate || constructionDate <= toDate);

    // ステータスフィルター
    const statusMatch = statusFilter === '' || order.status === statusFilter;
    
    return searchMatch && dateMatch && statusMatch;
  });

  // ソート適用
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue: any, bValue: any;
    switch(sortField) {
      case 'id':
        aValue = a.id;
        bValue = b.id;
        break;
      case 'orderDate':
      case 'constructionDate':
        aValue = new Date(a[sortField]);
        bValue = new Date(b[sortField]);
        break;
      case 'status':
        const statusOrder = ['日程待ち', '日程確定', '施工完了', '請求済み'];
        aValue = statusOrder.indexOf(a.status);
        bValue = statusOrder.indexOf(b.status);
        break;
      default:
        aValue = a[sortField as keyof Order];
        bValue = b[sortField as keyof Order];
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // ページネーション
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  // SWR 読み込み中はスピナー表示
  if (swrLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-gray-600">案件データを読み込んでいます…</p>
        </div>
      </div>
    );
  }

  // ソートアイコンのレンダリング
  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return (
      <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'text-blue-600' : 'text-blue-600 rotate-180'} transition-transform`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    );
  };

  // ステータスバッジの色設定
  const getStatusColor = (status: string) => {
    switch(status) {
      case '日程待ち': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case '日程確定': return 'bg-blue-100 text-blue-700 border-blue-200';
      case '施工完了': return 'bg-green-100 text-green-700 border-green-200';
      case '請求済み': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getKeyStatusLabel = (keyStatus?: 'pending' | 'handed') => {
    switch (keyStatus) {
      case 'pending': return '事務所';
      case 'handed': return '受渡済';
      default: return '事務所';
    }
  };

  const getKeyStatusStyle = (keyStatus?: 'pending' | 'handed') => {
    switch (keyStatus) {
      case 'pending': return 'text-yellow-500'; // 黄色の鍵
      case 'handed': return 'text-gray-400'; // グレーの鍵
      default: return 'text-yellow-500';
    }
  };

  // 選択チェックボックス
  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === paginatedOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(paginatedOrders.map(order => order.id));
    }
  };

  // フィルタークリア機能
  const clearFilters = () => {
    setSearchQuery('');
    setDateFilterFrom('');
    setDateFilterTo('');
    setStatusFilter('');
  };

  // 日付フォーマット関数（01/01形式）
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: '2-digit',
      day: '2-digit'
    });
  };

  // ログアウト処理
  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  // 鍵ステータス更新
  const updateKeyStatus = async (orderId: string, currentKeyStatus?: 'pending' | 'handed') => {
    try {
      // handed（鍵未着）からpending（鍵到着済）への変更の場合は確認ダイアログを表示
      if (currentKeyStatus === 'handed') {
        const confirmed = window.confirm('鍵が到着しましたか？元に戻せなくなります。');
        if (!confirmed) {
          return; // キャンセルされた場合は処理を中止
        }
      }
      
      // pending（鍵到着済）からhanded（鍵未着）への変更は禁止
      if (currentKeyStatus === 'pending') {
        alert('鍵到着済の状態からは変更できません。');
        return;
      }
      
      setUpdating(orderId);
      
      const newKeyStatus = 'pending'; // handedからpendingへの一方向のみ
      
      console.log('🔑 鍵ステータス更新開始:', { orderId, currentKeyStatus, newKeyStatus });
      
      const response = await fetch(`/api/orders/${orderId}/key-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyStatus: newKeyStatus }),
      });

      console.log('📡 API応答:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('📋 API結果:', result);
        
        if (result.success) {
          // 鍵状態を更新
          setOrders(prev => prev.map(order => 
            order.id === orderId ? { ...order, keyStatus: newKeyStatus } : order
          ));
          console.log('✅ フロントエンド状態更新完了');
        } else {
          console.error('❌ API失敗:', result.error);
        }
      } else {
        console.error('❌ HTTP エラー:', response.status);
      }
    } catch (error) {
      console.error('💥 鍵ステータス更新エラー:', error);
    } finally {
      setUpdating(null);
    }
  };

  // データ再取得
  const handleRefresh = async () => {
    setRefreshing(true);
    await mutate();
    setRefreshing(false);
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
          {/* ホーム */}
          <div className={`${isSidebarOpen ? 'px-6' : 'px-3'}`}>
            <Link href="/user" className={`flex items-center ${isSidebarOpen ? 'px-4' : 'px-3'} py-3 text-gray-600 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 rounded-2xl transition-all duration-200 ${!isSidebarOpen ? 'justify-center' : ''} hover:shadow-sm border border-transparent hover:border-blue-100`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {isSidebarOpen && <span className="ml-3 font-medium">ホーム</span>}
            </Link>
          </div>

          {/* ナビゲーション項目 */}
          {navItems.map((item, index) => (
            <div key={index} className={`${isSidebarOpen ? 'px-6' : 'px-3'} mt-3`}>
              <Link href={item.href} className={`flex items-center ${isSidebarOpen ? 'px-4' : 'px-3'} py-3 ${item.active ? 'text-blue-600 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100' : 'text-gray-600 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 border border-transparent hover:border-blue-100'} rounded-2xl transition-all duration-200 ${!isSidebarOpen ? 'justify-center' : ''} ${!item.active ? 'hover:shadow-sm' : 'shadow-sm'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                {isSidebarOpen && <span className={`ml-3 ${item.active ? 'font-semibold' : 'font-medium'}`}>{item.name}</span>}
              </Link>
            </div>
          ))}
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
        {/* ヘッダー（検索バー付き） */}
        <header className="bg-white shadow-sm border-b border-gray-100 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* 左側：検索バー */}
            <div className="relative w-96">
              <input
                type="text"
                placeholder="発注ID、物件名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 pr-12 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 focus:bg-white transition-all duration-200"
              />
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  title="検索をクリア"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* 右側：ユーザー情報とログアウト */}
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-800">
                  {currentUser?.companyName || 'ユーザー'}
            </div>
                <div className="text-xs text-gray-500">
                  {currentUser?.storeName || ''}
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

        {/* フィルターバー */}
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* 施工日期間フィルター */}
            <div className="flex items-center gap-2 relative">
              <label className="text-sm font-medium text-gray-700">施工日</label>
              <input
                type="date"
                value={dateFilterFrom}
                onChange={(e) => setDateFilterFrom(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
              <span className="text-gray-500">〜</span>
              <input
                type="date"
                value={dateFilterTo}
                onChange={(e) => setDateFilterTo(e.target.value)}
                className="px-3 py-2 pr-8 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
              {(dateFilterFrom || dateFilterTo) && (
                <button
                  onClick={() => {
                    setDateFilterFrom('');
                    setDateFilterTo('');
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  title="日付フィルターをクリア"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* 本日ボタン */}
            <button
              onClick={() => {
                const d = new Date();
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const today = `${yyyy}-${mm}-${dd}`;
                setDateFilterFrom(today);
                setDateFilterTo(today);
              }}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
            >
              本日
            </button>

            {/* ステータスフィルター */}
            <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
                className="w-48 px-3 py-2 pr-8 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm appearance-none bg-white"
            >
                <option value="">全てのステータス</option>
              <option value="日程待ち">日程待ち</option>
              <option value="日程確定">日程確定</option>
              <option value="施工完了">施工完了</option>
              <option value="請求済み">請求済み</option>
            </select>
              {statusFilter && (
                <button
                  onClick={() => setStatusFilter('')}
                  className="absolute right-8 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  title="ステータスフィルターをクリア"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
          </div>
        </div>

            {/* フィルタークリアボタン */}
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
            >
              リセット
            </button>
            {/* 更新ボタン */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 inline mr-1 ${refreshing ? 'animate-spin' : ''}`} /> 更新
            </button>
          </div>
                      </div>
                      
        {/* テーブル */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="w-10 text-center py-4 px-3 align-middle">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedOrders.length === paginatedOrders.length && paginatedOrders.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                        </div>
                  </th>
                  <th className="text-left py-4 text-sm font-semibold text-gray-700 w-28">発注ID</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 min-w-24">
                    <button
                      onClick={() => handleSort('orderDate')}
                      className="flex items-center space-x-1 group hover:text-blue-600 transition-colors"
                    >
                      <span>発注日</span>
                      {renderSortIcon('orderDate')}
                    </button>
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 min-w-24">
                    <button
                      onClick={() => handleSort('constructionDate')}
                      className="flex items-center space-x-1 group hover:text-blue-600 transition-colors"
                    >
                      <span>施工日</span>
                      {renderSortIcon('constructionDate')}
                    </button>
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 min-w-20">担当者</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 min-w-64">物件名</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 min-w-24">号室</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 min-w-20">
                    <button
                      onClick={() => handleSort('roomArea')}
                      className="flex items-center space-x-1 group hover:text-blue-600 transition-colors"
                    >
                      <span>広さ</span>
                      {renderSortIcon('roomArea')}
                    </button>
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 min-w-48">施工内容</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 min-w-20">鍵</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 min-w-32">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center space-x-1 group hover:text-blue-600 transition-colors"
                    >
                      <span>ステータス</span>
                      {renderSortIcon('status')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="text-center py-4 px-3 align-middle">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                    </td>
                    <td className="py-4 text-sm">
                        <Link
                          href={`/order/${order.id}`}
                        className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors duration-200"
                        >
                        {order.id}
                        </Link>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {formatDate(order.orderDate)}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900 font-medium">
                      {formatDate(order.constructionDate)}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900">{order.contactPerson}</td>
                    <td className="py-4 px-4 text-sm text-gray-900">{order.propertyName}</td>
                    <td className="py-4 px-4 text-sm text-gray-500">{order.roomNumber}</td>
                    <td className="py-4 px-4 text-sm text-gray-900">
                      {order.roomArea !== undefined ? order.roomArea : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      <div className="flex flex-wrap gap-1">
                        {order.services?.map((service, idx) => (
                          <span key={idx} className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {service}
                          </span>
                        ))}
                    </div>
                    </td>
                    <td className="py-4 px-4 text-sm">
                      <button
                        onClick={() => updateKeyStatus(order.id, order.keyStatus)}
                        disabled={updating === order.id}
                        className="flex items-center hover:opacity-70 transition-opacity disabled:opacity-50"
                        title={updating === order.id ? '更新中...' : order.keyStatus === 'pending' ? '鍵到着済' : '鍵未着'}
                      >
                        {updating === order.id ? (
                          <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                        ) : (
                        <Key className={`h-4 w-4 ${getKeyStatusStyle(order.keyStatus)}`} />
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {paginatedOrders.length === 0 && (
              <div className="text-center py-16 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium">案件データが見つかりません</p>
                <p className="text-sm mt-1">検索条件を変更するか、新規発注を登録してください</p>
              </div>
            )}
          </div>
        </div>

        {/* フッター（ページネーション） */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">表示件数:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value={10}>10件</option>
                <option value={20}>20件</option>
                <option value={50}>50件</option>
                <option value={100}>100件</option>
              </select>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm text-gray-600 disabled:text-gray-400 hover:text-blue-600 disabled:cursor-not-allowed"
              >
                前
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 text-sm rounded transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm text-gray-600 disabled:text-gray-400 hover:text-blue-600 disabled:cursor-not-allowed"
              >
                次
              </button>
            </div>

            <div className="text-sm text-gray-700">
              {startIndex + 1} - {Math.min(startIndex + itemsPerPage, sortedOrders.length)} / {sortedOrders.length}件
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 