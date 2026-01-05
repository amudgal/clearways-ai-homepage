// API Call Tracker Service
// Tracks Google API calls per ROC to enforce limits and optimize costs

class ApiCallTracker {
  private callCounts: Map<string, number> = new Map(); // rocNumber -> call count
  private maxCallsPerROC: number = 10; // Default limit: 10 calls per ROC
  private callHistory: Map<string, Array<{ timestamp: Date; query: string; results: number }>> = new Map();

  /**
   * Set the maximum number of API calls allowed per ROC
   */
  setMaxCallsPerROC(maxCalls: number): void {
    this.maxCallsPerROC = maxCalls;
  }

  /**
   * Get the current call count for a ROC
   */
  getCallCount(rocNumber: string): number {
    const normalizedROC = this.normalizeROC(rocNumber);
    return this.callCounts.get(normalizedROC) || 0;
  }

  /**
   * Check if we can make another API call for this ROC
   */
  canMakeCall(rocNumber: string): boolean {
    const normalizedROC = this.normalizeROC(rocNumber);
    const currentCount = this.getCallCount(normalizedROC);
    return currentCount < this.maxCallsPerROC;
  }

  /**
   * Record an API call
   */
  recordCall(rocNumber: string, query: string, results: number): boolean {
    const normalizedROC = this.normalizeROC(rocNumber);
    
    if (!this.canMakeCall(normalizedROC)) {
      return false; // Limit exceeded
    }

    const currentCount = this.getCallCount(normalizedROC);
    this.callCounts.set(normalizedROC, currentCount + 1);

    // Record in history
    if (!this.callHistory.has(normalizedROC)) {
      this.callHistory.set(normalizedROC, []);
    }
    this.callHistory.get(normalizedROC)!.push({
      timestamp: new Date(),
      query,
      results,
    });

    return true; // Call recorded successfully
  }

  /**
   * Update the results count for the last API call
   * Used when we record the call before making the request, then update with actual results
   */
  updateLastCallResults(rocNumber: string, results: number): void {
    const normalizedROC = this.normalizeROC(rocNumber);
    const history = this.getCallHistory(normalizedROC);
    if (history.length > 0) {
      history[history.length - 1].results = results;
    }
  }

  /**
   * Get remaining calls for a ROC
   */
  getRemainingCalls(rocNumber: string): number {
    const normalizedROC = this.normalizeROC(rocNumber);
    const currentCount = this.getCallCount(normalizedROC);
    return Math.max(0, this.maxCallsPerROC - currentCount);
  }

  /**
   * Get call history for a ROC
   */
  getCallHistory(rocNumber: string): Array<{ timestamp: Date; query: string; results: number }> {
    const normalizedROC = this.normalizeROC(rocNumber);
    return this.callHistory.get(normalizedROC) || [];
  }

  /**
   * Get statistics for a ROC
   */
  getStats(rocNumber: string): {
    totalCalls: number;
    remainingCalls: number;
    maxCalls: number;
    averageResults: number;
    successfulCalls: number; // Calls that returned results
  } {
    const normalizedROC = this.normalizeROC(rocNumber);
    const history = this.getCallHistory(normalizedROC);
    const totalCalls = history.length;
    const successfulCalls = history.filter(h => h.results > 0).length;
    const averageResults = totalCalls > 0
      ? history.reduce((sum, h) => sum + h.results, 0) / totalCalls
      : 0;

    return {
      totalCalls,
      remainingCalls: this.getRemainingCalls(normalizedROC),
      maxCalls: this.maxCallsPerROC,
      averageResults: Math.round(averageResults * 10) / 10,
      successfulCalls,
    };
  }

  /**
   * Reset call count for a ROC (useful for testing or retries)
   */
  reset(rocNumber: string): void {
    const normalizedROC = this.normalizeROC(rocNumber);
    this.callCounts.delete(normalizedROC);
    this.callHistory.delete(normalizedROC);
  }

  /**
   * Reset all call counts
   */
  resetAll(): void {
    this.callCounts.clear();
    this.callHistory.clear();
  }

  /**
   * Normalize ROC number (remove non-numeric characters)
   */
  private normalizeROC(rocNumber: string): string {
    if (!rocNumber) return 'unknown';
    const normalized = rocNumber.replace(/[^0-9]/g, '') || rocNumber;
    return normalized || 'unknown';
  }
}

// Export singleton instance
export const apiCallTracker = new ApiCallTracker();

