'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useAuthCheck } from '@/hooks/useAuthCheck';

interface ReportStats {
  totalOrders: number;
  totalRevenue: number;
  completionRate: number;
  averageOrderValue: number;
}

interface MonthlyData {
  month: string;
  orders: number;
  revenue: number;
}

interface CompanyRanking {
  companyName: string;
  orderCount: number;
  totalAmount: number;
  rank: number;
}

interface ConstructionItemStats {
  itemName: string;
  orderCount: number;
  percentage: number;
}

export default function AdminReportsPage() {
  const { isAuthenticated, isCheckingAuth } = useAuthCheck('admin');
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [customDateFrom, setCustomDateFrom] = useState('2025-01');
  const [customDateTo, setCustomDateTo] = useState('2025-12');
  const [stats, setStats] = useState<ReportStats>({
    totalOrders: 0,
    totalRevenue: 0,
    completionRate: 0,
    averageOrderValue: 0
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [companyRankings, setCompanyRankings] = useState<CompanyRanking[]>([]);
  const [itemStats, setItemStats] = useState<ConstructionItemStats[]>([]);

  // データ取得
  const fetchReportData = async () => {
    try {
      setLoading(true);
      console.log('📊 レポートデータ取得開始:', { customDateFrom, customDateTo });
      
      // 統計データの取得
      const statsResponse = await fetch('/api/reports/stats?' + new URLSearchParams({
        dateFrom: customDateFrom,
        dateTo: customDateTo
      }));
      
      console.log('📊 統計API応答:', statsResponse.status);
      
      if (statsResponse.ok) {
        const statsResult = await statsResponse.json();
        console.log('📊 統計API結果:', statsResult);
        if (statsResult.success) {
          setStats(statsResult.data);
        } else {
          console.error('📊 統計API失敗:', statsResult.error);
        }
      } else {
        console.error('📊 統計API HTTP エラー:', statsResponse.status);
      }

      // 月別データの取得
      const monthlyResponse = await fetch('/api/reports/monthly?' + new URLSearchParams({
        dateFrom: customDateFrom,
        dateTo: customDateTo
      }));
      
      if (monthlyResponse.ok) {
        const monthlyResult = await monthlyResponse.json();
        if (monthlyResult.success) {
          setMonthlyData(monthlyResult.data);
        }
      }

      // 会社別ランキングの取得
      const companyResponse = await fetch('/api/reports/company-rankings?' + new URLSearchParams({
        dateFrom: customDateFrom,
        dateTo: customDateTo
      }));
      
      if (companyResponse.ok) {
        const companyResult = await companyResponse.json();
        if (companyResult.success) {
          setCompanyRankings(companyResult.data);
        }
      }

      // 施工項目別統計の取得
      const itemResponse = await fetch('/api/reports/construction-items?' + new URLSearchParams({
        dateFrom: customDateFrom,
        dateTo: customDateTo
      }));
      
      if (itemResponse.ok) {
        const itemResult = await itemResponse.json();
        if (itemResult.success) {
          setItemStats(itemResult.data);
        }
      }

    } catch (error) {
      console.error('レポートデータ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [customDateFrom, customDateTo]);

  const formatCurrency = (amount: number) => {
    return '¥' + amount.toLocaleString();
  };

  const formatPercentage = (value: number) => {
    return value.toFixed(1) + '%';
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
        currentPage="レポート"
        onSearch={setSearchQuery}
        searchValue={searchQuery}
      >
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p className="text-gray-600">レポートデータを読み込んでいます...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      currentPage="レポート"
      onSearch={setSearchQuery}
      searchValue={searchQuery}
    >
      <div className="space-y-6">
        {/* 期間選択フィルター */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">期間設定</h2>
              <p className="text-sm text-gray-500">データを表示する期間を選択してください</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="month"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm w-40"
                />
              </div>
              <span className="text-gray-400">〜</span>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="month"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm w-40"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 総受注件数 */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 flex items-start">
              <div className="rounded-xl bg-blue-50 p-3 mr-4">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">総受注件数</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalOrders.toLocaleString()}件</p>
                <p className="text-xs text-gray-400 mt-1">完了率: {formatPercentage(stats.completionRate)}</p>
              </div>
            </div>
          </div>

          {/* 総売上 */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 flex items-start">
              <div className="rounded-xl bg-green-50 p-3 mr-4">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">総売上</p>
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-xs text-gray-400 mt-1">前期比較は今後実装予定</p>
              </div>
            </div>
          </div>

          {/* 平均受注額 */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 flex items-start">
              <div className="rounded-xl bg-orange-50 p-3 mr-4">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">平均受注額</p>
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.averageOrderValue)}</p>
                <p className="text-xs text-gray-400 mt-1">1件あたりの平均売上</p>
              </div>
            </div>
          </div>
        </div>

        {/* 月別売上・受注グラフ */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">月別売上・受注推移</h3>
          {monthlyData.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="min-w-full">
                <div className="flex items-end space-x-2 h-64 px-4">
                  {monthlyData.map((data, index) => {
                    const maxRevenue = Math.max(...monthlyData.map(d => d.revenue));
                    const height = maxRevenue > 0 ? (data.revenue / maxRevenue) * 200 : 0;
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="mb-2 text-center">
                          <div className="text-xs text-gray-600">{data.orders}件</div>
                          <div className="text-xs text-gray-500">{formatCurrency(data.revenue)}</div>
                        </div>
                        <div 
                          className="bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg w-full min-h-[4px] transition-all duration-500 hover:shadow-lg"
                          style={{ height: `${height}px` }}
                          title={`${data.month}: ${data.orders}件 / ${formatCurrency(data.revenue)}`}
                        />
                        <div className="mt-2 text-xs text-gray-600 transform rotate-45 whitespace-nowrap">
                          {data.month}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-gray-500">表示するデータがありません</p>
                <p className="text-gray-400 text-sm mt-2">期間を変更して再度お試しください</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 会社別実績テーブル */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">会社別実績ランキング</h3>
            {companyRankings.length > 0 ? (
              <div className="space-y-3">
                {companyRankings.slice(0, 10).map((company, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                        {company.rank}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{company.companyName}</div>
                        <div className="text-sm text-gray-500">{company.orderCount}件の受注</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-800">{formatCurrency(company.totalAmount)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="text-gray-500">表示するデータがありません</p>
                  <p className="text-gray-400 text-sm mt-2">期間を変更して再度お試しください</p>
                </div>
              </div>
            )}
          </div>

          {/* 施工項目別分析 */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">施工項目別需要</h3>
            {itemStats.length > 0 ? (
              <div className="space-y-4">
                {itemStats.slice(0, 8).map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-24 text-sm text-gray-600 truncate mr-3">
                      {item.itemName}
                    </div>
                    <div className="flex-1 mx-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 text-right">
                      <div className="text-sm font-medium text-gray-800">{item.orderCount}件</div>
                      <div className="text-xs text-gray-500">{formatPercentage(item.percentage)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500">表示するデータがありません</p>
                  <p className="text-gray-400 text-sm mt-2">期間を変更して再度お試しください</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 