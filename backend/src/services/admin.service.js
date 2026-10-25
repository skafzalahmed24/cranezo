class AdminService {
  /**
   * Sample static dashboard look telemetry stats for Cranzo
   */
  async getDashboardStats() {
    return {
      activeCranes: {
        active: 48,
        total: 52,
        jobSites: 14,
        label: 'Deployed across 14 job sites'
      },
      transportUnits: {
        total: 126,
        status: 'Real-time GPS telemetry active',
        label: 'Real-time GPS telemetry active'
      },
      operatorsOnDuty: {
        total: 94,
        certified: 94,
        label: 'All safety compliance verified'
      },
      telemetryNodes: {
        connectedFleets: 52,
        loadPlanningEngine: 'Calibrated',
        systemDiagnostic: '99.4% Ready'
      }
    };
  }
}

module.exports = new AdminService();
