'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { validateNewOrderForm } from '@/utils/validation';
import { NewOrderForm, ValidationErrors, ConstructionItem } from '@/types';
import { DEFAULT_CONSTRUCTION_ITEMS } from '@/utils/constants';

export default function NewOrderPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [constructionItems, setConstructionItems] = useState<ConstructionItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [constructionItemsLoading, setConstructionItemsLoading] = useState(true);
  
  const [formData, setFormData] = useState<NewOrderForm>({
    contactPerson: '',
    propertyName: '',
    roomNumber: '',
    roomArea: undefined as number | undefined,
    address: '',
    constructionDate: '',
    keyLocation: '',
    keyReturn: '',
    status: '日程待ち',
    notes: '',
    constructionItems: []
  });
  const [errors, setErrors] = useState<ValidationErrors>({});

  // ログインユーザー情報の取得
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setCurrentUser(parsedUser);
        console.log('📱 ログインユーザー情報:', parsedUser);
        setUserLoading(false);
      } catch (error) {
        console.error('ユーザー情報の取得に失敗:', error);
        router.push('/login');
      }
    } else {
      console.warn('ユーザー情報がありません。ログインページに移動します。');
      router.push('/login');
    }
  }, [router]);

  // 施工項目の取得
  useEffect(() => {
    const loadConstructionItems = async () => {
      try {
        console.log('🔄 施工項目データを取得中...');
        const response = await fetch('/api/construction-items');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          console.log('✅ 施工項目データ取得成功:', result.data);
          setConstructionItems(result.data);
          
          // フォールバックデータを使用している場合の警告表示
          if (result.fallback) {
            setErrors(prev => ({ 
              ...prev, 
              constructionItems: result.message || 'Google Sheetsに接続できないため、デフォルトデータを使用しています。' 
            }));
          }
        } else {
          console.error('❌ 施工項目データ取得失敗:', result.error);
          // フォールバック: constants.tsのデータを使用
          const fallbackItems = DEFAULT_CONSTRUCTION_ITEMS.map(item => ({
            ...item,
            createdAt: '2025-01-01T00:00:00Z'
          }));
          setConstructionItems(fallbackItems);
          setErrors(prev => ({ ...prev, constructionItems: '施工項目データの取得に失敗しました。デフォルトデータを使用します。' }));
        }
      } catch (error) {
        console.error('❌ 施工項目データ取得エラー:', error);
        // フォールバック: constants.tsのデータを使用
        const fallbackItems = DEFAULT_CONSTRUCTION_ITEMS.map(item => ({
      ...item,
      createdAt: '2025-01-01T00:00:00Z'
    }));
        setConstructionItems(fallbackItems);
        setErrors(prev => ({ ...prev, constructionItems: 'ネットワークエラーのため、デフォルトデータを使用します。' }));
      } finally {
        setConstructionItemsLoading(false);
      }
    };

    loadConstructionItems();
  }, []);

  // 自動保存機能
  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      if (formData.propertyName || formData.roomNumber || formData.address) {
        console.log('自動保存中...', formData);
        setLastSaved(new Date().toLocaleTimeString());
      }
    }, 3000);

    return () => clearTimeout(autoSaveTimer);
  }, [formData]);

  // 部屋の広さから価格オプションを判定
  const getAreaOptionFromSize = (roomArea?: number) => {
    if (roomArea === undefined) return undefined;
    if (roomArea < 30) return '30㎡未満';
    if (roomArea < 50) return '30㎡以上50㎡未満';
    return '50㎡以上';
  };

  // 広さ変更時に選択済み項目の価格を自動更新
  useEffect(() => {
    if (formData.roomArea === undefined) return;
    setFormData(prev => ({
      ...prev,
      constructionItems: prev.constructionItems.map(orderItem => {
        const ci = constructionItems.find(ci => ci.id === orderItem.itemId);
        if (ci?.hasAreaSelection && ci.priceOptions) {
          const areaOption = getAreaOptionFromSize(formData.roomArea);
          const matched = ci.priceOptions.find(opt => opt.label === areaOption);
          return {
            ...orderItem,
            selectedAreaOption: areaOption,
            priceOverride: matched ? matched.price : orderItem.priceOverride
          };
        }
        return orderItem;
      })
    }));
  }, [formData.roomArea, constructionItems]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleConstructionItemChange = (itemId: string, checked: boolean, quantity: number = 1) => {
    const constructionItem = constructionItems.find(item => item.id === itemId);
    const defaultPrice = constructionItem?.price || 0;
    // 広さに応じた価格オプション
    let areaOption: string | undefined = undefined;
    let priceOverride: number = defaultPrice;
    if (constructionItem?.hasAreaSelection && constructionItem.priceOptions) {
      areaOption = formData.roomArea ? getAreaOptionFromSize(formData.roomArea) : constructionItem.priceOptions[0]?.label;
      const matched = constructionItem.priceOptions.find(opt => opt.label === areaOption);
      priceOverride = matched ? matched.price : defaultPrice;
    }

    setFormData(prev => {
      const newItems = checked
        ? [...prev.constructionItems, { 
            itemId,
            quantity,
            selectedAreaOption: areaOption,
            priceOverride: priceOverride
          }]
        : prev.constructionItems.filter(item => item.itemId !== itemId);
      
      return {
        ...prev,
        constructionItems: newItems
      };
    });

    if (errors.constructionItems) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.constructionItems;
        return newErrors;
      });
    }
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setFormData(prev => ({
      ...prev,
      constructionItems: prev.constructionItems.map(item =>
        item.itemId === itemId ? { ...item, quantity } : item
      )
    }));
  };

  const handleAreaOptionChange = (itemId: string, selectedOption: string) => {
    const constructionItem = constructionItems.find(item => item.id === itemId);
    const selectedPriceOption = constructionItem?.priceOptions?.find(option => option.label === selectedOption);
    
    setFormData(prev => ({
      ...prev,
      constructionItems: prev.constructionItems.map(item =>
        item.itemId === itemId ? { 
          ...item, 
          selectedAreaOption: selectedOption,
          priceOverride: selectedPriceOption?.price || 0
        } : item
      )
    }));
  };

  const handleSubmit = async () => {
    if (!currentUser || !currentUser.id) {
      setErrors({ general: 'ユーザー情報が取得できません。再度ログインしてください。' });
      return;
    }

    const validationErrors = validateNewOrderForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      console.log('📝 新規発注データ送信中:', formData);
      
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.id,
          contactPerson: formData.contactPerson,
          propertyName: formData.propertyName,
          roomNumber: formData.roomNumber,
          roomArea: formData.roomArea,
          address: formData.address,
          constructionDate: formData.constructionDate,
          keyLocation: formData.keyLocation,
          keyReturn: formData.keyReturn,
          status: formData.status,
          notes: formData.notes,
          constructionItems: formData.constructionItems
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ 発注完了:', result.data);
        setSubmitStatus('success');
        setLastSaved(new Date().toLocaleTimeString());
        
        setTimeout(() => {
          router.push('/user');
        }, 3000);
      } else {
        console.error('❌ 発注失敗:', result.error);
        setErrors({ general: '発注に失敗しました: ' + result.error });
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('❌ 発注エラー:', error);
      setErrors({ general: '発注に失敗しました。ネットワークエラーの可能性があります。' });
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (formData.propertyName || formData.roomNumber || formData.address) {
      if (confirm('入力内容が失われますが、キャンセルしますか？')) {
        router.push('/user');
      }
    } else {
      router.push('/user');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const isItemSelected = (itemId: string) => {
    return formData.constructionItems.some(item => item.itemId === itemId);
  };

  const getItemQuantity = (itemId: string) => {
    const item = formData.constructionItems.find(item => item.itemId === itemId);
    return item ? item.quantity : 1;
  };

  const calculateTotal = () => {
    return formData.constructionItems.reduce((total, orderItem) => {
      const item = constructionItems.find(ci => ci.id === orderItem.itemId);
      if (!item) return total;
      // 広さに応じた単価取得
      let unitPrice = item.price;
      if (item.hasAreaSelection && item.priceOptions && formData.roomArea !== undefined) {
        const areaOption = getAreaOptionFromSize(formData.roomArea);
        const matched = item.priceOptions.find(opt => opt.label === areaOption);
        unitPrice = matched ? matched.price : unitPrice;
      }
      return total + unitPrice * orderItem.quantity;
    }, 0);
  };

  // ナビゲーション項目（ユーザー用）
  const navItems = [
    { 
      name: '案件管理',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      href: '/user/orders'
    },
    { 
      name: '新規発注', 
      icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
      active: true,
      href: '/user/new-order'
    },
    { 
      name: 'アカウント設定',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      href: '/user/settings'
    }
  ];

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

          {/* その他のナビゲーション */}
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
            <div className="flex items-center space-x-4">
              {/* 自動保存ステータス */}
              {lastSaved && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                  最終保存: {lastSaved}
                </span>
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

        {/* ステータスメッセージ */}
        {submitStatus && (
          <div className={`mx-6 mt-4 p-4 rounded-xl ${
            submitStatus === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          } flex items-center`}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {submitStatus === 'success' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
              </svg>
            {submitStatus === 'success' ? '発注が正常に保存されました' : 'エラーが発生しました。入力内容を確認してください。'}
            </div>
          )}

        {/* フォームコンテンツ */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* コンテンツ: スクロール可能な３列レイアウト */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex space-x-6">
              {/* 基本情報 */}
              <div className="w-1/3 bg-white rounded-3xl shadow-lg border border-gray-100 p-6 overflow-y-auto pb-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  基本情報
                </h3>
                <div className="space-y-4">
                  {/* 担当者名 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      担当者名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="contactPerson"
                      value={formData.contactPerson}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-xl border ${
                        errors.contactPerson ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
                      placeholder="例: 田中"
                      required
                    />
                    {errors.contactPerson && (
                      <p className="text-red-500 text-xs mt-1">{errors.contactPerson}</p>
                    )}
                  </div>
                  {/* 住所 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      住所 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-xl border ${
                        errors.address ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
                      placeholder="物件の住所を入力"
                      required
                    />
                    {errors.address && (
                      <p className="text-red-500 text-xs mt-1">{errors.address}</p>
                    )}
                  </div>
                  {/* 物件名 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      物件名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="propertyName"
                      value={formData.propertyName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-xl border ${
                        errors.propertyName ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
                      placeholder="マンション名を入力"
                      required
                    />
                    {errors.propertyName && (
                      <p className="text-red-500 text-xs mt-1">{errors.propertyName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      号室 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="roomNumber"
                      value={formData.roomNumber}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-xl border ${
                        errors.roomNumber ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
                      placeholder="例: 101"
                      required
                    />
                    {errors.roomNumber && (
                      <p className="text-red-500 text-xs mt-1">{errors.roomNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      広さ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="roomArea"
                      min="0"
                      step="0.1"
                      value={formData.roomArea !== undefined ? formData.roomArea : ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, roomArea: e.target.value ? parseFloat(e.target.value) : undefined }))}
                      className={`w-full px-3 py-2 rounded-xl border ${
                        errors.roomArea ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
                      placeholder="例: 25.5"
                      required
                    />
                    {errors.roomArea && (
                      <p className="text-red-500 text-xs mt-1">{errors.roomArea}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      施工予定日 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="constructionDate"
                      value={formData.constructionDate}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-xl border ${
                        errors.constructionDate ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
                      required
                    />
                    {errors.constructionDate && (
                      <p className="text-red-500 text-xs mt-1">{errors.constructionDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ステータス <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-xl border ${
                        errors.status ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
                      required
                    >
                      <option value="日程待ち">日程待ち</option>
                      <option value="日程確定">日程確定</option>
                    </select>
                    {errors.status && (
                      <p className="text-red-500 text-xs mt-1">{errors.status}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      鍵の所在 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="keyLocation"
                      value={formData.keyLocation}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-xl border ${
                        errors.keyLocation ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
                      placeholder="鍵の保管場所を入力"
                      required
                    />
                    {errors.keyLocation && (
                      <p className="text-red-500 text-xs mt-1">{errors.keyLocation}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      鍵の返却先 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="keyReturn"
                      value={formData.keyReturn}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-xl border ${
                        errors.keyReturn ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
                      placeholder="鍵の返却先を入力"
                      required
                    />
                    {errors.keyReturn && (
                      <p className="text-red-500 text-xs mt-1">{errors.keyReturn}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">連絡事項</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                      placeholder="施工に関する特記事項や連絡事項があれば入力してください"
                    />
                  </div>
                </div>
              </div>
              {/* 施工依頼項目 */}
              <div className="w-1/3 bg-white rounded-3xl shadow-lg border border-gray-100 p-6 overflow-y-auto pb-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  施工依頼項目
                  {constructionItemsLoading && (
                    <svg className="animate-spin ml-2 h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </h3>
                {errors.constructionItems && (
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 text-sm">
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.854-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    {errors.constructionItems}
                  </div>
                )}

                {constructionItemsLoading ? (
                  <div className="space-y-3">
                    {[...Array(6)].map((_, index) => (
                      <div key={index} className="p-3 rounded-xl border-2 border-gray-200 animate-pulse">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-5 h-5 bg-gray-200 rounded"></div>
                            <div className="ml-3 h-4 bg-gray-200 rounded w-32"></div>
                          </div>
                          <div className="h-6 bg-gray-200 rounded w-20"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                  {constructionItems.map((item) => {
                    // 動的価格判定
                    const displayPrice = (() => {
                      let price = item.price;
                      if (item.hasAreaSelection && item.priceOptions && formData.roomArea !== undefined) {
                        const areaOption = getAreaOptionFromSize(formData.roomArea);
                        const matched = item.priceOptions.find(opt => opt.label === areaOption);
                        price = matched ? matched.price : price;
                      }
                      if (item.hasQuantity && isItemSelected(item.id)) {
                        price *= getItemQuantity(item.id);
                      }
                      return price;
                    })();
                    
                    return (
              <div
                key={item.id}
                          className={`p-3 rounded-xl border-2 transition-all min-h-[110px] ${
                    isItemSelected(item.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={isItemSelected(item.id)}
                                onChange={(e) => handleConstructionItemChange(item.id, e.target.checked)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 mt-1"
                                disabled={isSubmitting}
                              />
                              <span className="font-semibold text-gray-800 text-sm">{item.name}</span>
                              {item.hasQuantity && isItemSelected(item.id) && (
                                <input
                                  type="number"
                                  min="1"
                                  value={getItemQuantity(item.id)}
                                  onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                                  className="ml-4 w-16 px-2 py-1 border rounded-xl text-sm"
                                  disabled={isSubmitting}
                                />
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                  <span className="text-lg font-bold text-blue-600">
                                    ¥{displayPrice.toLocaleString()}
                                  </span>
                            </div>
                          </div>
                          {/* 注釈: 広さ別価格 */}
                          {item.hasAreaSelection && formData.roomArea !== undefined && (
                            <div className="mt-2 text-xs text-gray-500">
                              <div>※部屋の広さに応じて､価格が異なります｡</div>
                              <div>({getAreaOptionFromSize(formData.roomArea)}): ¥{(() => {
                                const areaOpt = getAreaOptionFromSize(formData.roomArea);
                                const matched = item.priceOptions?.find(opt => opt.label === areaOpt);
                                return (matched?.price || displayPrice).toLocaleString();
                              })()}</div>
                            </div>
                          )}
                          {item.name === 'エアコンクリーニング' && (
                            <div className="mt-2 text-xs text-gray-500">※台数を指定してください。</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 合計金額表示 */}
                {formData.constructionItems.length > 0 && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-800">合計金額</span>
                      <span className="text-xl font-bold text-green-600">
                        ¥{calculateTotal().toLocaleString()}
                    </span>
                    </div>
                  </div>
                )}
              </div>
              {/* 発注元情報 */}
              <div className="w-1/3 bg-white rounded-3xl shadow-lg border border-gray-100 p-6 overflow-y-auto pb-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  発注元情報
                </h3>
                <div className="space-y-4">
                  {/* 会社名, 店舗名, メールアドレス, ヒントメッセージをここに挿入 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">会社名</label>
                    <input
                      type="text"
                      value={currentUser?.companyName || ''}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">店舗名</label>
                    <input
                      type="text"
                      value={currentUser?.storeName || ''}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">メールアドレス</label>
                    <input
                      type="email"
                      value={currentUser?.email || ''}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed"
                      readOnly
                    />
                  </div>

                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <p className="text-xs text-gray-600">
                      💡 発注元情報はアカウント情報から自動入力されます。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* フッター (ヘッダーと同じ高さ) */}
          <footer className="bg-white shadow-sm border-t border-gray-100 px-6 py-4 flex-shrink-0">
            <div className="flex justify-end space-x-4">
              {/* キャンセル・発注登録ボタン */}
              <button
                type="button"
                onClick={handleCancel}
                className="px-8 py-3 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-xl transition-all duration-200 font-semibold"
                disabled={isSubmitting}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || userLoading || !currentUser}
                      className={`px-8 py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center ${
                isSubmitting || userLoading || !currentUser
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600'
              }`}
              >
                {isSubmitting && (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {isSubmitting ? '登録中...' : '発注登録'}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
} 