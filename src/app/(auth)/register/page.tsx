'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { validateRegisterForm } from '@/utils/validation';
import { RegisterForm, ValidationErrors } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterForm>({
    companyName: '',
    storeName: '',
    email: '',
    phoneNumber: '',
    address: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // エラーをクリア
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    // バリデーション
    const validationErrors = validateRegisterForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('📤 新規登録APIを呼び出し中...', formData);
      
      // 実際のAPI呼び出し
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: formData.companyName,
          storeName: formData.storeName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          password: formData.password
        })
      });

      const result = await response.json();
      console.log('📥 API レスポンス:', result);

      if (result.success) {
        alert('登録が完了しました！ログイン画面に移動します。');
        router.push('/login');
      } else {
        console.error('登録失敗:', result.error);
        setErrors({ general: result.error || '登録に失敗しました' });
      }
    } catch (error) {
      console.error('登録エラー:', error);
      setErrors({ general: 'ネットワークエラーが発生しました' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4">
      {/* 背景エフェクト */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-cyan-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-50 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/30 p-8 md:p-10">
        {/* ロゴとタイトル */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-6 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-1">
            新規ユーザー登録
          </h1>
          <p className="text-gray-500 text-sm tracking-wide">
            新規ユーザー登録はこちらからお願いします
          </p>
        </div>

        {/* エラーメッセージ */}
        {errors.general && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errors.general}
          </div>
        )}

        {/* 登録フォーム */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 会社名 */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-600 mb-1 ml-1">
              会社名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              className={`w-full px-4 py-3.5 rounded-xl border ${
                errors.companyName 
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-200' 
                  : 'border-gray-200 focus:border-blue-400 focus:ring-blue-200'
              } focus:ring focus:ring-opacity-50 outline-none transition-all bg-white/70 text-gray-700 placeholder-gray-400 shadow-sm`}
              placeholder="株式会社○○○"
              disabled={isSubmitting}
            />
            {errors.companyName && (
              <p className="text-red-500 text-xs mt-1 ml-1">{errors.companyName}</p>
            )}
          </div>

          {/* 店舗名 */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-600 mb-1 ml-1">
              店舗名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="storeName"
              value={formData.storeName}
              onChange={handleInputChange}
              className={`w-full px-4 py-3.5 rounded-xl border ${
                errors.storeName 
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-200' 
                  : 'border-gray-200 focus:border-blue-400 focus:ring-blue-200'
              } focus:ring focus:ring-opacity-50 outline-none transition-all bg-white/70 text-gray-700 placeholder-gray-400 shadow-sm`}
              placeholder="○○支店"
              disabled={isSubmitting}
            />
            {errors.storeName && (
              <p className="text-red-500 text-xs mt-1 ml-1">{errors.storeName}</p>
            )}
          </div>

          {/* メールアドレス */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-600 mb-1 ml-1">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-4 py-3.5 rounded-xl border ${
                errors.email 
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-200' 
                  : 'border-gray-200 focus:border-blue-400 focus:ring-blue-200'
              } focus:ring focus:ring-opacity-50 outline-none transition-all bg-white/70 text-gray-700 placeholder-gray-400 shadow-sm`}
              placeholder="example@company.co.jp"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1 ml-1">{errors.email}</p>
            )}
          </div>

          {/* 電話番号 */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-600 mb-1 ml-1">
              電話番号 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              className={`w-full px-4 py-3.5 rounded-xl border ${
                errors.phoneNumber 
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-200' 
                  : 'border-gray-200 focus:border-blue-400 focus:ring-blue-200'
              } focus:ring focus:ring-opacity-50 outline-none transition-all bg-white/70 text-gray-700 placeholder-gray-400 shadow-sm`}
              placeholder="078-123-4567"
              disabled={isSubmitting}
            />
            {errors.phoneNumber && (
              <p className="text-red-500 text-xs mt-1 ml-1">{errors.phoneNumber}</p>
            )}
          </div>

          {/* 住所 */}
          <div className="md:col-span-2 space-y-1">
            <label className="block text-sm font-medium text-gray-600 mb-1 ml-1">
              住所 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className={`w-full px-4 py-3.5 rounded-xl border ${
                errors.address 
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-200' 
                  : 'border-gray-200 focus:border-blue-400 focus:ring-blue-200'
              } focus:ring focus:ring-opacity-50 outline-none transition-all bg-white/70 text-gray-700 placeholder-gray-400 shadow-sm`}
              placeholder="神戸市中央区区○○○ 1-2-3"
              disabled={isSubmitting}
            />
            {errors.address && (
              <p className="text-red-500 text-xs mt-1 ml-1">{errors.address}</p>
            )}
          </div>

          {/* パスワード */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-600 mb-1 ml-1">
              パスワード <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full px-4 py-3.5 rounded-xl border ${
                errors.password 
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-200' 
                  : 'border-gray-200 focus:border-blue-400 focus:ring-blue-200'
              } focus:ring focus:ring-opacity-50 outline-none transition-all bg-white/70 text-gray-700 placeholder-gray-400 shadow-sm`}
              placeholder="8文字以上で入力"
              disabled={isSubmitting}
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1 ml-1">{errors.password}</p>
            )}
          </div>

          {/* パスワード確認 */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-600 mb-1 ml-1">
              パスワード（確認） <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`w-full px-4 py-3.5 rounded-xl border ${
                errors.confirmPassword 
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-200' 
                  : 'border-gray-200 focus:border-blue-400 focus:ring-blue-200'
              } focus:ring focus:ring-opacity-50 outline-none transition-all bg-white/70 text-gray-700 placeholder-gray-400 shadow-sm`}
              placeholder="パスワードを再入力"
              disabled={isSubmitting}
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1 ml-1">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        {/* 登録ボタン */}
        <div className="mt-8 pt-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`w-full py-3.5 rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-blue-100/50 ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 hover:scale-[1.02] active:scale-[0.98] transform'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                登録中...
              </div>
            ) : (
              <span className="inline-flex items-center justify-center">
                新規登録
                <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </span>
            )}
          </button>
        </div>

        {/* ログインリンク */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            既にアカウントをお持ちの方は{' '}
            <Link
              href="/login"
              className="text-blue-500 hover:text-blue-700 font-medium transition-colors hover:underline"
            >
              こちらからログイン
            </Link>
          </p>
        </div>

        {/* フッター */}
        <div className="mt-16 pt-4 border-t border-gray-100">
          <p className="text-center text-xs text-gray-400">
            © 2025 Credo co.,ltd.
          </p>
        </div>
      </div>
    </div>
  );
} 