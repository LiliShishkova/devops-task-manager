function createMetricsTracker() {
  const state = {
    requestsTotal: 0,
    requestsByStatus: {},
    cumulativeDurationMs: 0,
  };

  return {
    recordRequest({ statusCode, durationMs }) {
      state.requestsTotal += 1;
      state.requestsByStatus[statusCode] = (state.requestsByStatus[statusCode] || 0) + 1;
      state.cumulativeDurationMs += durationMs;
    },

    render({ taskCount }) {
      const averageDuration = state.requestsTotal === 0 ? 0 : state.cumulativeDurationMs / state.requestsTotal;
      const lines = [
        '# HELP devops_task_manager_requests_total Total HTTP requests handled by the backend',
        '# TYPE devops_task_manager_requests_total counter',
        `devops_task_manager_requests_total ${state.requestsTotal}`,
        '# HELP devops_task_manager_tasks_total Total tasks currently tracked by the backend',
        '# TYPE devops_task_manager_tasks_total gauge',
        `devops_task_manager_tasks_total ${taskCount}`,
        '# HELP devops_task_manager_request_duration_average_ms Average request duration in milliseconds',
        '# TYPE devops_task_manager_request_duration_average_ms gauge',
        `devops_task_manager_request_duration_average_ms ${averageDuration.toFixed(2)}`,
      ];

      Object.entries(state.requestsByStatus).forEach(([statusCode, count]) => {
        lines.push(
          '# HELP devops_task_manager_requests_by_status_total Requests partitioned by response status code',
          '# TYPE devops_task_manager_requests_by_status_total counter',
          `devops_task_manager_requests_by_status_total{status="${statusCode}"} ${count}`
        );
      });

      return `${lines.join('\n')}\n`;
    },
  };
}

module.exports = {
  createMetricsTracker,
};
