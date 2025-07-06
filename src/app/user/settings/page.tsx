'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserInfo {
  id: string;
  role: 'admin' | 'user';
  companyName: string;
  storeName: string;
  email: string;
  phoneNumber: string;
  address: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

export default function UserSettingsPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  
  // アカウント基本情報のstate
  const [accountInfo, setAccountInfo] = useState({
    companyName: '',
    storeName: '',
    email: '',
    phoneNumber: '',
    address: ''
  });
  
  // エラー状態
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ナビゲーション項目（ユーザー用）
  const navItems = [
    { 
      name: '案件管理',
      href: '/user/orders',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    { 
      name: '新規発注', 
      href: '/user/new-order',
      icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6'
    },
    { 
      name: 'アカウント設定',
      href: '/user/settings',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      active: true
    }
  ];

  // 現在のユーザー情報取得
  const fetchUserInfo = async () => {
    try {
      setLoading(true);
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const currentUserId = currentUser.id || 'USER002';
      
      const response = await fetch('/api/users');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const user = result.data.find((u: UserInfo) => u.id === currentUserId);
          if (user) {
            setUserInfo(user);
            setAccountInfo({
              companyName: user.companyName,
              storeName: user.storeName,
              email: user.email,
              phoneNumber: user.phoneNumber,
              address: user.address
            });
          }
        }
      }
    } catch (error) {
      console.error('ユーザー情報取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  // 入力値の変更処理
  const handleInputChange = (field: string, value: string) => {
    setAccountInfo(prev => ({
      ...prev,
      [field]: value
    }));
    
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // 保存処理
  const handleSave = async () => {
    // バリデーション
    const newErrors: Record<string, string> = {};
    
    if (!accountInfo.email || !accountInfo.phoneNumber || !accountInfo.address) {
      if (!accountInfo.email) newErrors.email = 'メールアドレスは必須項目です。';
      if (!accountInfo.phoneNumber) newErrors.phoneNumber = '電話番号は必須項目です。';
      if (!accountInfo.address) newErrors.address = '住所は必須項目です。';
      
      setErrors(newErrors);
      return;
    }

    // メールアドレスの簡単なバリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(accountInfo.email)) {
      setErrors({ email: '有効なメールアドレスを入力してください。' });
      return;
    }

    try {
      if (!userInfo) return;

      setSaving(true);
      
      // 実際のAPI呼び出し
      const response = await fetch('/api/users/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userInfo.id,
          companyName: accountInfo.companyName,
          storeName: accountInfo.storeName,
          email: accountInfo.email,
          phoneNumber: accountInfo.phoneNumber,
          address: accountInfo.address
        })
      });

      const result = await response.json();

      if (result.success) {
        // サーバーから返された最新データでユーザー情報を更新
        setUserInfo(result.data);
        
        // フォームデータも最新情報で更新
        setAccountInfo({
          companyName: result.data.companyName,
          storeName: result.data.storeName,
          email: result.data.email,
          phoneNumber: result.data.phoneNumber,
          address: result.data.address
        });
        
        // ローカルストレージのユーザー情報も更新
        localStorage.setItem('user', JSON.stringify(result.data));
        
        // 編集モードを解除
        setIsEditMode(false);
        
        // 成功メッセージを表示
        setShowSuccessMessage(true);
        
        // 3秒後にメッセージを非表示
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 3000);
      } else {
        // APIエラーの場合
        alert(result.error || '更新中にエラーが発生しました');
      }
    } catch (error) {
      console.error('情報更新エラー:', error);
      alert('ネットワークエラーが発生しました。再度お試しください。');
    } finally {
      setSaving(false);
    }
  };
  
  // 編集キャンセル
  const handleCancel = () => {
    // 編集モードを解除
    setIsEditMode(false);
    
    // 元の値に戻す
    if (userInfo) {
      setAccountInfo({
        companyName: userInfo.companyName,
        storeName: userInfo.storeName,
        email: userInfo.email,
        phoneNumber: userInfo.phoneNumber,
        address: userInfo.address
      });
    }
    
    // エラーをクリア
    setErrors({});
  };

  // ログアウト処理
  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-gray-600">アカウント情報を読み込んでいます...</p>
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
        {/* ヘッダー */}
        <header className="bg-white shadow-sm border-b border-gray-100 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              {!isEditMode ? (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-200 font-medium shadow-sm"
                >
                  編集
                </button>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2 bg-white text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-200 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <div className="flex items-center">
                        <svg className="animate-spin h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        保存中...
                      </div>
                    ) : (
                      '保存'
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-800">
                  {userInfo?.companyName || 'ユーザー'}
                </div>
                <div className="text-xs text-gray-500">
                  {userInfo?.storeName || ''}
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

        {/* スクロールコンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* 成功メッセージ */}
            {showSuccessMessage && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                変更内容が正常に更新されました
              </div>
            )}
            
            {/* 基本情報設定 */}
            <section>
              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <svg className="w-6 h-6 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    基本情報
                  </h2>
                  <p className="text-sm text-gray-600 mt-2">アカウントの基本情報を管理します</p>
                </div>

                <div className="space-y-6">
                  {/* 会社名（読み取り専用） */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">会社名</label>
                    <div className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-600">
                      {accountInfo.companyName}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">※ 会社名は変更できません</p>
                  </div>

                  {/* 店舗名（読み取り専用） */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">店舗名</label>
                    <div className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-600">
                      {accountInfo.storeName}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">※ 店舗名は変更できません</p>
                  </div>

                  {/* メールアドレス・電話番号 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                        value={accountInfo.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border ${
                          errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
                        placeholder="example@company.co.jp"
                        disabled={!isEditMode}
                        required
                      />
                      {errors.email && (
                        <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                      )}
            </div>

            <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        電話番号 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                        value={accountInfo.phoneNumber}
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border ${
                          errors.phoneNumber ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
                        placeholder="03-1234-5678"
                        disabled={!isEditMode}
                        required
                      />
                      {errors.phoneNumber && (
                        <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>
                      )}
                    </div>
            </div>

                  {/* 住所（編集可能） */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      住所 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                      value={accountInfo.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border ${
                        errors.address ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
                      placeholder="東京都新宿区..."
                      disabled={!isEditMode}
                      required
                    />
                    {errors.address && (
                      <p className="text-red-500 text-xs mt-1">{errors.address}</p>
              )}
          </div>
        </div>

                {/* 注意事項 */}
                <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
            <div>
                      <h4 className="text-sm font-semibold text-blue-800 mb-1">重要事項</h4>
                      <p className="text-sm text-blue-700">
                        • メールアドレス、電話番号、住所は必須項目です<br/>
                        • メールアドレスは各種通知の送信先として使用されます<br/>
                        • 会社名、店舗名の変更が必要な場合は管理者にお問い合わせください
                      </p>
            </div>
            </div>
            </div>
            </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 