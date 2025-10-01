export interface User {
  id: string;
  email: string;
  isEduEmail: boolean;
  subscriptionStatus: 'trial' | 'active' | 'expired';
  createdAt: string;
}

export interface UsageInfo {
  freeMinutesLimit: number;
  freeMinutesUsed: number;
  remainingFreeMinutes: number;
  totalMinutesUsed: number;
  canUseFree: boolean;
  totalSessions: number;
  totalCostHkd: number;
}

export interface PricingTier {
  id: string;
  minutes: number;
  totalHkd: number;
  pricePerMinute: number;
  popular: boolean;
  description: string;
}

export interface BillingInfo {
  user: User;
  usage: UsageInfo;
  pricingTiers: PricingTier[];
}

export interface PaymentSession {
  sessionId: string;
  url: string;
  tier: PricingTier;
}

export interface UsageSession {
  id: string;
  session_type: string;
  minutes_used: number;
  cost_hkd: number;
  created_at: string;
  metadata: string;
}

export interface Payment {
  id: string;
  stripe_payment_intent_id: string;
  amount_hkd: number;
  minutes_purchased: number;
  status: string;
  created_at: string;
}

class BillingService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  }

  // Get user billing information
  async getUserBilling(userIdOrEmail: string): Promise<BillingInfo> {
    const response = await fetch(`${this.baseUrl}/api/billing/user/${encodeURIComponent(userIdOrEmail)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get billing info: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get billing information');
    }

    return result.data;
  }

  // Create or get user
  async createUser(email: string): Promise<{ user: User; usage: UsageInfo }> {
    const response = await fetch(`${this.baseUrl}/api/billing/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create user: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to create user');
    }

    return result.data;
  }

  // Check if user can transcribe
  async checkUsage(userId: string, estimatedMinutes: number = 1): Promise<{
    canProceed: boolean;
    willExceedLimit: boolean;
    remainingFreeMinutes: number;
    subscriptionStatus: string;
    needsPayment: boolean;
    warning?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/api/billing/check-usage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, estimatedMinutes }),
    });

    if (!response.ok) {
      throw new Error(`Failed to check usage: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to check usage');
    }

    return result.data;
  }

  // Get pricing tiers
  async getPricing(userIdOrEmail?: string): Promise<{
    tiers: PricingTier[];
    isEduEmail: boolean;
    currency: string;
    features: {
      academicDiscount?: string;
      freeTrialMinutes: number;
      supportedPayments: string[];
    };
  }> {
    const url = userIdOrEmail
      ? `${this.baseUrl}/api/billing/pricing/${encodeURIComponent(userIdOrEmail)}`
      : `${this.baseUrl}/api/billing/pricing`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get pricing: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get pricing');
    }

    return result.data;
  }

  // Create checkout session
  async createCheckout(userId: string, tierId: string): Promise<PaymentSession> {
    const response = await fetch(`${this.baseUrl}/api/billing/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, tierId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create checkout: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to create checkout session');
    }

    return result.data;
  }

  // Get payment history
  async getPaymentHistory(userId: string): Promise<Payment[]> {
    const response = await fetch(`${this.baseUrl}/api/billing/payments/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get payment history: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get payment history');
    }

    return result.data;
  }

  // Get usage history
  async getUsageHistory(userId: string, limit: number = 50): Promise<UsageSession[]> {
    const response = await fetch(`${this.baseUrl}/api/billing/usage/${userId}?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get usage history: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get usage history');
    }

    return result.data;
  }

  // Calculate custom pricing
  async calculatePrice(minutes: number, userIdOrEmail?: string): Promise<{
    minutes: number;
    rate_per_minute_hkd: number;
    total_hkd: number;
    discount_applied?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/api/billing/calculate-price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ minutes, userIdOrEmail }),
    });

    if (!response.ok) {
      throw new Error(`Failed to calculate price: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to calculate price');
    }

    return result.data;
  }

  // Format time for display
  formatMinutes(minutes: number): string {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}秒`;
    } else if (minutes < 60) {
      return `${minutes.toFixed(1)}分鐘`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = Math.round(minutes % 60);
      return `${hours}小時${remainingMinutes}分鐘`;
    }
  }

  // Format currency for Hong Kong
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('zh-HK', {
      style: 'currency',
      currency: 'HKD',
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  // Get progress color based on usage
  getUsageColor(usedPercentage: number): string {
    if (usedPercentage >= 90) return '#ef4444'; // red-500
    if (usedPercentage >= 70) return '#f59e0b'; // amber-500
    if (usedPercentage >= 50) return '#eab308'; // yellow-500
    return '#10b981'; // emerald-500
  }
}

export const billingService = new BillingService();