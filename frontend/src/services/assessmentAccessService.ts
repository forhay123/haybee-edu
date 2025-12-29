// ============================================================
// FILE 1: assessmentAccessService.ts (NEW)
// Location: frontend/src/services/assessmentAccessService.ts
// ============================================================

/**
 * Service to manage real-time assessment access polling
 * Handles multiple assessment polling with automatic cleanup
 */

interface PollConfig {
  assessmentId: number;
  studentProfileId: number;
  onAccessChange?: (canAccess: boolean) => void;
  onMinutesChange?: (minutes: number | null) => void;
  interval?: number;
}

class AssessmentAccessService {
  private activePolls: Map<string, NodeJS.Timeout> = new Map();
  private defaultInterval = 30000; // 30 seconds

  /**
   * Generate unique key for poll
   */
  private getKey(assessmentId: number, studentId: number): string {
    return `${assessmentId}-${studentId}`;
  }

  /**
   * Start polling for assessment access
   */
  startPolling(config: PollConfig, pollingFn: () => Promise<any>): void {
    const key = this.getKey(config.assessmentId, config.studentProfileId);
    
    // Clear existing poll if any
    this.stopPolling(config.assessmentId, config.studentProfileId);

    console.log(`🔄 Starting poll for assessment ${key}`);

    // Initial poll
    this.executePoll(pollingFn, config);

    // Set interval
    const interval = setInterval(() => {
      this.executePoll(pollingFn, config);
    }, config.interval || this.defaultInterval);

    this.activePolls.set(key, interval);
  }

  /**
   * Execute a single poll
   */
  private async executePoll(
    pollingFn: () => Promise<any>,
    config: PollConfig
  ): Promise<void> {
    try {
      const result = await pollingFn();
      
      if (config.onAccessChange && typeof result.canAccess === 'boolean') {
        config.onAccessChange(result.canAccess);
      }

      if (config.onMinutesChange && result.minutesRemaining !== undefined) {
        config.onMinutesChange(result.minutesRemaining);
      }
    } catch (error) {
      console.error(`❌ Poll error for assessment ${config.assessmentId}:`, error);
    }
  }

  /**
   * Stop polling for a specific assessment
   */
  stopPolling(assessmentId: number, studentId: number): void {
    const key = this.getKey(assessmentId, studentId);
    
    if (this.activePolls.has(key)) {
      clearInterval(this.activePolls.get(key));
      this.activePolls.delete(key);
      console.log(`⏸️ Stopped poll for assessment ${key}`);
    }
  }

  /**
   * Stop all active polls
   */
  stopAllPolls(): void {
    console.log(`⏹️ Stopping all ${this.activePolls.size} active polls`);
    
    this.activePolls.forEach((interval) => clearInterval(interval));
    this.activePolls.clear();
  }

  /**
   * Get number of active polls
   */
  getActivePolls(): number {
    return this.activePolls.size;
  }
}

// Export singleton instance
export const assessmentAccessService = new AssessmentAccessService();
