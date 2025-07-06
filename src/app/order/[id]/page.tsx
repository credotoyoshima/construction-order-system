'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ChatComponent from '@/components/ChatComponent';
import { 
  ArrowLeft,
  Calendar, 
  MapPin, 
  User, 
  Building,
  Key,
  FileText,
  MessageSquare,
  RefreshCw,
  Save,
  Clock,
  CheckCircle,
  AlertCircle,
  Package,
  Edit3,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { ChatMessage } from '@/types';

interface Order {
  id: string;
  userId: string;
  contactPerson: string;
  orderDate: string;
  constructionDate: string;
  propertyName: string;
  roomNumber: string;
  address: string;
  roomArea?: number; // 部屋の広さ（㎡）
  keyLocation: string;
  keyReturn: string;
  keyStatus?: 'pending' | 'handed';
  status: '日程待ち' | '日程確定' | '施工完了' | '請求済み' | '入金済み' | '依頼キャンセル';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface UserInfo {
  id: string;
  companyName: string;
  storeName: string;
  email: string;
  phoneNumber: string;
  address: string;
}

interface ConstructionItem {
  id: string;
  name: string;
  price: number;
  active: boolean;
  hasQuantity?: boolean;
  hasAreaSelection?: boolean;
  priceOptions?: { label: string; price: number; }[];
}

interface OrderItem {
  id: string;
  orderId: string;
  itemId: string;
  quantity: number;
  price: number;
  selectedAreaOption?: string;
  constructionItem?: ConstructionItem;
}



export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [constructionItems, setConstructionItems] = useState<ConstructionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'chat'>('details');
  const [currentUser, setCurrentUser] = useState<{ 
    id: string;
    companyName: string;
    storeName: string;
    role: 'admin' | 'user';
  } | null>(null);

  // 編集用のフォームデータ
  const [editForm, setEditForm] = useState({
    propertyName: '',
    roomNumber: '',
    address: '',
    roomArea: undefined as number | undefined,
    constructionDate: '',
    keyLocation: '',
    keyReturn: '',
    notes: '',
    contactPerson: '',
    status: '日程待ち' as Order['status']
  });

  // 施工項目編集用
  const [editOrderItems, setEditOrderItems] = useState<{
    itemId: string;
    quantity: number;
    selectedAreaOption?: string;
  }[]>([]);

  // 未読チャット数取得
  const { data: chatData } = useSWR<{
    success: boolean;
    data: { messages: ChatMessage[]; unreadCount: number };
  }>(
    currentUser ? `/api/chat/${orderId}?userId=${currentUser.id}` : null,
    fetcher,
    { refreshInterval: 15000 }
  );
  const unreadCount = chatData?.success ? chatData.data.unreadCount : 0;

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [ordersResponse, usersResponse, constructionItemsResponse] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/users'),
        fetch('/api/construction-items')
      ]);

      if (ordersResponse.ok) {
        const ordersResult = await ordersResponse.json();
        if (ordersResult.success) {
          const foundOrder = ordersResult.data.find((o: Order) => o.id === orderId);
          if (foundOrder) {
            setOrder(foundOrder);
            setEditForm({
              propertyName: foundOrder.propertyName,
              roomNumber: foundOrder.roomNumber,
              address: foundOrder.address,
              roomArea: foundOrder.roomArea,
              constructionDate: foundOrder.constructionDate,
              keyLocation: foundOrder.keyLocation,
              keyReturn: foundOrder.keyReturn,
              notes: foundOrder.notes,
              contactPerson: foundOrder.contactPerson,
              status: foundOrder.status
            });
            
            // ユーザー情報も取得
            if (usersResponse.ok) {
              const usersResult = await usersResponse.json();
              if (usersResult.success) {
                const foundUser = usersResult.data.find((u: UserInfo) => u.id === foundOrder.userId);
                if (foundUser) {
                  setUserInfo(foundUser);
                }
              }
            }

            // 施工項目を取得
            try {
              const orderItemsResponse = await fetch(`/api/orders/${orderId}/items`);
              if (orderItemsResponse.ok) {
                const orderItemsResult = await orderItemsResponse.json();
                if (orderItemsResult.success) {
                  setOrderItems(orderItemsResult.data);
                  // 編集用データを初期化
                  setEditOrderItems(orderItemsResult.data.map((item: OrderItem) => ({
                    itemId: item.itemId,
                    quantity: item.quantity,
                    selectedAreaOption: item.selectedAreaOption
                  })));
                }
              }
            } catch (error) {
              console.error('施工項目取得エラー:', error);
            }
          }
        }
      }

      // 施工項目マスターを取得
      if (constructionItemsResponse.ok) {
        const constructionItemsResult = await constructionItemsResponse.json();
        if (constructionItemsResult.success) {
          setConstructionItems(constructionItemsResult.data);
        }
      }



    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchData();
    }
    
    // 現在のユーザー情報を取得
    const userData = localStorage.getItem('user');
    console.log('🔍 ローカルストレージの生データ:', userData);
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log('👤 パースされたユーザー情報:', { parsedUser });
        console.log('🎭 ユーザーロール:', parsedUser.role);
        
        const currentUserData = {
          id: parsedUser.id || '',
          companyName: parsedUser.companyName || '',
          storeName: parsedUser.storeName || '',
          role: parsedUser.role || 'user'
        };
        
        console.log('✅ 設定されるcurrentUser:', currentUserData);
        setCurrentUser(currentUserData);
      } catch (error) {
        console.error('ユーザー情報の取得に失敗:', error);
      }
    } else {
      console.log('❌ ローカルストレージにユーザー情報が見つかりません');
    }
  }, [orderId]);

  // 保存処理
  const handleSave = async () => {
    try {
      setSaving(true);

      // 面積選択がある項目について、部屋の広さから自動的に面積オプションと価格を設定
      const updatedOrderItems = editOrderItems.map(item => {
        const constructionItem = constructionItems.find(ci => ci.id === item.itemId);
        if (constructionItem?.hasAreaSelection && editForm.roomArea) {
          const autoAreaOption = getAreaOptionFromSize(editForm.roomArea);
          const autoPrice = getItemPrice(item.itemId, autoAreaOption);
          return {
            ...item,
            selectedAreaOption: autoAreaOption,
            price: autoPrice
          };
        }
        return {
          ...item,
          price: getItemPrice(item.itemId, item.selectedAreaOption)
        };
      });

      const saveData = {
        ...editForm,
        orderItems: updatedOrderItems
      };

      console.log('💾 保存データ:', saveData);
      console.log('📋 施工項目データ:', updatedOrderItems);

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData),
      });

      const result = await response.json();
      console.log('📤 API レスポンス:', result);

      if (result.success) {
        setOrder(result.data);
        setIsEditing(false);
        alert('✅ 注文情報が保存されました！');
        // データを再取得
        await fetchData();
      } else {
        console.error('❌ 更新エラー:', result.error);
        alert(`更新に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('💥 保存エラー:', error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // キャンセル処理
  const handleCancel = () => {
    if (!order) return;
    
    setEditForm({
      propertyName: order.propertyName,
      roomNumber: order.roomNumber,
      address: order.address,
      roomArea: order.roomArea,
      constructionDate: order.constructionDate,
      keyLocation: order.keyLocation,
      keyReturn: order.keyReturn,
      notes: order.notes,
      contactPerson: order.contactPerson,
      status: order.status
    });
    setEditOrderItems(orderItems.map(item => ({
      itemId: item.itemId,
      quantity: item.quantity,
      selectedAreaOption: item.selectedAreaOption
    })));
    setIsEditing(false);
  };

  // 施工項目の追加
  const addOrderItem = () => {
    // 選択されていない項目を取得
    const availableItems = constructionItems.filter(item => 
      !editOrderItems.some(orderItem => orderItem.itemId === item.id)
    );
    
    if (availableItems.length > 0) {
      const firstAvailableItem = availableItems[0];
      const newItem = {
        itemId: firstAvailableItem.id,
        quantity: 1,
        selectedAreaOption: firstAvailableItem.hasAreaSelection && firstAvailableItem.priceOptions 
          ? firstAvailableItem.priceOptions[0]?.label 
          : undefined
      };
      setEditOrderItems([...editOrderItems, newItem]);
    }
  };

  // 追加可能な項目があるかチェック
  const canAddMoreItems = () => {
    return constructionItems.some(item => 
      !editOrderItems.some(orderItem => orderItem.itemId === item.id)
    );
  };

  // 施工項目の削除
  const removeOrderItem = (index: number) => {
    setEditOrderItems(editOrderItems.filter((_, i) => i !== index));
  };

  // 施工項目の更新
  const updateOrderItem = (index: number, field: string, value: any) => {
    const updated = [...editOrderItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // 項目が変更された場合、エアコンクリーニング以外は数量を1にリセット
    if (field === 'itemId') {
      const selectedItem = constructionItems.find(item => item.id === value);
      if (selectedItem && !selectedItem.hasQuantity) {
        updated[index].quantity = 1;
      }
      // 広さ選択がある場合、デフォルトオプションをセット
      if (selectedItem?.hasAreaSelection && selectedItem.priceOptions) {
        updated[index].selectedAreaOption = selectedItem.priceOptions[0]?.label;
      }
    }
    
    setEditOrderItems(updated);
  };

  // 広さ選択の更新
  const handleAreaOptionChange = (index: number, selectedOption: string) => {
    const updated = [...editOrderItems];
    updated[index] = { ...updated[index], selectedAreaOption: selectedOption };
    setEditOrderItems(updated);
  };

  // 部屋の広さから価格帯を自動判定
  const getAreaOptionFromSize = (roomArea?: number) => {
    if (!roomArea) return undefined;
    
    if (roomArea < 30) return '30㎡未満';
    if (roomArea < 50) return '30㎡以上50㎡未満';
    return '50㎡以上';
  };

  // 施工項目の価格を取得（広さ選択を考慮）
  const getItemPrice = (itemId: string, selectedAreaOption?: string, useAutoArea = false) => {
    const constructionItem = constructionItems.find(item => item.id === itemId);
    if (!constructionItem) return 0;

    // 広さ選択がある場合の価格計算
    if (constructionItem.hasAreaSelection && constructionItem.priceOptions) {
      let areaOption = selectedAreaOption;
      
      // 自動判定を使用する場合
      if (useAutoArea && editForm.roomArea) {
        areaOption = getAreaOptionFromSize(editForm.roomArea);
      }
      
      if (areaOption) {
        const selectedPriceOption = constructionItem.priceOptions.find(option => option.label === areaOption);
        return selectedPriceOption ? selectedPriceOption.price : constructionItem.price;
      }
    }

    return constructionItem.price;
  };

  // ステータススタイル
  const getStatusStyle = (status: string) => {
    switch (status) {
      case '日程待ち':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case '日程確定':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case '施工中':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case '施工完了':
        return 'bg-green-100 text-green-700 border-green-200';
      case '支払い済み':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // ステータスアイコン
  const getStatusIcon = (status: string) => {
    switch (status) {
      case '日程待ち':
        return <Clock className="h-5 w-5" />;
      case '日程確定':
        return <Calendar className="h-5 w-5" />;
      case '施工中':
        return <AlertCircle className="h-5 w-5" />;
      case '施工完了':
      case '支払い済み':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  // 日付フォーマット（月/日のみ）
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  // プログレスバーの定義
  const progressSteps: { id: string; label: string; status: Order['status'] }[] = [
    { id: 'waiting', label: '日程待ち', status: '日程待ち' },
    { id: 'scheduled', label: '日程確定', status: '日程確定' },
    { id: 'completed', label: '施工完了', status: '施工完了' },
    { id: 'billed', label: '請求済み', status: '請求済み' },
    { id: 'paid', label: '入金済み', status: '入金済み' }
  ];

  // 依頼キャンセルは別途処理
  const cancelStep = { id: 'cancelled', label: '依頼キャンセル', status: '依頼キャンセル' as Order['status'] };

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    
    // 編集モードの場合は編集フォームの状態を優先
    const currentStatus = isEditing ? editForm.status : order.status;
    
    if (currentStatus === '依頼キャンセル') return -1;
    const currentStep = progressSteps.findIndex(step => step.status === currentStatus);
    return currentStep >= 0 ? currentStep : 0;
  };

  const canUpdateStatus = (stepIndex: number) => {
    if (!currentUser || !order) {
      console.log('❌ canUpdateStatus: ユーザーまたは注文が未設定', { currentUser, order });
      return false;
    }
    if (!isEditing) {
      console.log('❌ canUpdateStatus: 編集モードではない', { isEditing });
      return false;
    }
    
    const currentStepIndex = getCurrentStepIndex();
    if (order.status === '依頼キャンセル') {
      console.log('❌ canUpdateStatus: 注文がキャンセル済み');
      return false;
    }
    
    if (currentUser.role === 'user') {
      // ユーザーは日程待ちと日程確定のみ操作可能
      // 一度施工完了以上のステータスに移動したら戻せない
      if (currentStepIndex > 1) {
        console.log('👤 canUpdateStatus (user): 完了以降は変更不可', { currentStepIndex });
        return false;
      }
      const canUpdate = stepIndex <= 1;
      console.log('👤 canUpdateStatus (user):', { stepIndex, canUpdate, currentStepIndex });
      return canUpdate;
    } else if (currentUser.role === 'admin') {
      // 管理者は全て操作可能、後戻りも可能
      console.log('👨‍💼 canUpdateStatus (admin): true', { stepIndex, currentStepIndex });
      return true;
    }
    
    console.log('❌ canUpdateStatus: 不明なロール', { role: currentUser.role });
    return false;
  };

  const handleStatusUpdate = async (newStatus: Order['status']) => {
    const stepIndex = progressSteps.findIndex(step => step.status === newStatus);
    console.log('🔄 ステータス更新試行:', { newStatus, stepIndex, canUpdate: canUpdateStatus(stepIndex) });
    
    if (!order || !canUpdateStatus(stepIndex)) {
      console.log('❌ ステータス更新拒否');
      return;
    }
    
    // 編集フォームの状態のみ更新（自動保存しない）
    setEditForm(prev => {
      const updated = { ...prev, status: newStatus };
      console.log('✅ 編集フォーム更新:', { 前: prev.status, 後: updated.status });
      return updated;
    });
    console.log('📝 ステータス変更:', newStatus, '（保存ボタンで確定）');
  };

  const handleCancelOrder = async () => {
    if (!order || !currentUser) return;
    
    const confirmed = window.confirm('この発注をキャンセルしますか？この操作は取り消せません。');
    if (!confirmed) return;
    
    try {
      setSaving(true);
      
      // 実際のAPI呼び出し
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...order,
          status: '依頼キャンセル'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 管理者通知を送信
          await fetch('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'order_cancelled',
              orderId: order.id,
              orderDetails: {
                propertyName: order.propertyName,
                roomNumber: order.roomNumber,
                contactPerson: order.contactPerson
              },
              message: `発注ID: ${order.id} がキャンセルされました`
            }),
          });

          // 成功時の処理
          const updatedOrder = { ...order, status: '依頼キャンセル' as Order['status'] };
          setOrder(updatedOrder);
          setEditForm(prev => ({ ...prev, status: '依頼キャンセル' as Order['status'] }));
          
          // 3秒後にダッシュボードに戻る
          setTimeout(() => {
            router.push('/user');
          }, 3000);
          
          console.log('発注キャンセル完了');
        } else {
          throw new Error(result.message || 'キャンセル処理に失敗しました');
        }
      } else {
        throw new Error('API呼び出しエラー');
      }
    } catch (error) {
      console.error('発注キャンセルエラー:', error);
      alert('キャンセル処理中にエラーが発生しました。');
    } finally {
      setSaving(false);
    }
  };

  const canCancel = () => {
    if (!currentUser || !order) return false;
    return currentUser.role === 'user' && order.status !== '依頼キャンセル';
  };

  const canClickCancel = () => {
    return canCancel() && isEditing;
  };

  const handleKeyStatusUpdate = async (newKeyStatus: 'pending' | 'handed') => {
    if (!order || !currentUser) return;
    
    try {
      setSaving(true);
      
      const response = await fetch(`/api/orders/${order.id}/key-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyStatus: newKeyStatus
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 成功時の処理
          const updatedOrder = { ...order, keyStatus: newKeyStatus };
          setOrder(updatedOrder);
          console.log('鍵ステータス更新完了:', newKeyStatus);
          
          // 管理者に通知を送信
          await fetch('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'key_status_change',
              orderId: order.id,
              orderDetails: {
                propertyName: order.propertyName,
                roomNumber: order.roomNumber,
                contactPerson: order.contactPerson,
                keyStatus: newKeyStatus
              },
              message: `鍵ステータスが「${newKeyStatus === 'pending' ? '事務所' : '受渡済'}」に変更されました`
            }),
          });
        } else {
          throw new Error(result.message || '鍵ステータスの更新に失敗しました');
        }
      } else {
        throw new Error('API呼び出しエラー');
      }
    } catch (error) {
      console.error('鍵ステータス更新エラー:', error);
      alert('鍵ステータスの更新中にエラーが発生しました。');
    } finally {
      setSaving(false);
    }
  };



  // プログレスバーコンポーネント
  const ProgressBar = () => {
    if (!order) return null;
    
    const currentStepIndex = getCurrentStepIndex();
    const currentStatus = isEditing ? editForm.status : order.status;
    const isCancelled = currentStatus === '依頼キャンセル';
    
    console.log('📊 進捗状況表示:', { 
      currentStatus, 
      currentStepIndex, 
      isEditing, 
      orderStatus: order.status, 
      editFormStatus: editForm.status 
    });
    
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <svg className="w-5 h-5 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            進捗状況
          </h2>
        </div>
        
        {isCancelled ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <X className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-900 mb-2">依頼キャンセル</h3>
              <p className="text-red-600">この発注はキャンセルされました。</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="flex items-center justify-between max-w-4xl mx-auto relative">
              {progressSteps.map((step, index) => {
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isClickable = canUpdateStatus(index);
                const isNext = index === currentStepIndex + 1 && canUpdateStatus(index);
                
                return (
                  <div key={step.id} className="flex flex-col items-center relative flex-1">
                    {/* 進捗線 */}
                    {index < progressSteps.length - 1 && (
                      <div 
                        className={`absolute top-5 h-0.5 ${
                          isCompleted ? 'bg-blue-500' : 'bg-gray-200'
                        }`}
                        style={{ 
                          zIndex: 1,
                          left: 'calc(50% + 20px)',
                          width: 'calc(100% - 40px)'
                        }}
                      />
                    )}
                    
                    {/* ステップ円 */}
                    <button
                      onClick={() => isClickable && handleStatusUpdate(step.status)}
                      disabled={!isClickable || saving}
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                        isCompleted
                          ? 'bg-blue-500 text-white'
                          : isCurrent
                          ? 'bg-blue-500 text-white'
                          : isNext
                          ? 'bg-white border-2 border-blue-500 text-blue-500 hover:bg-blue-50'
                          : 'bg-gray-200 text-gray-500'
                      } ${
                        isClickable && !saving
                          ? 'cursor-pointer hover:scale-110'
                          : 'cursor-default'
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </button>
                    
                    {/* ステップラベル */}
                    <span className={`mt-2 text-xs font-medium ${
                      isCurrent
                        ? 'text-blue-600'
                        : 'text-gray-500'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
              
              {/* 依頼キャンセル */}
              {canCancel() && (
                <div className="flex flex-col items-center relative">
                  <button
                    onClick={canClickCancel() ? handleCancelOrder : undefined}
                    disabled={saving || !canClickCancel()}
                    className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 bg-rose-50 border-2 border-red-500 text-red-500 hover:bg-rose-100 disabled:opacity-50 ${
                      canClickCancel() ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                  
                  <span className="mt-2 text-xs font-medium text-red-500">
                    {cancelStep.label}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-4" />
          <p className="text-gray-600">注文詳細を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">注文が見つかりません</h3>
          <p className="text-gray-600 mb-4">指定された注文IDは存在しないか、アクセス権限がありません。</p>
          <Link
            href="/user"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            ダッシュボードに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <Link
              href={currentUser?.role === 'admin' ? '/admin/orders' : '/user/orders'}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mr-4"
            >
              <span className="mr-1 font-mono text-base">&lt;&lt;</span>
              案件管理に戻る
            </Link>
          </div>
          {/* 注文情報 */}
          <div className="mb-2">
            <h1 className="text-sm font-medium text-gray-500">{order.id} / {order.propertyName} {order.roomNumber}号室</h1>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('details')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                詳細
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`relative whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'chat'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                チャット
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0 block w-2 h-2 bg-red-500 rounded-full transform translate-x-1/2" />
                )}
              </button>
            </nav>
            
            {/* 編集ボタン (詳細タブ時のみ表示) */}
            {activeTab === 'details' && (
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <button
                  onClick={() => {
                    console.log('✏️ 編集モードを開始');
                    setIsEditing(true);
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  編集
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1" />
                        保存
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    キャンセル
                  </button>
                </>
              )}
            </div>
            )}
          </div>
        </div>

        {/* タブコンテンツ */}
        {activeTab === 'details' ? (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 進捗状況 */}
            <ProgressBar />
            
            {/* 基本情報 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                基本情報
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">物件名</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.propertyName}
                      onChange={(e) => setEditForm({ ...editForm, propertyName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{order.propertyName}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">号室</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.roomNumber}
                      onChange={(e) => setEditForm({ ...editForm, roomNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{order.roomNumber}</p>
                  )}
                </div>

                                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">住所</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Googleマップでナビを表示"
                      className="text-sm text-blue-600 underline flex items-start hover:text-blue-800 cursor-pointer"
                    >
                      <MapPin className="h-4 w-4 mr-1 mt-0.5 text-blue-600" />
                    {order.address}
                    </a>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    部屋の広さ
                    <span className="text-xs text-gray-400 ml-1">
                     
                    </span>
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <input
                        type="number"
                        min="10"
                        max="200"
                        step="0.1"
                        value={editForm.roomArea || ''}
                        onChange={(e) => setEditForm({ ...editForm, roomArea: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="例: 25.5"
                      />
                      {editForm.roomArea && (
                        <div className="mt-1 text-sm text-blue-600">
                          💡 自動判定: {getAreaOptionFromSize(editForm.roomArea)}
                </div>
                      )}
                </div>
                  ) : (
                    <p className="text-sm text-gray-900">
                      {order.roomArea ? (
                        <>
                          <span className="font-medium">{order.roomArea}㎡</span>
                          <span className="text-gray-600 ml-2">
                            ({getAreaOptionFromSize(order.roomArea)})
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-400">未設定</span>
                      )}
                    </p>
                  )}
            </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">施工予定日</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.constructionDate}
                      onChange={(e) => setEditForm({ ...editForm, constructionDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{formatDate(order.constructionDate)}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">鍵の所在</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.keyLocation}
                      onChange={(e) => setEditForm({ ...editForm, keyLocation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 flex items-start">
                    <Key className="h-4 w-4 mr-1 mt-0.5 text-gray-400" />
                    {order.keyLocation}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">鍵の返却先</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.keyReturn}
                      onChange={(e) => setEditForm({ ...editForm, keyReturn: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 flex items-start">
                    <Key className="h-4 w-4 mr-1 mt-0.5 text-gray-400" />
                    {order.keyReturn}
                    </p>
                  )}
                </div>



                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">連絡事項</label>
                  {isEditing ? (
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="特記事項や連絡事項があれば記入してください"
                    />
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {order.notes || '特になし'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 施工依頼項目 */}
              <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  施工依頼項目
                </h2>
                {isEditing && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={addOrderItem}
                      disabled={!canAddMoreItems()}
                      className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md transition-colors ${
                        canAddMoreItems()
                          ? 'text-white bg-blue-600 hover:bg-blue-700'
                          : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      項目追加
                    </button>
                    {!canAddMoreItems() && (
                      <span className="text-xs text-gray-500">
                        すべての項目が選択済みです
                      </span>
                    )}
              </div>
            )}
              </div>

              <div className="space-y-3">
                {isEditing ? (
                  editOrderItems.length > 0 ? (
                    editOrderItems.map((item, index) => {
                      const selectedConstructionItem = constructionItems.find(ci => ci.id === item.itemId);
                      const showQuantityField = selectedConstructionItem?.hasQuantity || false;
                      
                      return (
                        <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-md bg-gray-50">
                          {/* 施工項目名 */}
                          <div className="flex-1 min-w-[200px]">
                            <select
                              value={item.itemId}
                              onChange={(e) => updateOrderItem(index, 'itemId', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              {constructionItems
                                .filter(ci => 
                                  // 現在の項目か、まだ選択されていない項目のみ表示
                                  ci.id === item.itemId || 
                                  !editOrderItems.some(orderItem => orderItem.itemId === ci.id)
                                )
                                .map(ci => (
                                  <option key={ci.id} value={ci.id}>{ci.name}</option>
                                ))}
                            </select>
                      </div>
                          
                          {/* 広さ選択（光触媒コーティング、空間除菌） */}
                          <div className="w-32 flex-shrink-0">
                            {selectedConstructionItem?.hasAreaSelection && selectedConstructionItem.priceOptions ? (
                              <div className="space-y-1">
                                <p className="text-xs text-gray-600">
                                  {editForm.roomArea ? getAreaOptionFromSize(editForm.roomArea) : '未設定'}
                    </p>
                  </div>
                            ) : null}
              </div>

                          {/* 数量フィールド（エアコンクリーニングのみ） */}
                          {showQuantityField && (
                            <div className="w-20 flex items-center gap-1 flex-shrink-0">
                              <span className="text-xs text-gray-600">台数:</span>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={item.quantity}
                                onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value))}
                                className="w-12 px-1 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                              />
                            </div>
                          )}
                          
                          {/* 右側のグループ（金額とゴミ箱） */}
                          <div className="flex items-center gap-2 ml-auto">
                            {/* 金額表示（数量 × 単価） */}
                            <div className="w-28 flex items-center justify-end px-3 py-2 bg-white border border-gray-300 rounded-md">
                              <span className="text-sm font-medium text-gray-700">
                                ¥{(getItemPrice(item.itemId, item.selectedAreaOption, true) * item.quantity).toLocaleString()}
                              </span>
                            </div>
                            
                            {/* 削除ボタン */}
                  <button
                              onClick={() => removeOrderItem(index)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-sm">施工項目が登録されていません。「項目追加」ボタンで追加してください。</p>
                  )
                ) : (
                  orderItems.length > 0 ? (
                    <div className="space-y-2">
                      {orderItems.map((item) => {
                        const showQuantity = item.constructionItem?.hasQuantity || false;
                        const showAreaSelection = item.constructionItem?.hasAreaSelection || false;
                        
                        return (
                          <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {item.constructionItem?.name || `施工項目ID: ${item.itemId}`}
                              </p>
                              <div className="flex items-center space-x-4 mt-1">
                                {showQuantity && (
                                  <p className="text-sm text-gray-600">台数: {item.quantity}</p>
                                )}
                                {showAreaSelection && (
                                  <p className="text-sm text-gray-600">
                                    施工面積: {item.selectedAreaOption || (order.roomArea ? getAreaOptionFromSize(order.roomArea) : '30㎡未満')}
                                  </p>
                                )}
                </div>
              </div>
                            <p className="font-medium text-gray-900 text-right">
                              ¥{(item.price * item.quantity).toLocaleString()}
                            </p>
                          </div>
                        );
                      })}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between items-center font-semibold">
                          <span>合計金額</span>
                          <span className="text-lg">
                            ¥{orderItems.reduce((total, item) => total + (item.price * item.quantity), 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">施工項目が登録されていません。</p>
                  )
                )}
            </div>
          </div>

            {/* 発注者情報 */}
            {userInfo && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  発注者情報
                </h2>
                
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">会社名</dt>
                    <dd className="mt-1 text-sm text-gray-900">{userInfo.companyName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">店舗名</dt>
                    <dd className="mt-1 text-sm text-gray-900">{userInfo.storeName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">担当者</dt>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.contactPerson}
                        onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                    <dd className="mt-1 text-sm text-gray-900">{order.contactPerson}</dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
                    <dd className="mt-1 text-sm text-gray-900">{userInfo.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">電話番号</dt>
                    <dd className="mt-1 text-sm">
                      <a
                        href={`tel:${userInfo.phoneNumber}`}
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        {userInfo.phoneNumber}
                      </a>
                    </dd>
              </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">発注ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">{order.id}</dd>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* チャットタブ */
          <div className="max-w-4xl mx-auto">
            {currentUser && (
              <ChatComponent 
                orderId={orderId}
                currentUser={currentUser}
              />
                )}
              </div>
        )}
      </div>
    </div>
  );
} 