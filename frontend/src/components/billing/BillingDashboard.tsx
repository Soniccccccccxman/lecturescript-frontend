import React, { useState, useEffect } from 'react';
import { billingService, type UsageSession, type Payment, type User, type UsageInfo } from '../../services/billingService';
import { UsageTracker } from './UsageTracker';
import { PaymentModal } from './PaymentModal';

interface BillingDashboardProps {
  userId: string;
  userEmail?: string;
  onClose?: () => void;
}

export const BillingDashboard: React.FC<BillingDashboardProps> = ({
  userId,
  userEmail,
  onClose,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [usageHistory, setUsageHistory] = useState<UsageSession[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'payments'>('overview');

  useEffect(() => {
    loadBillingData();
  }, [userId]);

  const loadBillingData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load user billing info
      const billingInfo = await billingService.getUserBilling(userEmail || userId);
      setUser(billingInfo.user);
      setUsage(billingInfo.usage);

      // Load usage history
      const usageData = await billingService.getUsageHistory(userId, 20);
      setUsageHistory(usageData);

      // Load payment history
      const paymentData = await billingService.getPaymentHistory(userId);
      setPaymentHistory(paymentData);

    } catch (err) {
      console.error('Failed to load billing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    loadBillingData(); // Refresh data after payment
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-HK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSessionTypeDisplay = (sessionType: string) => {
    switch (sessionType) {
      case 'trial':
        return { text: '免費試用', color: 'bg-green-100 text-green-700' };
      case 'paid':
        return { text: '付費使用', color: 'bg-blue-100 text-blue-700' };
      default:
        return { text: sessionType, color: 'bg-gray-100 text-gray-700' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">載入帳單資料...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex items-center">
          <span className="text-red-500 mr-2">⚠️</span>
          <span className="text-sm text-red-700">{error}</span>
        </div>
        <button
          onClick={loadBillingData}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          重新載入
        </button>
      </div>
    );
  }

  if (!user || !usage) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">找不到用戶資料</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">帳單管理</h2>
            <p className="text-sm text-gray-600 mt-1">
              {user.email}
              {user.isEduEmail && (
                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                  學術用戶
                </span>
              )}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="text-2xl">×</span>
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-6 mt-4">
          {[
            { id: 'overview', label: '概覽', icon: '📊' },
            { id: 'usage', label: '使用記錄', icon: '📈' },
            { id: 'payments', label: '付款記錄', icon: '💳' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Usage Tracker */}
            <UsageTracker
              freeMinutesLimit={usage.freeMinutesLimit}
              freeMinutesUsed={usage.freeMinutesUsed}
              remainingFreeMinutes={usage.remainingFreeMinutes}
              subscriptionStatus={user.subscriptionStatus}
              isEduEmail={user.isEduEmail}
              showDetails={true}
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">總使用時間</h4>
                <div className="text-2xl font-bold text-blue-600">
                  {billingService.formatMinutes(usage.totalMinutesUsed)}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">總錄音次數</h4>
                <div className="text-2xl font-bold text-green-600">
                  {usage.totalSessions}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">總花費</h4>
                <div className="text-2xl font-bold text-purple-600">
                  {billingService.formatCurrency(usage.totalCostHkd)}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              {usage.remainingFreeMinutes <= 0 && user.subscriptionStatus === 'trial' && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  💎 購買更多時間
                </button>
              )}

              {usage.remainingFreeMinutes > 0 && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-6 py-3 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50 transition-colors"
                >
                  🛒 提前購買
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'usage' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">使用記錄</h3>

            {usageHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                還沒有使用記錄
              </div>
            ) : (
              <div className="space-y-3">
                {usageHistory.map((session) => {
                  const sessionTypeDisplay = getSessionTypeDisplay(session.session_type);
                  let metadata;
                  try {
                    metadata = JSON.parse(session.metadata);
                  } catch {
                    metadata = {};
                  }

                  return (
                    <div
                      key={session.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">
                            {metadata.isStreaming ? '🌊' : '🎵'}
                          </span>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">
                                {billingService.formatMinutes(session.minutes_used)}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded-full ${sessionTypeDisplay.color}`}>
                                {sessionTypeDisplay.text}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {formatDate(session.created_at)}
                            </div>
                            {metadata.filename && (
                              <div className="text-xs text-gray-500 mt-1">
                                檔案: {metadata.filename}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {session.cost_hkd > 0
                              ? billingService.formatCurrency(session.cost_hkd)
                              : '免費'
                            }
                          </div>
                          {metadata.intelligentTitle && (
                            <div className="text-xs text-gray-500 mt-1">
                              {metadata.intelligentTitle}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">付款記錄</h3>

            {paymentHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                還沒有付款記錄
              </div>
            ) : (
              <div className="space-y-3">
                {paymentHistory.map((payment) => (
                  <div
                    key={payment.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">💳</span>
                        <div>
                          <div className="font-medium text-gray-900">
                            購買 {billingService.formatMinutes(payment.minutes_purchased)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatDate(payment.created_at)}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {payment.stripe_payment_intent_id}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-medium text-gray-900">
                          {billingService.formatCurrency(payment.amount_hkd)}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          payment.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {payment.status === 'completed' ? '已完成' : payment.status}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          userId={userId}
          userEmail={user.email}
          isEduEmail={user.isEduEmail}
          currentUsage={{
            remainingFreeMinutes: usage.remainingFreeMinutes,
            totalMinutesUsed: usage.totalMinutesUsed,
          }}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};