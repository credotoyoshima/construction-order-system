'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { ChatMessage } from '@/types';

interface ChatComponentProps {
  orderId: string;
  currentUser: {
    id: string;
    companyName: string;
    storeName: string;
    role: 'admin' | 'user';
  };
}

export default function ChatComponent({ orderId, currentUser }: ChatComponentProps) {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // SWRでチャットデータを取得しキャッシュ
  const { data, error, mutate } = useSWR<{
    success: boolean;
    data: {
      messages: ChatMessage[];
      unreadCount: number;
    };
  }>(
    `/api/chat/${orderId}?userId=${currentUser.id}`,
    fetcher,
    { refreshInterval: 15000 }
  );
  const messages = data?.success ? data.data.messages : [];
  const loading = !data && !error;

  // メッセージ取得後に未読を自動で既読化
  useEffect(() => {
    if (!loading && messages.length > 0) {
      messages
        // 未読かつ自分が送信したメッセージ以外を既読化
        .filter(msg => !msg.isRead && msg.userId !== currentUser.id)
        .forEach(msg => {
          markAsRead(msg.id);
        });
    }
  }, [messages, loading, currentUser.id]);

  // メッセージ送信
  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    console.log('📤 メッセージ送信開始');
    console.log('👤 currentUser:', currentUser);
    
    const messageData = {
      userId: currentUser.id,
      userName: `${currentUser.companyName} ${currentUser.storeName}`,
      userRole: currentUser.role,
      message: newMessage.trim(),
      messageType: 'text'
    };
    
    console.log('📨 送信データ:', messageData);

    setSending(true);
    try {
      const response = await fetch(`/api/chat/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // キャッシュを再検証して最新状態を取得
          mutate();
          setNewMessage('');
        }
      }
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
    } finally {
      setSending(false);
    }
  };

  // メッセージを既読にする
  const markAsRead = async (messageId: string) => {
    try {
      await fetch(`/api/chat/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId }),
      });
      // 既読処理後にキャッシュを更新
      mutate();
    } catch (error) {
      console.error('既読更新エラー:', error);
    }
  };

  // Enterキーでメッセージ送信
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 時間フォーマット
  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('ja-JP') + ' ' + date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '不明';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-gray-600">チャットを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        チャット
      </h2>
      
      {/* メッセージ一覧 */}
      <div className="space-y-4 mb-6">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm">まだメッセージがありません</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="border-l-4 border-gray-200 pl-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    message.userRole === 'admin' 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {message.userRole === 'admin' ? '管理者' : 'ユーザー'}
                  </span>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {message.userName}
                  </span>
                </div>
                <div className="flex flex-col items-end space-y-1">
                <time className="text-xs text-gray-500">
                  {formatDateTime(message.createdAt)}
                </time>
                  {message.userId === currentUser.id && (
                    <span className="text-xs text-gray-400">
                      {message.isRead ? '既読' : '未読'}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {message.message}
              </p>
            </div>
          ))
        )}
      </div>

      {/* メッセージ投稿フォーム */}
      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          新しいメッセージ
        </label>
                 <textarea
           value={newMessage}
           onChange={(e) => setNewMessage(e.target.value)}
           onKeyPress={handleKeyPress}
           rows={3}
           className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
           placeholder="質問や連絡事項があればこちらに入力してください..."
           disabled={sending}
         />
        <div className="mt-3 flex justify-end">
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <svg className="h-4 w-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                送信中...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                メッセージ送信
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 