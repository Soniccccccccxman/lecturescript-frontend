import React from 'react';
import { billingService } from '../../services/billingService';

interface UsageTrackerProps {
  freeMinutesLimit: number;
  freeMinutesUsed: number;
  remainingFreeMinutes: number;
  subscriptionStatus: string;
  isEduEmail?: boolean;
  className?: string;
  showDetails?: boolean;
}

export const UsageTracker: React.FC<UsageTrackerProps> = ({
  freeMinutesLimit,
  freeMinutesUsed,
  remainingFreeMinutes,
  subscriptionStatus,
  isEduEmail = false,
  className = '',
  showDetails = true,
}) => {
  const usedPercentage = (freeMinutesUsed / freeMinutesLimit) * 100;
  const progressColor = billingService.getUsageColor(usedPercentage);

  const getStatusIcon = () => {
    if (subscriptionStatus === 'active') return '💎';
    if (remainingFreeMinutes <= 0) return '⚠️';
    if (usedPercentage >= 80) return '🔶';
    return '✅';
  };

  const getStatusText = () => {
    if (subscriptionStatus === 'active') return '付費用戶';
    if (remainingFreeMinutes <= 0) return '免費額度已用完';
    if (usedPercentage >= 80) return '接近免費額度上限';
    return '免費試用中';
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getStatusIcon()}</span>
          <h3 className="font-medium text-gray-900">{getStatusText()}</h3>
          {isEduEmail && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
              學術優惠
            </span>
          )}
        </div>
        {subscriptionStatus === 'trial' && (
          <span className="text-sm text-gray-500">
            {billingService.formatMinutes(remainingFreeMinutes)} 剩餘
          </span>
        )}
      </div>

      {subscriptionStatus === 'trial' && (
        <>
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>已使用 {billingService.formatMinutes(freeMinutesUsed)}</span>
              <span>總共 {billingService.formatMinutes(freeMinutesLimit)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(usedPercentage, 100)}%`,
                  backgroundColor: progressColor,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{Math.round(usedPercentage)}% 已使用</span>
              <span>
                {remainingFreeMinutes > 0
                  ? `還可用 ${Math.round(remainingFreeMinutes)} 分鐘`
                  : '需要付費繼續使用'
                }
              </span>
            </div>
          </div>

          {/* Warning Messages */}
          {remainingFreeMinutes <= 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
              <div className="flex items-center">
                <span className="text-red-500 mr-2">⚠️</span>
                <span className="text-sm text-red-700">
                  免費額度已用完，請付費購買更多轉錄時間
                </span>
              </div>
            </div>
          )}

          {remainingFreeMinutes > 0 && remainingFreeMinutes <= 10 && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-3">
              <div className="flex items-center">
                <span className="text-amber-500 mr-2">🔶</span>
                <span className="text-sm text-amber-700">
                  免費額度即將用完，剩餘 {billingService.formatMinutes(remainingFreeMinutes)}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {showDetails && (
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {billingService.formatMinutes(freeMinutesUsed)}
            </div>
            <div className="text-xs text-gray-500">已使用時間</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {subscriptionStatus === 'trial'
                ? billingService.formatMinutes(remainingFreeMinutes)
                : '無限制'
              }
            </div>
            <div className="text-xs text-gray-500">
              {subscriptionStatus === 'trial' ? '剩餘時間' : '付費用戶'}
            </div>
          </div>
        </div>
      )}

      {/* Academic Discount Notice */}
      {isEduEmail && subscriptionStatus === 'trial' && (
        <div className="mt-3 text-xs text-blue-600 bg-blue-50 rounded p-2">
          🎓 您的 .edu.hk 郵箱享有雙倍免費時間和 50% 學術折扣
        </div>
      )}
    </div>
  );
};