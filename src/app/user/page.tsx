'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Package, 
  Settings, 
  FileText,
  CheckCircle,
  Clock,
  DollarSign,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

interface Order {
  id: string;
  userId: string;
  contactPerson: string;
  orderDate: string;
  constructionDate: string;
  propertyName: string;
  roomNumber: string;
  address: string;
  keyLocation: string;
  keyReturn: string;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  company?: string;
  store?: string;
}

interface Notification {
  id: string;
  type: 'order' | 'user' | 'schedule' | 'system';
  message: string;
  detail: string;
  time: string;
  read: boolean;
}

export default function UserDashboard() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterFrom, setDateFilterFrom] = useState('');
  const [dateFilterTo, setDateFilterTo] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [updatingNotifications, setUpdatingNotifications] = useState<Set<string>>(new Set());

  // ログインユーザー情報の取得
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setCurrentUser(parsedUser);
      } catch (error) {
        console.error('ユーザー情報の取得に失敗:', error);
        router.push('/login');
      }
      } else {
      router.push('/login');
    }
  }, [router]);

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
      
      // 受注データの取得
      const ordersResponse = await fetch('/api/orders');
      if (ordersResponse.ok) {
        const ordersResult = await ordersResponse.json();
        if (ordersResult.success) {
          // 現在のユーザーの受注のみフィルタリング
          const userOrders = ordersResult.data.filter((order: Order) => 
              order.userId === currentUser?.id
          );
          setOrders(userOrders);
        }
      }

        // 通知データの取得（管理者によるステータス更新のみ表示）
        const notificationsResponse = await fetch('/api/notifications');
        if (notificationsResponse.ok) {
          const notificationsResult = await notificationsResponse.json();
          if (notificationsResult.success) {
            // 自分宛の通知を抽出し、管理者が行ったステータス更新（施工完了、請求済み、入金済み）のみ表示
            const filteredRaw = notificationsResult.data.filter((notification: any) => {
              if (notification.userId !== currentUser?.id) return false;
              if (notification.type === 'schedule') {
                return ['施工完了', '請求済み', '入金済み']
                  .some(status => notification.message.includes(status));
              }
              return false;
            });
            const formattedNotifications = filteredRaw.map((notification: any) => ({
                id: notification.id,
                type: notification.type,
                message: notification.title,
                detail: notification.message,
                time: formatNotificationTime(notification.createdAt),
                read: notification.read
              }));
            setNotifications(formattedNotifications);
        }
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

    if (currentUser?.id) {
    fetchData();
    }
  }, [currentUser]);

  // ソート機能
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ソートされたデータを取得
  const getSortedOrders = (orders: Order[]) => {
    if (!sortField) return orders;

    return [...orders].sort((a, b) => {
      let aValue: any, bValue: any;

      switch(sortField) {
        case 'constructionDate':
          aValue = new Date(a.constructionDate);
          bValue = new Date(b.constructionDate);
          break;
        case 'contactPerson':
          aValue = a.contactPerson;
          bValue = b.contactPerson;
          break;
        case 'status':
          const statusOrder = ['日程待ち', '日程確定', '施工完了', '請求済み', '入金済み', 'キャンセル'];
          aValue = statusOrder.indexOf(a.status);
          bValue = statusOrder.indexOf(b.status);
          break;
      default:
          return 0;
    }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

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

  // フィルター処理
  const filteredOrders = getSortedOrders(orders).filter(order => {
    // キャンセルと入金済みのステータスの発注は表示しない
    if (order.status === 'キャンセル' || order.status === '入金済み' || order.status === '依頼キャンセル') {
      return false;
    }
    
    const searchMatch = searchQuery === '' || 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.propertyName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const assigneeMatch = assigneeFilter === '' || order.contactPerson.includes(assigneeFilter);
    const statusMatch = statusFilter === '' || order.status === statusFilter;
    
    // 日付フィルター
    let dateMatch = true;
    const orderDateObj = new Date(order.constructionDate);
    if (dateFilterFrom) {
      dateMatch = orderDateObj >= new Date(dateFilterFrom);
    }
    if (dateFilterTo) {
      dateMatch = dateMatch && orderDateObj <= new Date(dateFilterTo);
    }
    
    return searchMatch && assigneeMatch && statusMatch && dateMatch;
  });

  // ユニークな担当者と状態の一覧を取得
  const uniqueAssignees = [...new Set(orders.map(order => order.contactPerson))].sort();
  const uniqueStatuses = ['日程待ち', '日程確定', '施工完了', '請求済み']; // 入金済みとキャンセルを除外

  // 時間フォーマット
  const formatNotificationTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return '今';
      if (diffInMinutes < 60) return `${diffInMinutes}分前`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}時間前`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}日前`;
      
      return date.toLocaleDateString('ja-JP');
    } catch (error) {
      return '不明';
    }
  };

  // 既読状態の切り替え
  const handleToggleReadStatus = async (notificationId: string) => {
    try {
      // 更新中の通知IDを追加
      setUpdatingNotifications(prev => new Set(prev).add(notificationId));
      
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          action: 'toggle'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('API応答:', result);
        if (result.success) {
          console.log('既読状態更新:', { notificationId, newReadStatus: result.readStatus });
          // 通知リストを更新
          setNotifications(prev => 
            prev.map(notification => 
              notification.id === notificationId 
                ? { ...notification, read: result.readStatus }
                : notification
            )
          );
        }
      } else {
        console.error('既読状態の更新に失敗しました');
      }
    } catch (error) {
      console.error('既読状態更新エラー:', error);
    } finally {
      // 更新中の通知IDを削除
      setUpdatingNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  // ログアウト処理
  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-gray-600">データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

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
            <div className={`flex items-center ${isSidebarOpen ? 'px-4' : 'px-3'} py-3 text-blue-600 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl ${!isSidebarOpen ? 'justify-center' : ''} border border-blue-100`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {isSidebarOpen && <span className="ml-3 font-semibold">ホーム</span>}
            </div>
          </div>

          {/* その他のナビゲーション項目 */}
          <div className={`${isSidebarOpen ? 'px-6' : 'px-3'} mt-3`}>
            <Link href="/user/orders" className={`flex items-center ${isSidebarOpen ? 'px-4' : 'px-3'} py-3 text-gray-600 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 rounded-2xl transition-all duration-200 ${!isSidebarOpen ? 'justify-center' : ''} hover:shadow-sm border border-transparent hover:border-blue-100`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isSidebarOpen && <span className="ml-3 font-medium">案件管理</span>}
            </Link>
          </div>
          <div className={`${isSidebarOpen ? 'px-6' : 'px-3'} mt-3`}>
            <Link href="/user/new-order" className={`flex items-center ${isSidebarOpen ? 'px-4' : 'px-3'} py-3 text-gray-600 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 rounded-2xl transition-all duration-200 ${!isSidebarOpen ? 'justify-center' : ''} hover:shadow-sm border border-transparent hover:border-blue-100`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {isSidebarOpen && <span className="ml-3 font-medium">新規発注</span>}
            </Link>
          </div>

          <div className={`${isSidebarOpen ? 'px-6' : 'px-3'} mt-3`}>
            <Link href="/user/settings" className={`flex items-center ${isSidebarOpen ? 'px-4' : 'px-3'} py-3 text-gray-600 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 rounded-2xl transition-all duration-200 ${!isSidebarOpen ? 'justify-center' : ''} hover:shadow-sm border border-transparent hover:border-blue-100`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
              {isSidebarOpen && <span className="ml-3 font-medium">アカウント設定</span>}
            </Link>
          </div>
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
        {/* ヘッダー */}
        <header className="bg-white shadow-sm border-b border-gray-100 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* 検索バー - クリア機能付き */}
            <div className="relative w-96 max-w-md">
              <input
                type="text"
                placeholder="発注ID、担当者、物件名で検索..."
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

        {/* メインコンテンツエリア */}
        <div className="p-6 flex-1 overflow-y-auto min-h-0">
          <div className="flex gap-6 h-full">
            {/* 左側：発注一覧 */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800 flex-shrink-0">発注一覧</h2>
                </div>

                {/* フィルターバー - 各フィルターにクリア機能追加 */}
                <div className="flex items-center gap-4 mb-6">
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
                        onClick={() => { setDateFilterFrom(''); setDateFilterTo(''); }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        title="日付フィルターをクリア"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
              </div>

                  {/* 担当者フィルター */}
                  <div className="relative flex-1">
                    <select
                      value={assigneeFilter}
                      onChange={(e) => setAssigneeFilter(e.target.value)}
                      className="w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm font-medium appearance-none"
                    >
                      <option value="">全ての担当者</option>
                      {uniqueAssignees.map(assignee => (
                        <option key={assignee} value={assignee}>{assignee}</option>
                      ))}
                    </select>
                    {assigneeFilter && (
                      <button
                        onClick={() => setAssigneeFilter('')}
                        className="absolute right-10 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        title="担当者フィルターをクリア"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
            </div>
          </div>

                  {/* ステータスフィルター */}
                  <div className="relative flex-1">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm font-medium appearance-none"
                    >
                      <option value="">全てのステータス</option>
                      {uniqueStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    {statusFilter && (
                      <button
                        onClick={() => setStatusFilter('')}
                        className="absolute right-10 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        title="ステータスフィルターをクリア"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
              </div>
            </div>
          </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                  <table className="w-full min-w-full">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="border-b-2 border-gray-100">
                        <th className="text-left py-4 text-sm font-semibold text-gray-700 w-28">発注ID</th>
                        <th className="text-left py-4 text-sm font-semibold text-gray-700 w-28">
                          <button
                            onClick={() => handleSort('constructionDate')}
                            className="flex items-center space-x-1 group hover:text-blue-600 transition-colors"
                          >
                            <span>施工日</span>
                            {renderSortIcon('constructionDate')}
                          </button>
                        </th>
                        <th className="text-left py-4 text-sm font-semibold text-gray-700">
                          <button
                            onClick={() => handleSort('contactPerson')}
                            className="flex items-center space-x-1 group hover:text-blue-600 transition-colors"
                          >
                            <span>担当者</span>
                            {renderSortIcon('contactPerson')}
                          </button>
                        </th>
                        <th className="text-left py-4 text-sm font-semibold text-gray-700">物件名</th>
                        <th className="text-left py-4 text-sm font-semibold text-gray-700 w-16">号室</th>
                        <th className="text-left py-4 text-sm font-semibold text-gray-700 w-24">
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
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="border-b border-gray-50 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all duration-200">
                          <td className="py-4 text-sm">
                            <Link 
                              href={`/order/${order.id}`}
                              className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                            >
                              {order.id}
                            </Link>
                          </td>
                          <td className="py-4 text-sm text-gray-800 font-medium">{order.constructionDate}</td>
                          <td className="py-4 text-sm text-gray-800">{order.contactPerson}</td>
                          <td className="py-4 text-sm text-gray-800">{order.propertyName}</td>
                          <td className="py-4 text-sm text-gray-800 font-medium">{order.roomNumber}</td>
                          <td className="py-4">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                              order.status === '日程待ち' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                              order.status === '日程確定' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                              order.status === '施工完了' ? 'bg-green-100 text-green-700 border border-green-200' :
                              order.status === '請求済み' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                              order.status === '入金済み' ? 'bg-gray-100 text-gray-700 border border-gray-200' :
                              'bg-red-100 text-red-700 border border-red-200'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredOrders.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-lg">該当する発注が見つかりません</p>
                      <p className="text-sm mt-1">検索条件を変更してお試しください</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 右側：お知らせ */}
            <div className="w-96 flex-shrink-0">
              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 flex flex-col h-full">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex-shrink-0">お知らせ</h2>
                
                <div className="flex-1 overflow-y-auto min-h-0">
                  {notifications.length > 0 ? (
                    notifications.map((notification, index) => (
                      <div 
                        key={index} 
                        className={`border-b border-gray-100 pb-4 last:border-b-0 mb-4 rounded-2xl p-4 transition-all duration-200 ${
                          notification.read 
                            ? 'bg-gray-50 opacity-75' 
                            : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-cyan-50 bg-white'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                            notification.type === 'order' ? 'bg-blue-500' :
                            notification.type === 'schedule' ? 'bg-green-500' :
                            notification.type === 'user' ? 'bg-purple-500' :
                            notification.type === 'system' ? 'bg-orange-500' :
                            'bg-gray-500'
                          }`}></div>
                    <div className="flex-1">
                            <p className={`text-sm font-semibold ${notification.read ? 'text-gray-500' : 'text-gray-800'}`}>
                              {notification.message}
                            </p>
                            <p className={`text-xs mt-2 ${notification.read ? 'text-gray-400' : 'text-gray-600'}`}>
                              {notification.detail}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">{notification.time}</p>
                    </div>
                          <div className="flex-shrink-0">
                            <button
                              onClick={() => handleToggleReadStatus(notification.id)}
                              disabled={updatingNotifications.has(notification.id)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                                notification.read
                                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                  : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                              } ${
                                updatingNotifications.has(notification.id) 
                                  ? 'opacity-50 cursor-not-allowed' 
                                  : 'hover:shadow-sm'
                              }`}
                              title={notification.read ? '未読にする' : '既読にする'}
                            >
                              {updatingNotifications.has(notification.id) ? (
                                <div className="flex items-center space-x-1">
                                  <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  <span>更新中</span>
                                </div>
                              ) : notification.read ? (
                                <span>既読</span>
                              ) : (
                                <span>未読</span>
                              )}
                            </button>
                    </div>
                  </div>
              </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-5 5-5-5h5V6h5v11z" />
                      </svg>
                      <p className="text-sm">お知らせはありません</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 