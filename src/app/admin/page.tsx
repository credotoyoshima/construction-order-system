'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { useAuthCheck } from '@/hooks/useAuthCheck';

interface Statistics {
  totalOrders: number;
  monthlyOrders: number;
  totalUsers: number;
  statusBreakdown: Record<string, number>;
  pendingOrders: number;
}

interface Order {
  id: string;
  userId: string;
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
  type: 'order' | 'user' | 'system';
  message: string;
  detail: string;
  time: string;
  read: boolean;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { isAuthenticated, isCheckingAuth } = useAuthCheck('admin');
  
  const [stats, setStats] = useState<Statistics>({
    totalOrders: 0,
    monthlyOrders: 0,
    totalUsers: 0,
    statusBreakdown: {},
    pendingOrders: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterFrom, setDateFilterFrom] = useState('');
  const [dateFilterTo, setDateFilterTo] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [updatingNotifications, setUpdatingNotifications] = useState<Set<string>>(new Set());

  // ユーザー情報を取得する関数
  const getUserInfo = (userId: string) => {
    return users.find(user => user.id === userId);
  };

  // データを取得する関数
  const fetchData = async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // 並列でAPIを呼び出し（ユーザー情報も追加）
      const [statsResponse, ordersResponse, usersResponse] = await Promise.all([
        fetch('/api/statistics'),
        fetch('/api/orders'),
        fetch('/api/users')
      ]);

      // ユーザーデータの処理
      let usersData: any[] = [];
      if (usersResponse.ok) {
        const usersResult = await usersResponse.json();
        if (usersResult.success) {
          usersData = usersResult.data;
          setUsers(usersData);
        }
      }

      // 統計データの処理
      if (statsResponse.ok) {
        const statsResult = await statsResponse.json();
        if (statsResult.success) {
          setStats(statsResult.data);
        }
      }

      // 受注データの処理とユーザー情報の紐付け
      if (ordersResponse.ok) {
        const ordersResult = await ordersResponse.json();
        if (ordersResult.success) {
          // 受注データとユーザー情報を紐付け
          const ordersWithUserInfo = ordersResult.data.map((order: Order) => {
            const userInfo = usersData.find(user => user.id === order.userId);
            return {
              ...order,
              company: userInfo?.companyName || '',
              store: userInfo?.storeName || ''
            };
          });

          const sortedOrders = ordersWithUserInfo.sort((a: Order, b: Order) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setRecentOrders(sortedOrders);
        }
      }

      // お知らせデータの取得
      try {
        const notificationsResponse = await fetch('/api/notifications');
        const notificationsResult = await notificationsResponse.json();
        
        if (notificationsResult.success) {
          // 通知データを管理者ダッシュボード用にフォーマット
          // ステータス更新通知のうち施工完了・請求済み・入金済みは除外
          const filteredNotifications = notificationsResult.data.filter((notification: any) => {
            // status change notifications include newStatus in message field
            const detailMsg = notification.message || '';
            if (notification.type === 'schedule' && /(「施工完了」|「請求済み」|「入金済み」)/.test(detailMsg)) {
              return false;
            }
            return true;
          });
          const formattedNotifications = filteredNotifications.map((notification: any) => ({
            id: notification.id,
            type: notification.type,
            message: notification.title || notification.message,
            detail: notification.message || notification.title,
            time: formatNotificationTime(notification.createdAt),
            read: notification.read
          }));
          
          setNotifications(formattedNotifications);
          console.log('通知データを取得しました:', formattedNotifications);
        }
      } catch (error) {
        console.error('お知らせ取得エラー:', error);
        // エラー時はフォールバック表示
        setNotifications([
          {
            id: 'error',
            type: 'system',
            message: 'お知らせの取得に失敗しました',
            detail: 'ネットワークエラーまたはサーバーエラーが発生しました',
            time: '今',
            read: false
          }
        ]);
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 初回データ取得
  useEffect(() => {
    fetchData();
  }, []);

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
        case 'company':
          aValue = a.company || '';
          bValue = b.company || '';
          break;
        case 'status':
          const statusOrder = ['日程待ち', '日程確定', '施工完了', '請求済み', 'キャンセル'];
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

  // 通知時間のフォーマット
  const formatNotificationTime = (isoString: string) => {
    const now = new Date();
    const notificationTime = new Date(isoString);
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return '今';
    if (diffInMinutes < 60) return `${diffInMinutes}分前`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}時間前`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}日前`;
    
    return notificationTime.toLocaleDateString('ja-JP', {
      month: '2-digit',
      day: '2-digit'
    });
  };

  // 会社名の一覧を取得
  const uniqueCompanies = [...new Set(
    recentOrders
      .map(order => order.company)
      .filter(company => company && company.trim() !== '')
  )].sort();

  // フィルター処理
  const filteredOrders = getSortedOrders(recentOrders).filter(order => {
    // キャンセル、請求済み、入金済みのステータスの発注は表示しない
    if (
      order.status === 'キャンセル' ||
      order.status === '請求済み' ||
      order.status === '入金済み' ||
      order.status === '依頼キャンセル'
    ) {
      return false;
    }
    
    const searchMatch = searchQuery === '' || 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.store || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.propertyName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const companyMatch = companyFilter === '' || order.company === companyFilter;
    const statusMatch = statusFilter === '' || order.status === statusFilter;
    
    let dateMatch = true;
    const orderDateObj = new Date(order.constructionDate);
    if (dateFilterFrom) {
      dateMatch = orderDateObj >= new Date(dateFilterFrom);
    }
    if (dateFilterTo) {
      dateMatch = dateMatch && orderDateObj <= new Date(dateFilterTo);
    }
    
    return searchMatch && companyMatch && statusMatch && dateMatch;
  });

  const uniqueStatuses = ['日程待ち', '日程確定', '施工完了'];

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

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // お知らせを既読にする
  const handleToggleReadStatus = async (notificationId: string) => {
    try {
      setUpdatingNotifications(prev => new Set(prev).add(notificationId));
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, action: 'toggle' }),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setNotifications(prev =>
            prev.map(notification =>
            notification.id === notificationId
                ? { ...notification, read: result.readStatus }
              : notification
          )
        );
        } else {
          console.error('既読状態の更新に失敗しました');
        }
      } else {
        console.error('既読状態の更新に失敗しました');
      }
    } catch (error) {
      console.error('既読状態更新エラー:', error);
    } finally {
      setUpdatingNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  // 認証チェック中のローディング
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  // 認証されていない場合は何も表示しない（リダイレクト処理中）
  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <AdminLayout 
        currentPage="ホーム"
        onSearch={setSearchQuery}
        searchValue={searchQuery}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p className="text-gray-600">データを読み込んでいます...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      currentPage="ホーム"
      onSearch={setSearchQuery}
      searchValue={searchQuery}
    >
      <div className="flex gap-6 h-full">
        {/* 左側：受注一覧 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 受注一覧 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col flex-1 min-h-0">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">受注一覧</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => fetchData(true)}
                  disabled={refreshing}
                  className="px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-200 border border-blue-200 hover:border-blue-300 disabled:opacity-50 text-sm font-medium"
                >
                  <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* フィルターバー */}
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

                {/* 会社名フィルター */}
                <div className="relative flex-1">
                  <select
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm appearance-none"
                  >
                    <option value="">全ての会社</option>
                    {uniqueCompanies.map(company => (
                      <option key={company} value={company}>{company}</option>
                    ))}
                  </select>
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
                    className="w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm appearance-none"
                  >
                    <option value="">全てのステータス</option>
                    {uniqueStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            
            <div className="flex-1 overflow-y-auto min-h-0">
              <table className="w-full">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b-2 border-gray-100">
                    <th className="text-left py-4 text-sm font-semibold text-gray-700 w-28">受注ID</th>
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
                        onClick={() => handleSort('company')}
                        className="flex items-center space-x-1 group hover:text-blue-600 transition-colors"
                      >
                        <span>会社名</span>
                        {renderSortIcon('company')}
                      </button>
                    </th>
                    <th className="text-left py-4 text-sm font-semibold text-gray-700">店舗名</th>
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
                        <button 
                          className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors duration-200"
                          onClick={() => {
                            router.push(`/order/${order.id}`);
                          }}
                        >
                          {order.id}
                        </button>
                      </td>
                      <td className="py-4 text-sm text-gray-800 font-medium">{formatDate(order.constructionDate)}</td>
                      <td className="py-4 text-sm text-gray-800">{order.company || '-'}</td>
                      <td className="py-4 text-sm text-gray-600">{order.store || '-'}</td>
                      <td className="py-4 text-sm text-gray-800">{order.propertyName}</td>
                      <td className="py-4 text-sm text-gray-800 font-medium">{order.roomNumber}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                          order.status === '日程待ち' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                          order.status === '日程確定' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                          order.status === '施工完了' ? 'bg-green-100 text-green-700 border border-green-200' :
                          'bg-gray-100 text-gray-700 border border-gray-200'
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
                  <p className="text-lg">該当する受注が見つかりません</p>
                  <p className="text-sm mt-1">検索条件を変更してお試しください</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右側：お知らせ */}
        <div className="w-96 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col h-full">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex-shrink-0">お知らせ</h3>
            <div className="flex-1 overflow-y-auto min-h-0">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`border-b border-gray-100 pb-4 last:border-b-0 mb-4 rounded-2xl p-4 transition-all duration-200 ${
                    notification.read 
                      ? 'bg-gray-50 opacity-60'
                      : 'bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50'
                  }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                      notification.read 
                        ? 'bg-gray-400'
                        : notification.type === 'user' ? 'bg-blue-500' : notification.type === 'order' ? 'bg-green-500' : 'bg-purple-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${notification.read ? 'text-gray-500' : 'text-gray-800'}`}>{notification.message}</p>
                      <p className={`text-xs mt-2 ${notification.read ? 'text-gray-400' : 'text-gray-600'}`}>{notification.detail}</p>
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 