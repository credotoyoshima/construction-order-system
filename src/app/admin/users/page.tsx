'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useAuthCheck } from '@/hooks/useAuthCheck';

interface UserType {
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

export default function AdminUsersPage() {
  const { isAuthenticated, isCheckingAuth } = useAuthCheck('admin');
  
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    companyName: string;
    storeName: string;
    email: string;
    phoneNumber: string;
    address: string;
    status: 'active' | 'inactive';
  }>({
    companyName: '',
    storeName: '',
    email: '',
    phoneNumber: '',
    address: '',
    status: 'active',
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/users');
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setUsers(result.data);
        }
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

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
  const getSortedUsers = (users: UserType[]) => {
    if (!sortField) return users;

    return [...users].sort((a, b) => {
      let aValue: any, bValue: any;

      switch(sortField) {
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'companyName':
          aValue = a.companyName;
          bValue = b.companyName;
          break;
        case 'role':
          const roleOrder = ['user', 'admin'];
          aValue = roleOrder.indexOf(a.role);
          bValue = roleOrder.indexOf(b.role);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // フィルタリングとソート
  const filteredUsers = getSortedUsers(users).filter(user => {
    if (!searchQuery) return true;
    
    const searchTerm = searchQuery.toLowerCase();
    return (
      user.companyName.toLowerCase().includes(searchTerm) ||
      user.storeName.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm) ||
      user.phoneNumber.includes(searchTerm) ||
      user.id.toLowerCase().includes(searchTerm)
    );
  });

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

  // 権限変更
  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      setUpdating(userId);
      
      const response = await fetch('/api/test-role-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: selectedUser?.email,
          newRole
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setUsers(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, role: newRole }
            : user
        ));
        alert('権限が更新されました！ユーザーは再ログインが必要です。');
      } else {
        alert('権限更新に失敗しました: ' + result.error);
      }
    } catch (error) {
      console.error('権限更新エラー:', error);
      alert('権限更新中にエラーが発生しました');
    } finally {
      setUpdating(null);
      setShowRoleModal(false);
      setSelectedUser(null);
    }
  };

