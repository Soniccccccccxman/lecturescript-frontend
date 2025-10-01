import React from 'react';

// =================== APPLE-LEVEL DESIGN SYSTEM ===================

export interface AppleTheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    surfaceElevated: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    borderSubtle: string;
    hover: string;
    active: string;
    shadow: string;
    shadowElevated: string;
    success: string;
    warning: string;
    error: string;
    gradient: string;
    glassBg: string;
    glassBlur: string;
  };
  gradients: {
    primary: string;
    accent: string;
    hero: string;
    recording: string;
    surface: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  shadows: {
    subtle: string;
    medium: string;
    elevated: string;
    hero: string;
  };
  blur: {
    subtle: string;
    medium: string;
    strong: string;
  };
}

export const appleLight: AppleTheme = {
  colors: {
    primary: '#1d1d1f',
    secondary: '#86868b',
    accent: '#007aff',
    background: '#ffffff',
    surface: '#f5f5f7',
    surfaceElevated: '#ffffff',
    text: '#1d1d1f',
    textSecondary: '#86868b',
    textTertiary: '#c7c7cc',
    border: 'rgba(0, 0, 0, 0.1)',
    borderSubtle: 'rgba(0, 0, 0, 0.05)',
    hover: 'rgba(0, 0, 0, 0.04)',
    active: 'rgba(0, 0, 0, 0.08)',
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowElevated: 'rgba(0, 0, 0, 0.15)',
    success: '#34c759',
    warning: '#ff9500',
    error: '#ff3b30',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    glassBg: 'rgba(255, 255, 255, 0.8)',
    glassBlur: 'blur(20px)',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    accent: 'linear-gradient(135deg, #007aff 0%, #5856d6 100%)',
    hero: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    recording: 'linear-gradient(135deg, #ff3b30 0%, #ff6b6b 100%)',
    surface: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  borderRadius: {
    sm: '6px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
  shadows: {
    subtle: '0 1px 3px rgba(0, 0, 0, 0.1)',
    medium: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
    elevated: '0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.1)',
    hero: '0 25px 50px rgba(0, 0, 0, 0.15), 0 10px 25px rgba(0, 0, 0, 0.1)',
  },
  blur: {
    subtle: 'blur(8px)',
    medium: 'blur(16px)',
    strong: 'blur(24px)',
  },
};

export const appleDark: AppleTheme = {
  ...appleLight,
  colors: {
    primary: '#ffffff',
    secondary: '#98989d',
    accent: '#0a84ff',
    background: '#000000',
    surface: '#1c1c1e',
    surfaceElevated: '#2c2c2e',
    text: '#ffffff',
    textSecondary: '#98989d',
    textTertiary: '#48484a',
    border: 'rgba(255, 255, 255, 0.15)',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    hover: 'rgba(255, 255, 255, 0.08)',
    active: 'rgba(255, 255, 255, 0.15)',
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowElevated: 'rgba(0, 0, 0, 0.5)',
    success: '#30d158',
    warning: '#ff9f0a',
    error: '#ff453a',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    glassBg: 'rgba(28, 28, 30, 0.8)',
    glassBlur: 'blur(20px)',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    accent: 'linear-gradient(135deg, #0a84ff 0%, #5856d6 100%)',
    hero: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    recording: 'linear-gradient(135deg, #ff453a 0%, #ff6b6b 100%)',
    surface: 'linear-gradient(135deg, rgba(28,28,30,0.9) 0%, rgba(28,28,30,0.7) 100%)',
  },
};

// =================== PREMIUM BUTTON COMPONENT ===================

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  theme: AppleTheme;
  className?: string;
}

export const PremiumButton: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  loading = false,
  icon,
  theme,
  className = '',
}) => {
  const sizeStyles = {
    sm: { padding: '8px 16px', fontSize: '14px', height: '36px' },
    md: { padding: '12px 24px', fontSize: '16px', height: '44px' },
    lg: { padding: '16px 32px', fontSize: '18px', height: '52px' },
  };

  const variantStyles = {
    primary: {
      background: theme.gradients.primary,
      color: '#ffffff',
      border: 'none',
      shadow: theme.shadows.medium,
    },
    secondary: {
      background: theme.colors.surface,
      color: theme.colors.text,
      border: `1px solid ${theme.colors.border}`,
      shadow: theme.shadows.subtle,
    },
    ghost: {
      background: 'transparent',
      color: theme.colors.textSecondary,
      border: 'none',
      shadow: 'none',
    },
    danger: {
      background: theme.gradients.recording,
      color: '#ffffff',
      border: 'none',
      shadow: theme.shadows.medium,
    },
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        relative overflow-hidden font-medium transition-all duration-300
        transform hover:scale-105 active:scale-95 disabled:opacity-50
        disabled:cursor-not-allowed disabled:transform-none
        ${className}
      `}
      style={{
        ...currentSize,
        ...currentVariant,
        borderRadius: theme.borderRadius.md,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontWeight: '600',
        letterSpacing: '-0.01em',
        backdropFilter: variant === 'secondary' ? theme.blur.subtle : 'none',
        WebkitBackdropFilter: variant === 'secondary' ? theme.blur.subtle : 'none',
      }}
    >
      {/* Shimmer effect */}
      <div
        className="absolute inset-0 opacity-0 hover:opacity-20 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)',
          transform: 'translateX(-100%)',
          animation: loading ? 'shimmer 1.5s infinite' : 'none',
        }}
      />

      <div className="flex items-center justify-center gap-2">
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : icon ? (
          <span className="flex items-center">{icon}</span>
        ) : null}
        {children}
      </div>
    </button>
  );
};

// =================== GLASS CARD COMPONENT ===================

interface GlassCardProps {
  children: React.ReactNode;
  theme: AppleTheme;
  className?: string;
  elevated?: boolean;
  interactive?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  theme,
  className = '',
  elevated = false,
  interactive = false,
}) => {
  return (
    <div
      className={`
        relative overflow-hidden transition-all duration-300
        ${interactive ? 'hover:scale-[1.02] cursor-pointer' : ''}
        ${className}
      `}
      style={{
        background: theme.colors.glassBg,
        backdropFilter: theme.colors.glassBlur,
        WebkitBackdropFilter: theme.colors.glassBlur,
        borderRadius: theme.borderRadius.lg,
        border: `1px solid ${theme.colors.borderSubtle}`,
        boxShadow: elevated ? theme.shadows.elevated : theme.shadows.medium,
      }}
    >
      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: theme.gradients.surface,
          borderRadius: theme.borderRadius.lg,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

// =================== HERO SECTION COMPONENT ===================

interface HeroSectionProps {
  theme: AppleTheme;
  onGetStarted: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ theme, onGetStarted }) => {
  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background: theme.gradients.hero,
          }}
        />

        {/* Floating particles */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-20 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 4 + 1}px`,
                height: `${Math.random() * 4 + 1}px`,
                backgroundColor: theme.colors.primary,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${Math.random() * 3 + 2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-white font-bold text-2xl shadow-2xl"
              style={{
                background: theme.gradients.primary,
                boxShadow: theme.shadows.hero,
              }}
            >
              L
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1
              className="text-6xl md:text-7xl font-bold tracking-tight"
              style={{
                color: theme.colors.text,
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                letterSpacing: '-0.02em',
                lineHeight: '1.1',
              }}
            >
              LectureScript
              <span
                className="block text-transparent bg-clip-text"
                style={{
                  backgroundImage: theme.gradients.primary,
                }}
              >
                Pro
              </span>
            </h1>

            <p
              className="text-xl md:text-2xl font-medium leading-relaxed max-w-2xl mx-auto"
              style={{
                color: theme.colors.textSecondary,
                fontWeight: '500',
              }}
            >
              Transform your lectures into intelligent, searchable transcripts with AI-powered insights
            </p>
          </div>

          {/* Features */}
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium">
            {[
              '🎤 Real-time transcription',
              '📚 PDF context integration',
              '🧠 AI-powered insights',
              '⚡ Lightning fast'
            ].map((feature, index) => (
              <div
                key={index}
                className="px-4 py-2 rounded-full backdrop-blur-md"
                style={{
                  background: theme.colors.glassBg,
                  border: `1px solid ${theme.colors.borderSubtle}`,
                  color: theme.colors.text,
                }}
              >
                {feature}
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="pt-4">
            <PremiumButton
              theme={theme}
              size="lg"
              onClick={onGetStarted}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              }
            >
              Start Recording
            </PremiumButton>
          </div>
        </div>
      </div>
    </div>
  );
};

// =================== FLOATING ACTION BUTTON ===================

interface FloatingActionButtonProps {
  isRecording: boolean;
  isTranscribing: boolean;
  onClick: () => void;
  theme: AppleTheme;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  isRecording,
  isTranscribing,
  onClick,
  theme,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={isTranscribing}
      className="fixed bottom-8 right-8 w-16 h-16 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
      style={{
        background: isRecording ? theme.gradients.recording : theme.gradients.primary,
        boxShadow: `${theme.shadows.elevated}, 0 0 30px ${isRecording ? 'rgba(255, 69, 58, 0.3)' : 'rgba(102, 126, 234, 0.3)'}`,
        backdropFilter: theme.blur.medium,
        WebkitBackdropFilter: theme.blur.medium,
      }}
    >
      {/* Pulse animation for recording */}
      {isRecording && (
        <div className="absolute inset-0 rounded-full animate-ping" style={{ background: theme.gradients.recording, opacity: 0.7 }} />
      )}

      {/* Icon */}
      <div className="relative z-10 flex items-center justify-center">
        {isTranscribing ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : isRecording ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        )}
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-black bg-opacity-75 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </div>
    </button>
  );
};

// =================== PREMIUM NAVIGATION ===================

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface PremiumNavigationProps {
  items: NavigationItem[];
  currentView: string;
  onViewChange: (viewId: string) => void;
  theme: AppleTheme;
}

export const PremiumNavigation: React.FC<PremiumNavigationProps> = ({
  items,
  currentView,
  onViewChange,
  theme,
}) => {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl backdrop-blur-md" style={{
      background: theme.colors.glassBg,
      border: `1px solid ${theme.colors.borderSubtle}`,
    }}>
      {items.map((item) => {
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative overflow-hidden group`}
            style={{
              color: isActive ? '#ffffff' : theme.colors.textSecondary,
              background: isActive ? theme.gradients.primary : 'transparent',
              fontWeight: isActive ? '600' : '500',
            }}
            title={item.description}
          >
            {/* Hover effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{
              background: theme.colors.text,
              borderRadius: theme.borderRadius.md,
            }} />

            <div className="relative flex items-center gap-2">
              <span className="flex items-center">{item.icon}</span>
              {item.label}
            </div>
          </button>
        );
      })}
    </div>
  );
};

// =================== CSS ANIMATIONS ===================

export const globalStyles = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }

  @keyframes glow {
    0%, 100% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.3); }
    50% { box-shadow: 0 0 30px rgba(102, 126, 234, 0.5); }
  }

  .animate-float {
    animation: float 3s ease-in-out infinite;
  }

  .animate-glow {
    animation: glow 2s ease-in-out infinite;
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }

  /* Smooth transitions */
  * {
    transition-property: background-color, border-color, color, fill, stroke, opacity, box-shadow, transform;
    transition-timing-function: cubic-bezier(0.4, 0.0, 0.2, 1);
  }
`;