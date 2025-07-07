'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Key } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { useAuthCheck } from '@/hooks/useAuthCheck';
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
  status: '日程待ち' | '日程確定' | '施工完了' | '請求済み' | '入金済み' | 'キャンセル' | '依頼キャンセル';
  notes: string;
  createdAt: string;
  updatedAt: string;
  company?: string;
  store?: string;
  services?: string[];
}

interface User {
  id: string;
  companyName: string;
  storeName: string;
  email: string;
  phoneNumber: string;
  address: string;
}

export default function OrderManagementPage() {
  const router = useRouter();
  const { isAuthenticated, isCheckingAuth } = useAuthCheck('admin');
  
  // SWRによるデータ取得
  const { data: ordersDataRaw, error: ordersError, mutate: mutateOrders } = useSWR<{ success: boolean; data: Order[] }>('/api/orders/with-items', fetcher);
  const { data: usersDataRaw, error: usersError } = useSWR<{ success: boolean; data: User[] }>('/api/users', fetcher);
  const ordersData = ordersDataRaw?.success ? ordersDataRaw.data : [];
  const usersData = usersDataRaw?.success ? usersDataRaw.data : [];
  const loading = (!ordersDataRaw && !ordersError) || (!usersDataRaw && !usersError);
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await mutateOrders();
    setRefreshing(false);
  };

  const [updating, setUpdating] = useState<string | null>(null);
  // 一括ステータス変更モーダル表示状態
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  // 一括ステータス選択
  const [bulkSelectedStatus, setBulkSelectedStatus] = useState<string>('日程待ち');
  
  // フィルター・検索状態
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterFrom, setDateFilterFrom] = useState('');
  const [dateFilterTo, setDateFilterTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  
  // ソート状態
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // 選択・ページネーション状態
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // 注文データに会社名・店舗名をマージ
  const orders = ordersData.map(order => {
    const user = usersData.find(u => u.id === order.userId);
    return {
      ...order,
      company: user?.companyName || '',
      store: user?.storeName || '',
    };
  });

  // ソート機能
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ソート適用
  const getSortedOrders = (orders: Order[]) => {
    if (!sortField) return orders;

    return [...orders].sort((a, b) => {
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
        case 'company':
          aValue = a.company || '';
          bValue = b.company || '';
          break;
        case 'status':
          const statusOrder = ['日程待ち', '日程確定', '施工完了', '請求済み', '入金済み'];
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
  };

  // フィルター適用
  const filteredOrders = getSortedOrders(orders).filter(order => {
    // 依頼キャンセルされた注文は表示しない
    if (order.status === '依頼キャンセル') {
      return false;
    }
    
    const searchMatch = searchQuery === '' || 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 日付フィルター
    const constructionDate = new Date(order.constructionDate);
    const fromDate = dateFilterFrom ? new Date(dateFilterFrom) : null;
    const toDate = dateFilterTo ? new Date(dateFilterTo) : null;
    
    const dateMatch = (!fromDate || constructionDate >= fromDate) && 
                     (!toDate || constructionDate <= toDate);
    
    // その他フィルター
    const statusMatch = statusFilter === '' || order.status === statusFilter;
    const companyMatch = companyFilter === '' || (order.company || '').includes(companyFilter);
    
    return searchMatch && dateMatch && statusMatch && companyMatch;
  });

  // ページネーション
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  // ユニークな会社・ステータス一覧
  const uniqueCompanies = [...new Set(
    orders
      .map(order => order.company)
      .filter(company => company && company.trim() !== '')
  )].sort();

  const uniqueStatuses = ['日程待ち', '日程確定', '施工完了', '請求済み', '入金済み'];

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
      case '入金済み': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'キャンセル': return 'bg-red-100 text-red-700 border-red-200';
      case '依頼キャンセル': return 'bg-red-100 text-red-700 border-red-200';
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

  // フィルタークリア
  const clearFilters = () => {
    setSearchQuery('');
    setDateFilterFrom('');
    setDateFilterTo('');
    setStatusFilter('');
    setCompanyFilter('');
  };

  // ステータス更新
  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      setUpdating(orderId);
      
      const response = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          status: newStatus
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // 一覧を再フェッチして最新状態を反映
        await mutateOrders();
        alert('ステータスが更新されました！');
        router.refresh();
      } else {
        alert('ステータス更新に失敗しました: ' + result.error);
      }
    } catch (error) {
      console.error('ステータス更新エラー:', error);
      alert('ステータス更新中にエラーが発生しました');
    } finally {
      setUpdating(null);
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
          // 一覧を再フェッチして最新状態を反映
          await mutateOrders();
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

  // ステータス一括更新モーダルを開く
  const handleBulkStatusChange = () => {
    setIsBulkModalOpen(true);
  };

  // モーダルで選択したステータスを一括更新
  const confirmBulkStatusChange = async (newStatus: string) => {
    setIsBulkModalOpen(false);
    setUpdating('bulk');
    try {
      // 通知IDをユニークにするため、順次リクエストを実行
      for (const id of selectedOrders) {
        await fetch('/api/orders/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: id, status: newStatus }),
        });
      }
      await mutateOrders();
      alert('一括ステータス更新が完了しました');
      setSelectedOrders([]);
    } catch (error) {
      console.error('一括ステータス更新エラー:', error);
      alert('一括ステータス更新中にエラーが発生しました');
    } finally {
      setUpdating(null);
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
        currentPage="受注管理"
        onSearch={setSearchQuery}
        searchValue={searchQuery}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p className="text-gray-600">受注データを読み込んでいます...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      currentPage="受注管理"
      onSearch={setSearchQuery}
      searchValue={searchQuery}
      fullWidth={true}
      hideHeaderOnMobile={true}
    >
      <div className="h-full flex flex-col">
        {/* 一括ステータス選択モーダル */}
        {isBulkModalOpen && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-lg font-semibold mb-4">一括ステータス選択</h2>
              <div className="flex flex-col space-y-2">
                {uniqueStatuses.map(status => (
                  <label key={status} className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="bulkStatus"
                      value={status}
                      checked={bulkSelectedStatus === status}
                      onChange={() => setBulkSelectedStatus(status)}
                      className="mr-2"
                    />
                    {status}
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => confirmBulkStatusChange(bulkSelectedStatus)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                >
                  更新する
                </button>
              </div>
            </div>
          </div>
        )}
        {/* フィルターバー */}
        <div className="bg-white border-b border-gray-100 px-4 py-4 flex-shrink-0">
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
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
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

            {/* 会社フィルター */}
            <div className="relative">
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="w-56 px-3 py-2 pr-8 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm appearance-none bg-white"
              >
                <option value="">全ての会社</option>
                {uniqueCompanies.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
              {companyFilter && (
                <button
                  onClick={() => setCompanyFilter('')}
                  className="absolute right-8 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  title="会社フィルターをクリア"
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
              <svg className={`w-4 h-4 inline mr-1 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              更新
            </button>
          </div>
        </div>

        {/* テーブル */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="w-10 py-4 px-3">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedOrders.length === paginatedOrders.length && paginatedOrders.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 min-w-22">
                    <button
                      onClick={() => handleSort('id')}
                      className="flex items-center space-x-1 group hover:text-blue-600 transition-colors"
                    >
                      <span>受注ID</span>
                      {renderSortIcon('id')}
                    </button>
                  </th>
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
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 min-w-50">
                    <button
                      onClick={() => handleSort('company')}
                      className="flex items-center space-x-1 group hover:text-blue-600 transition-colors"
                    >
                      <span>会社名</span>
                      {renderSortIcon('company')}
                    </button>
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 min-w-50">店舗名</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 min-w-30">担当者</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 min-w-64">物件名</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 min-w-24">号室</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 min-w-20">
                    <button onClick={() => handleSort('roomArea')} className="flex items-center space-x-1 group hover:text-blue-600 transition-colors">
                      <span>広さ</span>
                      {renderSortIcon('roomArea')}
                    </button>
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 min-w-64">施工内容</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 min-w-20">鍵</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 min-w-28">
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
                    <td className="py-3 px-3">
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
                      <button 
                        onClick={() => router.push(`/order/${order.id}`)}
                        className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors duration-200"
                      >
                        {order.id}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(order.orderDate).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                      {new Date(order.constructionDate).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{order.company}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{order.store}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{order.contactPerson}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{order.propertyName}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{order.roomNumber}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {order.roomArea ? order.roomArea : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      <div className="flex flex-wrap gap-1">
                        {order.services?.map((service, idx) => (
                          <span key={idx} className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {service}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className="flex items-center" title={order.keyStatus === 'pending' ? '鍵到着済' : '鍵未着'}>
                        <Key className={`h-4 w-4 ${getKeyStatusStyle(order.keyStatus)}`} />
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value as Order['status'])}
                        disabled={updating === order.id}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(order.status)} ${
                          updating === order.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
                        } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                      >
                        {uniqueStatuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
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
                <p className="text-lg font-medium">受注データが見つかりません</p>
                <p className="text-sm mt-1">検索条件を変更するか、新規受注を登録してください</p>
              </div>
            )}
          </div>
        </div>

        {/* 一括操作バー（選択時のみ表示） */}
        {selectedOrders.length > 0 && (
          <div className="bg-orange-50 border-b border-orange-200 px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-orange-700">
                {selectedOrders.length}件を選択中
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={handleBulkStatusChange}
                  disabled={updating === 'bulk'}
                  className={`px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors ${updating === 'bulk' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                >
                  {updating === 'bulk' ? '変更中...' : 'ステータス変更'}
                </button>
                <button
                  onClick={() => setSelectedOrders([])}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  選択解除
                </button>
              </div>
            </div>
          </div>
        )}
        {/* フッター（ページネーション） */}
        <div className="bg-white border-t border-gray-200 px-4 py-4 flex-shrink-0">
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
              {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredOrders.length)} / {filteredOrders.length}件
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 