  // ユーザー削除
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('このユーザーを削除しますか？この操作は取り消せません。')) return;
    try {
      setDeleting(userId);
      const response = await fetch('/api/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const result = await response.json();
      if (result.success) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        alert(result.message || 'ユーザーを削除しました');
      } else {
        alert('削除に失敗しました: ' + result.error);
      }
    } catch (error) {
      console.error('ユーザー削除エラー:', error);
      alert('削除中にエラーが発生しました');
    } finally {
      setDeleting(null);
    }
  };

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  };

  // 権限の日本語表示
  const getRoleDisplayName = (role: string) => {
    return role === 'admin' ? '管理者' : '一般ユーザー';
  };

  // 編集モーダルを開く
  const openEditModal = (user: UserType) => {
    setEditingUser(user);
    setEditFormData({
      companyName: user.companyName,
      storeName: user.storeName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      status: user.status,
    });
    setShowEditModal(true);
  };

  // 編集を保存
  const saveUserEdits = async () => {
    if (!editingUser) return;
    try {
      setSaving(editingUser.id);
      const response = await fetch('/api/users/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: editingUser.id, ...editFormData }),
      });
      const result = await response.json();
      if (result.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === editingUser.id ? { ...u, ...result.data } : u))
        );
        alert(result.message || 'ユーザー情報を更新しました');
        setShowEditModal(false);
        setEditingUser(null);
      } else {
        alert('更新に失敗しました: ' + result.error);
      }
    } catch (error) {
      console.error('ユーザー更新エラー:', error);
      alert('更新中にエラーが発生しました');
    } finally {
      setSaving(null);
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
        currentPage="ユーザー管理"
        onSearch={setSearchQuery}
        searchValue={searchQuery}
      >
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p className="text-gray-600">ユーザーデータを読み込んでいます...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      currentPage="ユーザー管理"
      onSearch={setSearchQuery}
      searchValue={searchQuery}
    >
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 h-full flex flex-col">
        
        
        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full min-w-full">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b-2 border-gray-100">
                <th className="text-left py-4 text-sm font-semibold text-gray-700 w-20">ユーザーID</th>
                <th className="text-left py-4 text-sm font-semibold text-gray-700">
                  <button
                    onClick={() => handleSort('companyName')}
                    className="flex items-center space-x-1 group hover:text-blue-600 transition-colors"
                  >
                    <span>会社名</span>
                    {renderSortIcon('companyName')}
                  </button>
                </th>
                <th className="text-left py-4 text-sm font-semibold text-gray-700">店舗名</th>
                <th className="text-left py-4 text-sm font-semibold text-gray-700">メールアドレス</th>
                <th className="text-left py-4 text-sm font-semibold text-gray-700">電話番号</th>
                <th className="text-left py-4 text-sm font-semibold text-gray-700">
                  <button
                    onClick={() => handleSort('role')}
                    className="flex items-center space-x-1 group hover:text-blue-600 transition-colors"
                  >
                    <span>権限</span>
                    {renderSortIcon('role')}
                  </button>
                </th>
                <th className="text-left py-4 text-sm font-semibold text-gray-700">
                  <button
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center space-x-1 group hover:text-blue-600 transition-colors"
                  >
                    <span>登録日</span>
                    {renderSortIcon('createdAt')}
                  </button>
                </th>
                <th className="text-center py-4 text-sm font-semibold text-gray-700 w-20">編集</th>
                <th className="text-center py-4 text-sm font-semibold text-gray-700 w-20">削除</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all duration-200">
                  <td className="py-4 text-sm font-medium text-gray-800">{user.id}</td>
                  <td className="py-4 text-sm text-gray-800">{user.companyName}</td>
                  <td className="py-4 text-sm text-gray-600">{user.storeName}</td>
                  <td className="py-4 text-sm text-blue-600 hover:text-blue-800">
                    <a href={`mailto:${user.email}`}>{user.email}</a>
                  </td>
                  <td className="py-4 text-sm text-gray-800">{user.phoneNumber}</td>
                  <td className="py-4">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowRoleModal(true);
                      }}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        user.role === 'admin' 
                          ? 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200' 
                          : 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200'
                      }`}
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      {getRoleDisplayName(user.role)}
                    </button>
                  </td>
                  <td className="py-4 text-sm text-gray-800 font-medium">{formatDate(user.createdAt)}</td>
                  <td className="py-4 text-center">
                    <button
                      onClick={() => openEditModal(user)}
                      disabled={saving === user.id}
                      className={`p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200 ${saving === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="編集"
                    >
                      {saving === user.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      )}
                    </button>
                  </td>
                  <td className="py-4 text-center">
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={deleting === user.id}
                      className={`p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200 ${deleting === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="削除"
                    >
                      {deleting === user.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-lg">該当するユーザーが見つかりません</p>
              <p className="text-sm mt-1">検索条件を変更してお試しください</p>
            </div>
          )}
        </div>

        {/* 件数表示 */}
        <div className="mt-4 text-sm text-gray-600 border-t border-gray-100 pt-4">
          {filteredUsers.length}件 / 全{users.length}件
        </div>
      </div>

      {/* 権限変更モーダル */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              権限変更
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {selectedUser.companyName} - {selectedUser.email}
            </p>
            <div className="space-y-3">
              {[
                { value: 'user', label: '一般ユーザー', description: '発注・案件管理のみ' },
                { value: 'admin', label: '管理者', description: 'すべての機能にアクセス可能' }
              ].map((role) => (
                <button
                  key={role.value}
                  onClick={() => updateUserRole(selectedUser.id, role.value as 'admin' | 'user')}
                  disabled={updating === selectedUser.id}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-colors border ${
                    selectedUser.role === role.value
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : 'hover:bg-gray-50 border-gray-200'
                  } ${updating === selectedUser.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center">
                    {updating === selectedUser.id && selectedUser.role !== role.value ? (
                      <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    )}
                    <div>
                      <div className="font-medium">{role.label}</div>
                      <div className="text-xs text-gray-500">{role.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-xl hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ユーザー編集モーダル */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">ユーザー情報編集</h3>
            <div className="space-y-4">
              {/* 会社名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700">会社名</label>
                <input
                  type="text"
                  value={editFormData.companyName}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, companyName: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              {/* 店舗名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700">店舗名</label>
                <input
                  type="text"
                  value={editFormData.storeName}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, storeName: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              {/* メールアドレス */}
              <div>
                <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              {/* 電話番号 */}
              <div>
                <label className="block text-sm font-medium text-gray-700">電話番号</label>
                <input
                  type="text"
                  value={editFormData.phoneNumber}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              {/* 住所 */}
              <div>
                <label className="block text-sm font-medium text-gray-700">住所</label>
                <input
                  type="text"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, address: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              {/* ステータス */}
              <div>
                <label className="block text-sm font-medium text-gray-700">ステータス</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                >
                  <option value="active">アクティブ</option>
                  <option value="inactive">インアクティブ</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={saveUserEdits}
                disabled={saving === editingUser.id}
                className={`px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-xl hover:bg-gray-300 transition-colors ${saving === editingUser.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {saving === editingUser.id ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
} 