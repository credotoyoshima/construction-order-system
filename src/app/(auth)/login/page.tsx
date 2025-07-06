'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { validateLoginForm } from '@/utils/validation';
import { LoginForm, ValidationErrors } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: ''
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
    const validationErrors = validateLoginForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // APIを呼び出してログイン認証
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });

      const result = await response.json();

      if (result.success) {
        const user = result.data.user;
        
        // ローカルストレージにユーザー情報を保存（簡易認証）
        localStorage.setItem('user', JSON.stringify(user));
        
        console.log('ログイン成功:', user);
        
        // ユーザーの役割に応じてリダイレクト
        if (user.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/user');
        }
      } else {
        throw new Error(result.error || 'ログインに失敗しました');
      }
    } catch (error) {
      console.error('ログインエラー:', error);
      if (error instanceof Error) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'ログイン処理でエラーが発生しました' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterClick = () => {
    router.push('/register');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4">
      {/* 背景エフェクト */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-cyan-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-50 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative w-full max-w-md bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/30 p-8 md:p-10">
        {/* ロゴとタイトル */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-6 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-1">
            工事受注システム
          </h1>
          <p className="text-gray-500 text-sm tracking-wide">
            以下よりログインしてください
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
        
        {/* ログインフォーム */}
        <div className="space-y-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-600 mb-1 ml-1">
              メールアドレス
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full pl-12 pr-4 py-3.5 rounded-xl border ${
                  errors.email 
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-200' 
                    : 'border-gray-200 focus:border-blue-400 focus:ring-blue-200'
                } focus:ring focus:ring-opacity-50 outline-none transition-all bg-white/70 text-gray-700 placeholder-gray-400 shadow-sm`}
                placeholder="email@example.com"
                disabled={isSubmitting}
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs mt-1 ml-1">{errors.email}</p>
            )}
          </div>
          
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-600 mb-1 ml-1">
              パスワード
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full pl-12 pr-4 py-3.5 rounded-xl border ${
                  errors.password 
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-200' 
                    : 'border-gray-200 focus:border-blue-400 focus:ring-blue-200'
                } focus:ring focus:ring-opacity-50 outline-none transition-all bg-white/70 text-gray-700 placeholder-gray-400 shadow-sm`}
                placeholder="••••••••••"
                disabled={isSubmitting}
              />
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1 ml-1">{errors.password}</p>
            )}
          </div>
          
          <div className="flex justify-end">
            <button className="text-sm text-blue-500 hover:text-blue-600 font-medium transition-colors">
              パスワードをお忘れですか？
            </button>
          </div>

          <div className="pt-4">
            <button
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
                  ログイン中...
                </div>
              ) : (
                <span className="inline-flex items-center justify-center">
                  ログイン
                  <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              )}
            </button>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            アカウントをお持ちでないですか？ {' '}
            <button 
              onClick={handleRegisterClick}
              className="text-blue-500 hover:text-blue-700 font-medium transition-colors hover:underline"
            >
              新規登録
            </button>
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