// Billing utilities for usage tracking and cost calculation

export const PRICING = {
  WHISPER_PER_MINUTE: 0.006, // $0.006 per minute for Whisper API
  OPENAI_GPT_PER_1K_TOKENS: 0.0015, // Estimated cost for summary generation
} as const;

export const calculateTranscriptionCost = (durationMinutes: number): number => {
  return Number((durationMinutes * PRICING.WHISPER_PER_MINUTE).toFixed(4));
};

export const calculateSummaryCost = (wordCount: number): number => {
  // Rough estimation: 1 word ≈ 1.3 tokens, summary generation uses ~2x tokens (input + output)
  const estimatedTokens = Math.ceil(wordCount * 1.3 * 2);
  const cost = (estimatedTokens / 1000) * PRICING.OPENAI_GPT_PER_1K_TOKENS;
  return Number(cost.toFixed(4));
};

export const calculateTotalSessionCost = (
  durationMinutes: number,
  wordCount: number,
  hasSummary: boolean = false
): number => {
  const transcriptionCost = calculateTranscriptionCost(durationMinutes);
  const summaryCost = hasSummary ? calculateSummaryCost(wordCount) : 0;
  return Number((transcriptionCost + summaryCost).toFixed(4));
};

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 4,
  }).format(amount);
};

export const formatUsageTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
};

export const getUsageTier = (monthlyMinutes: number): {
  tier: string;
  color: string;
  description: string;
} => {
  if (monthlyMinutes <= 60) {
    return {
      tier: 'Light',
      color: 'text-green-600',
      description: 'Perfect for occasional lectures'
    };
  } else if (monthlyMinutes <= 300) {
    return {
      tier: 'Regular',
      color: 'text-blue-600',
      description: 'Great for regular students'
    };
  } else if (monthlyMinutes <= 600) {
    return {
      tier: 'Heavy',
      color: 'text-orange-600',
      description: 'For intensive study schedules'
    };
  } else {
    return {
      tier: 'Power User',
      color: 'text-purple-600',
      description: 'Research & professional use'
    };
  }
};

export const predictMonthlyCost = (
  currentMonthMinutes: number,
  daysIntoMonth: number,
  daysInMonth: number
): number => {
  if (daysIntoMonth === 0) return 0;

  const dailyAverage = currentMonthMinutes / daysIntoMonth;
  const projectedMonthlyMinutes = dailyAverage * daysInMonth;
  return calculateTranscriptionCost(projectedMonthlyMinutes);
};

export const getCostInsights = (monthlyUsage: number): {
  comparison: string;
  tip: string;
} => {
  const monthlyCost = calculateTranscriptionCost(monthlyUsage);

  if (monthlyCost < 1) {
    return {
      comparison: 'Less than a coffee per month',
      tip: 'Very efficient usage! Keep it up.'
    };
  } else if (monthlyCost < 5) {
    return {
      comparison: 'About the cost of a bubble tea',
      tip: 'Good usage balance for a student budget.'
    };
  } else if (monthlyCost < 15) {
    return {
      comparison: 'Similar to a streaming service',
      tip: 'Consider reviewing long recordings to optimize costs.'
    };
  } else {
    return {
      comparison: 'Higher usage detected',
      tip: 'Try shorter recording sessions or focus on key lectures.'
    };
  }
};

export const shouldShowBillingWarning = (
  currentSessionMinutes: number,
  monthlyUsage: number
): boolean => {
  const sessionCost = calculateTranscriptionCost(currentSessionMinutes);
  const monthlyCost = calculateTranscriptionCost(monthlyUsage);

  // Show warning if single session > $0.50 or monthly > $20
  return sessionCost > 0.5 || monthlyCost > 20;
};

export const generateUsageReport = (
  totalMinutes: number,
  totalCost: number,
  sessionsCount: number,
  monthlyMinutes: number,
  monthlyCost: number
): string => {
  const avgSessionLength = totalMinutes / sessionsCount;
  const tier = getUsageTier(monthlyMinutes);
  const insights = getCostInsights(monthlyMinutes);

  return `Usage Report:
• Total Sessions: ${sessionsCount}
• Total Time: ${formatUsageTime(totalMinutes)}
• Total Spent: ${formatCurrency(totalCost)}
• Average Session: ${formatUsageTime(avgSessionLength)}
• This Month: ${formatUsageTime(monthlyMinutes)} (${formatCurrency(monthlyCost)})
• Usage Tier: ${tier.tier} - ${tier.description}
• Cost Insight: ${insights.comparison}
• Tip: ${insights.tip}`;
};