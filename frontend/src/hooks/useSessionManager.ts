import { useState, useCallback, useEffect } from 'react';
import type { LectureSession, TranscriptSegment, UsageStats } from '../types';
import { storage } from '../utils/storage';
import { calculateTotalSessionCost } from '../utils/billing';

export const useSessionManager = () => {
  const [currentSession, setCurrentSession] = useState<LectureSession | null>(null);
  const [sessions, setSessions] = useState<LectureSession[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats>({
    totalMinutes: 0,
    totalCost: 0,
    sessionsCount: 0,
    currentMonthUsage: 0,
    currentMonthCost: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Initialize data on mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        await storage.initialize();
        const [savedSessions, savedStats] = await Promise.all([
          storage.getAllSessions(),
          storage.getUsageStats(),
        ]);

        setSessions(savedSessions);
        setUsageStats(savedStats);
      } catch (error) {
        console.error('Failed to initialize session data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  const createSession = useCallback((name: string, language: 'zh' | 'en' | 'mixed' = 'mixed'): LectureSession => {
    const newSession: LectureSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim() || `Lecture ${new Date().toLocaleDateString()}`,
      startTime: Date.now(),
      segments: [],
      language,
      duration: 0,
      wordCount: 0,
      cost: 0,
      status: 'recording',
    };

    setCurrentSession(newSession);
    return newSession;
  }, []);

  const updateSession = useCallback(async (updates: Partial<LectureSession>) => {
    if (!currentSession) return;

    const updatedSession = { ...currentSession, ...updates };
    setCurrentSession(updatedSession);

    try {
      await storage.saveSession(updatedSession);

      // Update sessions list
      setSessions(prev => {
        const index = prev.findIndex(s => s.id === updatedSession.id);
        if (index >= 0) {
          const newSessions = [...prev];
          newSessions[index] = updatedSession;
          return newSessions;
        } else {
          return [updatedSession, ...prev];
        }
      });
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  }, [currentSession]);

  const addSegment = useCallback(async (segment: TranscriptSegment) => {
    if (!currentSession) return;

    const updatedSegments = [...currentSession.segments, segment];
    const wordCount = updatedSegments.reduce((acc, seg) => acc + seg.text.split(' ').length, 0);

    await updateSession({
      segments: updatedSegments,
      wordCount,
    });
  }, [currentSession, updateSession]);

  const completeSession = useCallback(async (
    endTime?: number,
    summary?: string
  ): Promise<LectureSession | null> => {
    if (!currentSession) return null;

    const finalEndTime = endTime || Date.now();
    const duration = Math.floor((finalEndTime - currentSession.startTime) / 1000);
    const durationMinutes = duration / 60;
    const finalCost = calculateTotalSessionCost(durationMinutes, currentSession.wordCount, !!summary);

    const completedSession: LectureSession = {
      ...currentSession,
      endTime: finalEndTime,
      duration,
      cost: finalCost,
      summary,
      status: 'completed',
    };

    try {
      await storage.saveSession(completedSession);
      await storage.updateUsageStats(durationMinutes, finalCost);

      // Update usage stats
      const newStats = await storage.getUsageStats();
      setUsageStats(newStats);

      // Update sessions list
      setSessions(prev => {
        const filtered = prev.filter(s => s.id !== completedSession.id);
        return [completedSession, ...filtered];
      });

      setCurrentSession(null);
      return completedSession;
    } catch (error) {
      console.error('Failed to complete session:', error);
      return null;
    }
  }, [currentSession]);

  const cancelSession = useCallback(async () => {
    if (!currentSession) return;

    try {
      await storage.deleteSession(currentSession.id);
      await storage.deleteAudioBlob(currentSession.id);

      setSessions(prev => prev.filter(s => s.id !== currentSession.id));
      setCurrentSession(null);
    } catch (error) {
      console.error('Failed to cancel session:', error);
    }
  }, [currentSession]);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await storage.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));

      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  }, [currentSession]);

  const getSession = useCallback(async (sessionId: string): Promise<LectureSession | null> => {
    try {
      const session = await storage.getSession(sessionId);
      return session || null;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }, []);

  const getRecentSessions = useCallback(async (limit: number = 10): Promise<LectureSession[]> => {
    try {
      return await storage.getRecentSessions(limit);
    } catch (error) {
      console.error('Failed to get recent sessions:', error);
      return [];
    }
  }, []);

  const searchSessions = useCallback((query: string): LectureSession[] => {
    const lowercaseQuery = query.toLowerCase();
    return sessions.filter(session => {
      const nameMatch = session.name.toLowerCase().includes(lowercaseQuery);
      const contentMatch = session.segments.some(segment =>
        segment.text.toLowerCase().includes(lowercaseQuery)
      );
      const summaryMatch = session.summary?.toLowerCase().includes(lowercaseQuery);

      return nameMatch || contentMatch || summaryMatch;
    });
  }, [sessions]);

  const saveAudioBlob = useCallback(async (blob: Blob) => {
    if (!currentSession) return;

    try {
      await storage.saveAudioBlob(currentSession.id, blob);
    } catch (error) {
      console.error('Failed to save audio blob:', error);
    }
  }, [currentSession]);

  const getAudioBlob = useCallback(async (sessionId?: string): Promise<Blob | null> => {
    const targetId = sessionId || currentSession?.id;
    if (!targetId) return null;

    try {
      const blob = await storage.getAudioBlob(targetId);
      return blob || null;
    } catch (error) {
      console.error('Failed to get audio blob:', error);
      return null;
    }
  }, [currentSession]);

  const cleanupOldData = useCallback(async () => {
    try {
      await storage.cleanupOldAudioBlobs();
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }, []);

  const exportAllData = useCallback(async (): Promise<string> => {
    try {
      return await storage.exportData();
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }, []);

  const importData = useCallback(async (jsonData: string) => {
    try {
      await storage.importData(jsonData);

      // Refresh sessions and stats
      const [newSessions, newStats] = await Promise.all([
        storage.getAllSessions(),
        storage.getUsageStats(),
      ]);

      setSessions(newSessions);
      setUsageStats(newStats);
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }, []);

  const clearAllData = useCallback(async () => {
    try {
      await storage.clearAllData();

      setSessions([]);
      setCurrentSession(null);
      setUsageStats({
        totalMinutes: 0,
        totalCost: 0,
        sessionsCount: 0,
        currentMonthUsage: 0,
        currentMonthCost: 0,
      });
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }, []);

  const getSessionStats = useCallback(() => {
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const averageDuration = sessions.length > 0
      ? sessions.reduce((acc, s) => acc + s.duration, 0) / sessions.length
      : 0;
    const averageCost = sessions.length > 0
      ? sessions.reduce((acc, s) => acc + s.cost, 0) / sessions.length
      : 0;

    const thisWeekSessions = sessions.filter(s => {
      const sessionDate = new Date(s.startTime);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return sessionDate > weekAgo;
    });

    return {
      total: totalSessions,
      completed: completedSessions,
      thisWeek: thisWeekSessions.length,
      averageDuration,
      averageCost,
      mostActiveDay: getMostActiveDay(sessions),
      longestSession: sessions.reduce((max, s) => s.duration > max.duration ? s : max, sessions[0]),
    };
  }, [sessions]);

  return {
    // State
    currentSession,
    sessions,
    usageStats,
    isLoading,

    // Session management
    createSession,
    updateSession,
    addSegment,
    completeSession,
    cancelSession,
    deleteSession,
    getSession,
    getRecentSessions,
    searchSessions,

    // Audio management
    saveAudioBlob,
    getAudioBlob,

    // Data management
    cleanupOldData,
    exportAllData,
    importData,
    clearAllData,

    // Statistics
    getSessionStats,
  };
};

function getMostActiveDay(sessions: LectureSession[]): string {
  const dayCounts: Record<string, number> = {};
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  sessions.forEach(session => {
    const day = days[new Date(session.startTime).getDay()];
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });

  let maxDay = 'Monday';
  let maxCount = 0;

  Object.entries(dayCounts).forEach(([day, count]) => {
    if (count > maxCount) {
      maxDay = day;
      maxCount = count;
    }
  });

  return maxDay;
}