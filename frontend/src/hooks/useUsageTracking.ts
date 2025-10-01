import { useState, useEffect, useCallback } from 'react';
import { billingService, type BillingInfo, type User, type UsageInfo } from '../services/billingService';

interface UseUsageTrackingResult {
  user: User | null;
  usage: UsageInfo | null;
  loading: boolean;
  error: string | null;
  refreshUsage: () => Promise<void>;
  canTranscribe: (estimatedMinutes?: number) => Promise<boolean>;
  needsPayment: boolean;
  warningMessage: string | null;
}

export const useUsageTracking = (email?: string): UseUsageTrackingResult => {
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsPayment, setNeedsPayment] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const refreshUsage = useCallback(async () => {
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      const billingInfo: BillingInfo = await billingService.getUserBilling(email);
      setUser(billingInfo.user);
      setUsage(billingInfo.usage);

      // Check if user needs payment
      const needsPaymentCheck = !billingInfo.usage.canUseFree &&
        billingInfo.user.subscriptionStatus !== 'active';
      setNeedsPayment(needsPaymentCheck);

      // Set warning message if approaching limit
      if (billingInfo.usage.canUseFree && billingInfo.usage.remainingFreeMinutes <= 10) {
        const remaining = billingInfo.usage.remainingFreeMinutes;
        if (remaining <= 0) {
          setWarningMessage('免費額度已用完，需要付費才能繼續使用');
        } else if (remaining <= 5) {
          setWarningMessage(`免費額度即將用完，剩餘 ${remaining.toFixed(1)} 分鐘`);
        } else {
          setWarningMessage(`您還有 ${remaining.toFixed(1)} 分鐘免費額度`);
        }
      } else {
        setWarningMessage(null);
      }

    } catch (err) {
      console.error('Failed to fetch usage:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch usage information');
    } finally {
      setLoading(false);
    }
  }, [email]);

  const canTranscribe = useCallback(async (estimatedMinutes: number = 1): Promise<boolean> => {
    if (!user) {
      console.warn('No user available for transcription check');
      return false;
    }

    try {
      const checkResult = await billingService.checkUsage(user.id, estimatedMinutes);

      // Update warning message based on check result
      if (checkResult.warning) {
        setWarningMessage(checkResult.warning);
      }

      setNeedsPayment(checkResult.needsPayment);
      return checkResult.canProceed;

    } catch (err) {
      console.error('Failed to check transcription eligibility:', err);
      setError(err instanceof Error ? err.message : 'Failed to check usage');
      return false;
    }
  }, [user]);

  // Initialize or refresh usage when email changes
  useEffect(() => {
    if (email) {
      refreshUsage();
    } else {
      setUser(null);
      setUsage(null);
      setNeedsPayment(false);
      setWarningMessage(null);
    }
  }, [email, refreshUsage]);

  return {
    user,
    usage,
    loading,
    error,
    refreshUsage,
    canTranscribe,
    needsPayment,
    warningMessage,
  };
};