'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Key } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

interface ArchiveOrder {
  id: string;
  userId: string;
  contactPerson: string;
  constructionDate: string;
  propertyName: string;
  roomNumber: string;
  roomArea?: number;
  address: string;
  keyLocation: string;
  keyReturn: string;
  keyStatus?: 'pending' | 'handed';
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  services: string[];
  archivedAt: string; // 入金日
  totalAmount: number; // 請求額
  company?: string;
  store?: string;
}

interface User {
  id: string;
  companyName: string;
  storeName: string;
}

export default function ArchivePage() {
  const router = useRouter();
  const [shouldFetch, setShouldFetch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const { data: archiveRaw, error, mutate } = useSWR(
    shouldFetch ? '/api/orders/archive' : null,
    fetcher
  );
  const { data: usersRaw } = useSWR('/api/users', fetcher);

  const archiveData = archiveRaw?.success ? archiveRaw.data as ArchiveOrder[] : [];
  const usersData = usersRaw?.success ? usersRaw.data as User[] : [];

  // マージして会社・店舗名を付与
  const orders = archiveData.map(order => {
    const user = usersData.find(u => u.id === order.userId);
    return {
      ...order,
      company: user?.companyName || '',
      store: user?.storeName || ''
    };
  });

  // フィルター・ソート状態
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterFrom, setDateFilterFrom] = useState('');
  const [dateFilterTo, setDateFilterTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleRefresh = async () => {
    setShouldFetch(true);
    setRefreshing(true);
    await mutate();
    setRefreshing(false);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateFilterFrom('');
    setDateFilterTo('');
    setStatusFilter('');
    setCompanyFilter('');
    setStoreFilter('');
  };

  // ソート関数
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSorted = (list: ArchiveOrder[]) => {
    if (!sortField) return list;
    return [...list].sort((a, b) => {
      let aVal: any = (a as any)[sortField];
      let bVal: any = (b as any)[sortField];
      if (sortField === 'archivedAt') {
        aVal = new Date(a.archivedAt);
        bVal = new Date(b.archivedAt);
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // フィルター適用
  const filtered = getSorted(orders).filter(order => {
    const date = new Date(order.archivedAt);
    const from = dateFilterFrom ? new Date(dateFilterFrom) : null;
    const to = dateFilterTo ? new Date(dateFilterTo) : null;
    const dateMatch = (!from || date >= from) && (!to || date <= to);
    const textMatch =
      searchQuery === '' ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());
    const statusMatch = !statusFilter || order.status === statusFilter;
    const companyMatch = !companyFilter || order.company === companyFilter;
    const storeMatch = !storeFilter || order.store === storeFilter;
    return dateMatch && textMatch && statusMatch && companyMatch && storeMatch;
  });

  // ページネーション
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ユニークリスト
  const uniqueCompanies = [...new Set(orders.map(o => o.company).filter(Boolean))].sort() as string[];
  const uniqueStores = [...new Set(orders.map(o => o.store).filter(Boolean))].sort() as string[];
  const uniqueStatuses = Array.from(new Set(orders.map(o => o.status))).sort();

  return (
    <AdminLayout currentPage="アーカイブ" onSearch={setSearchQuery} searchValue={searchQuery} fullWidth={true} hideHeaderOnMobile={true}>
      <div className="h-full flex flex-col">
        {/* フィルターバー */}
        <div className="bg-white border-b border-gray-100 px-4 py-4 flex-shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            {/* 入金日フィルター */}
            <div className="flex items-center gap-2 relative">
              <label className="text-sm font-medium text-gray-700">入金日</label>
              <input
                type="date"
                value={dateFilterFrom}
                onChange={e => setDateFilterFrom(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
              <span className="text-gray-500">〜</span>
              <input
                type="date"
                value={dateFilterTo}
                onChange={e => setDateFilterTo(e.target.value)}
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
            {/* 会社フィルター */}
            <div className="relative">
              <select
                value={companyFilter}
                onChange={e => setCompanyFilter(e.target.value)}
                className="w-56 px-3 py-2 pr-8 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm appearance-none bg-white"
              >
                <option value="">全ての会社</option>
                {uniqueCompanies.map(c => (
                  <option key={c} value={c}>{c}</option>
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
            {/* 店舗フィルター */}
            <div className="relative">
              <select
                value={storeFilter}
                onChange={e => setStoreFilter(e.target.value)}
                className="w-56 px-3 py-2 pr-8 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm appearance-none bg-white"
              >
                <option value="">全ての店舗</option>
                {uniqueStores.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {storeFilter && (
                <button
                  onClick={() => setStoreFilter('')}
                  className="absolute right-8 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  title="店舗フィルターをクリア"
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
          <div className="h-full overflow-y-auto text-sm">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="py-2 px-2 text-left text-sm font-semibold">受注ID</th>
                  <th className="py-2 px-2 text-left text-sm font-semibold">入金日</th>
                  <th className="py-2 px-2 text-left text-sm font-semibold">施工日</th>
                  <th className="py-2 px-2 text-left text-sm font-semibold">会社名</th>
                  <th className="py-2 px-2 text-left text-sm font-semibold">店舗名</th>
                  <th className="py-2 px-2 text-left text-sm font-semibold">担当者</th>
                  <th className="py-2 px-2 text-left text-sm font-semibold">物件名</th>
                  <th className="py-2 px-2 text-left text-sm font-semibold">号室</th>
                  <th className="py-2 px-2 text-left text-sm font-semibold">広さ</th>
                  <th className="py-2 px-2 text-left text-sm font-semibold">施工内容</th>
                  <th className="py-2 px-2 text-left text-sm font-semibold">請求額</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginated.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="py-2 px-2 text-gray-900">{order.id}</td>
                    <td className="py-2 px-2">{new Date(order.archivedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                    <td className="py-2 px-2">{new Date(order.constructionDate).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                    <td className="py-2 px-2 text-gray-900">{order.company}</td>
                    <td className="py-2 px-2">{order.store}</td>
                    <td className="py-2 px-2">{order.contactPerson}</td>
                    <td className="py-2 px-2">{order.propertyName}</td>
                    <td className="py-2 px-2">{order.roomNumber}</td>
                    <td className="py-2 px-2">{order.roomArea ?? '-'}</td>
                    <td className="py-2 px-2">
                      <div className="flex flex-wrap gap-1">
                        {order.services.map((s, i) => <span key={i} className="px-2 py-1 bg-gray-100 rounded text-xs">{s}</span>)}
                      </div>
                    </td>
                    <td className="py-2 px-2">¥{order.totalAmount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {paginated.length === 0 && (
              <div className="text-center py-16 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium">アーカイブデータが見つかりません</p>
                <p className="text-sm mt-1">条件を指定するか､更新ボタンをクリックしてください｡</p>
              </div>
            )}
          </div>
        </div>

        {/* フッター：表示範囲／総件数／合計請求額の表示 */}
        <div className="bg-white border-t border-gray-200 px-4 py-4 flex items-center justify-between text-sm text-gray-700">
          {/* 表示範囲と総件数 */}
          <span>
            {`${(currentPage - 1) * itemsPerPage + 1} - ${(currentPage - 1) * itemsPerPage + paginated.length} / ${filtered.length} 件`}
          </span>
          {/* 合計請求額 */}
          <span>
            {`合計請求額：¥${filtered.reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()}`}
          </span>
        </div>
      </div>
    </AdminLayout>
  );
} 