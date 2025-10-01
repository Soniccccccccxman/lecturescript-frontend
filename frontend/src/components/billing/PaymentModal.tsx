import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { billingService, type PricingTier } from '../../services/billingService';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here');

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail?: string;
  isEduEmail?: boolean;
  currentUsage?: {
    remainingFreeMinutes: number;
    totalMinutesUsed: number;
  };
  onPaymentSuccess?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  userId,
  userEmail,
  isEduEmail = false,
  currentUsage,
  onPaymentSuccess,
}) => {
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Load pricing when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPricing();
    }
  }, [isOpen, userEmail]);

  const loadPricing = async () => {
    setLoading(true);
    setError(null);

    try {
      const pricing = await billingService.getPricing(userEmail);
      setPricingTiers(pricing.tiers);

      // Auto-select popular tier
      const popularTier = pricing.tiers.find(tier => tier.popular);
      if (popularTier) {
        setSelectedTier(popularTier.id);
      }
    } catch (err) {
      console.error('Failed to load pricing:', err);
      setError(err instanceof Error ? err.message : 'Failed to load pricing');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedTier) return;

    setProcessingPayment(true);
    setError(null);

    try {
      const session = await billingService.createCheckout(userId, selectedTier);

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({
          sessionId: session.sessionId,
        });

        if (error) {
          throw new Error(error.message);
        }
      } else {
        throw new Error('Stripe failed to load');
      }
    } catch (err) {
      console.error('Payment failed:', err);
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  const getTierBadge = (tier: PricingTier) => {
    if (tier.popular) {
      return (
        <span className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
          推薦
        </span>
      );
    }
    return null;
  };

  const getSavingsText = (tier: PricingTier) => {
    const baseRate = 0.80 * (isEduEmail ? 0.5 : 1);
    const savings = Math.round(((baseRate - tier.pricePerMinute) / baseRate) * 100);
    if (savings > 0) {
      return `節省 ${savings}%`;
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">購買轉錄時間</h2>
            <p className="text-sm text-gray-600 mt-1">
              選擇適合您的方案，繼續使用講座轉錄服務
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={processingPayment}
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        {/* User Info */}
        {currentUsage && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">當前使用情況</p>
                <p className="text-lg font-medium text-gray-900">
                  已用完免費額度，剩餘 {billingService.formatMinutes(currentUsage.remainingFreeMinutes)}
                </p>
              </div>
              {isEduEmail && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  🎓 學術用戶 - 50% 折扣
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <span className="text-red-500 mr-2">⚠️</span>
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Pricing Tiers */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600">載入價格方案...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {pricingTiers.map((tier) => (
                <div
                  key={tier.id}
                  className={`relative border rounded-lg p-6 cursor-pointer transition-all duration-200 ${
                    selectedTier === tier.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  } ${tier.popular ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedTier(tier.id)}
                >
                  {getTierBadge(tier)}

                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {billingService.formatMinutes(tier.minutes)}
                    </h3>

                    <div className="mb-3">
                      <span className="text-2xl font-bold text-gray-900">
                        {billingService.formatCurrency(tier.totalHkd)}
                      </span>
                      <div className="text-sm text-gray-500 mt-1">
                        {billingService.formatCurrency(tier.pricePerMinute)}/分鐘
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 mb-4">
                      {tier.description}
                    </div>

                    {getSavingsText(tier) && (
                      <div className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-1 inline-block">
                        {getSavingsText(tier)}
                      </div>
                    )}
                  </div>

                  {selectedTier === tier.id && (
                    <div className="absolute top-2 right-2">
                      <span className="text-blue-500 text-lg">✓</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Payment Methods */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3">支援的付款方式</h4>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className="flex items-center">
                💳 信用卡/扣帳卡
              </span>
              <span className="flex items-center">
                🟦 支付寶香港
              </span>
              <span className="flex items-center">
                💚 微信支付
              </span>
            </div>
          </div>

          {/* Academic Discount Info */}
          {isEduEmail && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <span className="text-blue-500 mr-2">🎓</span>
                <div>
                  <p className="text-sm font-medium text-blue-900">學術用戶優惠</p>
                  <p className="text-xs text-blue-700">
                    您的 .edu.hk 郵箱享有 50% 學術折扣，價格已自動調整
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={processingPayment}
            >
              取消
            </button>

            <button
              onClick={handlePurchase}
              disabled={!selectedTier || processingPayment || loading}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
            >
              {processingPayment ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  處理中...
                </>
              ) : (
                <>
                  前往付款
                  {selectedTier && (
                    <span className="ml-2">
                      ({billingService.formatCurrency(
                        pricingTiers.find(t => t.id === selectedTier)?.totalHkd || 0
                      )})
                    </span>
                  )}
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-2 text-center">
            點擊「前往付款」將跳轉到安全的 Stripe 付款頁面
          </p>
        </div>
      </div>
    </div>
  );
};