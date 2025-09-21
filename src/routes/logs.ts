import { FastifyInstance, RequestGenericInterface } from 'fastify';
import { LogStorage, LogQueryOptions, LogQueryResult } from '../config/logging';
import basicAuth from 'basic-auth';
import { IAPIResponse } from '../types/auth';

interface LogQueryParams extends RequestGenericInterface {
  Querystring: {
    page?: string;
    limit?: string;
    level?: string;
    method?: string;
    statusCode?: string;
    userId?: string;
    url?: string;
    startDate?: string;
    endDate?: string;
  };
}

interface LogDetailParams extends RequestGenericInterface {
  Params: {
    id: string;
  };
}

/**
 * Log routes with UI similar to BullMQ
 * Provides web interface for viewing API logs, requests, and responses
 */
export default async function logRoutes(fastify: FastifyInstance) {
  const logStorage = new LogStorage(fastify.redis);

  // Basic authentication middleware for log viewer
  const authenticate = async (request: any, reply: any) => {
    const credentials = basicAuth(request);
    
    // Check environment variables for auth config
    const username = process.env.LOG_VIEWER_USERNAME || 'admin';
    const password = process.env.LOG_VIEWER_PASSWORD || 'admin123';

    if (!credentials || credentials.name !== username || credentials.pass !== password) {
      reply.header('WWW-Authenticate', 'Basic realm="Log Viewer"');
      return reply.status(401).send('Authentication required');
    }
  };

  /**
   * Get logs with filtering and pagination (API endpoint)
   */
  fastify.get<LogQueryParams>('/api/logs', {
    preHandler: [authenticate],
    schema: {
      querystring: {
        page: { type: 'string', pattern: '^\\d+$' },
        limit: { type: 'string', pattern: '^\\d+$' },
        level: { type: 'string', enum: ['info', 'warn', 'error'] },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
        statusCode: { type: 'string', pattern: '^\\d+$' },
        userId: { type: 'string', pattern: '^\\d+$' },
        url: { type: 'string' },
        startDate: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time' }
      }
    }
  }, async (request, reply) => {
    try {
      const options: LogQueryOptions = {
        page: request.query.page ? parseInt(request.query.page) : undefined,
        limit: request.query.limit ? parseInt(request.query.limit) : undefined,
        level: request.query.level,
        method: request.query.method,
        statusCode: request.query.statusCode ? parseInt(request.query.statusCode) : undefined,
        userId: request.query.userId ? parseInt(request.query.userId) : undefined,
        url: request.query.url,
        startDate: request.query.startDate,
        endDate: request.query.endDate
      };

      const result = await logStorage.getLogs(options);
      
      const response: IAPIResponse = {
        success: true,
        message: 'Logs retrieved successfully',
        data: result,
        statusCode: 200
      };

      return reply.status(200).send(response);
    } catch (error) {
      fastify.log.error('Error retrieving logs:', error);
      
      const response: IAPIResponse = {
        success: false,
        message: 'Failed to retrieve logs',
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 500
      };

      return reply.status(500).send(response);
    }
  });

  /**
   * Get log statistics (API endpoint)
   */
  fastify.get('/api/logs/stats', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const stats = await logStorage.getStats();
      
      const response: IAPIResponse = {
        success: true,
        message: 'Log statistics retrieved successfully',
        data: stats,
        statusCode: 200
      };

      return reply.status(200).send(response);
    } catch (error) {
      fastify.log.error('Error retrieving log stats:', error);
      
      const response: IAPIResponse = {
        success: false,
        message: 'Failed to retrieve log statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 500
      };

      return reply.status(500).send(response);
    }
  });

  /**
   * Get specific log by ID (API endpoint)
   */
  fastify.get<LogDetailParams>('/api/logs/:id', {
    preHandler: [authenticate],
    schema: {
      params: {
        id: { type: 'string' }
      }
    }
  }, async (request, reply) => {
    try {
      const log = await logStorage.getLogById(request.params.id);
      
      if (!log) {
        const response: IAPIResponse = {
          success: false,
          message: 'Log not found',
          statusCode: 404
        };
        return reply.status(404).send(response);
      }

      const response: IAPIResponse = {
        success: true,
        message: 'Log retrieved successfully',
        data: log,
        statusCode: 200
      };

      return reply.status(200).send(response);
    } catch (error) {
      fastify.log.error('Error retrieving log:', error);
      
      const response: IAPIResponse = {
        success: false,
        message: 'Failed to retrieve log',
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 500
      };

      return reply.status(500).send(response);
    }
  });

  /**
   * Clear all logs (API endpoint)
   */
  fastify.delete('/api/logs', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      await logStorage.clearAllLogs();
      
      const response: IAPIResponse = {
        success: true,
        message: 'All logs cleared successfully',
        statusCode: 200
      };

      return reply.status(200).send(response);
    } catch (error) {
      fastify.log.error('Error clearing logs:', error);
      
      const response: IAPIResponse = {
        success: false,
        message: 'Failed to clear logs',
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 500
      };

      return reply.status(500).send(response);
    }
  });

  /**
   * Log Viewer UI (HTML interface similar to BullMQ)
   */
  fastify.get('/logs', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Logs - Christian Recovery App</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #0d1117;
            color: #c9d1d9;
            line-height: 1.6;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            border: 1px solid #30363d;
        }

        .header h1 {
            color: #58a6ff;
            font-size: 2.5rem;
            margin-bottom: 10px;
        }

        .header p {
            color: #8b949e;
            font-size: 1.1rem;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: #161b22;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #30363d;
            text-align: center;
        }

        .stat-card h3 {
            color: #58a6ff;
            font-size: 2rem;
            margin-bottom: 5px;
        }

        .stat-card p {
            color: #8b949e;
            font-size: 0.9rem;
        }

        .filters {
            background: #161b22;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #30363d;
            margin-bottom: 30px;
        }

        .filters h3 {
            color: #58a6ff;
            margin-bottom: 15px;
        }

        .filter-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }

        .filter-group {
            display: flex;
            flex-direction: column;
        }

        .filter-group label {
            color: #8b949e;
            font-size: 0.9rem;
            margin-bottom: 5px;
        }

        .filter-group input,
        .filter-group select {
            background: #0d1117;
            border: 1px solid #30363d;
            color: #c9d1d9;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.9rem;
        }

        .filter-group input:focus,
        .filter-group select:focus {
            outline: none;
            border-color: #58a6ff;
        }

        .filter-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }

        .btn {
            background: #238636;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: background 0.2s;
        }

        .btn:hover {
            background: #2ea043;
        }

        .btn-secondary {
            background: #21262d;
        }

        .btn-secondary:hover {
            background: #30363d;
        }

        .btn-danger {
            background: #da3633;
        }

        .btn-danger:hover {
            background: #f85149;
        }

        .log-container {
            background: #161b22;
            border-radius: 8px;
            border: 1px solid #30363d;
            overflow: hidden;
        }

        .log-table {
            width: 100%;
            border-collapse: collapse;
        }

        .log-table th {
            background: #0d1117;
            color: #58a6ff;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            border-bottom: 1px solid #30363d;
        }

        .log-table td {
            padding: 12px;
            border-bottom: 1px solid #30363d;
            vertical-align: top;
        }

        .log-table tr:hover {
            background: #0d1117;
        }

        .status-badge {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
        }

        .status-2xx {
            background: #238636;
            color: white;
        }

        .status-3xx {
            background: #0969da;
            color: white;
        }

        .status-4xx {
            background: #f85149;
            color: white;
        }

        .status-5xx {
            background: #da3633;
            color: white;
        }

        .level-badge {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
        }

        .level-info {
            background: #0969da;
            color: white;
        }

        .level-warn {
            background: #9e6a03;
            color: white;
        }

        .level-error {
            background: #da3633;
            color: white;
        }

        .method-badge {
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 600;
            font-family: monospace;
        }

        .method-GET {
            background: #238636;
            color: white;
        }

        .method-POST {
            background: #0969da;
            color: white;
        }

        .method-PUT {
            background: #9e6a03;
            color: white;
        }

        .method-DELETE {
            background: #da3633;
            color: white;
        }

        .method-PATCH {
            background: #8250df;
            color: white;
        }

        .log-url {
            font-family: monospace;
            font-size: 0.9rem;
            color: #58a6ff;
            word-break: break-all;
        }

        .log-time {
            font-size: 0.9rem;
            color: #8b949e;
        }

        .pagination {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            background: #0d1117;
            border-top: 1px solid #30363d;
        }

        .pagination-info {
            color: #8b949e;
        }

        .pagination-controls {
            display: flex;
            gap: 10px;
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: #8b949e;
        }

        .empty-state {
            text-align: center;
            padding: 40px;
            color: #8b949e;
        }

        .empty-state h3 {
            color: #58a6ff;
            margin-bottom: 10px;
        }

        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }

            .header h1 {
                font-size: 2rem;
            }

            .filter-grid {
                grid-template-columns: 1fr;
            }

            .log-table {
                font-size: 0.8rem;
            }

            .log-table th,
            .log-table td {
                padding: 8px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 API Logs</h1>
            <p>Monitor and analyze HTTP requests, responses, and system performance</p>
        </div>

        <div class="stats-grid" id="statsGrid">
            <div class="stat-card">
                <h3 id="totalLogs">-</h3>
                <p>Total Logs</p>
            </div>
            <div class="stat-card">
                <h3 id="infoCount">-</h3>
                <p>Info</p>
            </div>
            <div class="stat-card">
                <h3 id="warnCount">-</h3>
                <p>Warnings</p>
            </div>
            <div class="stat-card">
                <h3 id="errorCount">-</h3>
                <p>Errors</p>
            </div>
        </div>

        <div class="filters">
            <h3>Filters</h3>
            <div class="filter-grid">
                <div class="filter-group">
                    <label for="methodFilter">Method</label>
                    <select id="methodFilter">
                        <option value="">All Methods</option>
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                        <option value="PATCH">PATCH</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="levelFilter">Level</label>
                    <select id="levelFilter">
                        <option value="">All Levels</option>
                        <option value="info">Info</option>
                        <option value="warn">Warning</option>
                        <option value="error">Error</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="statusCodeFilter">Status Code</label>
                    <input type="number" id="statusCodeFilter" placeholder="e.g., 200, 404">
                </div>
                <div class="filter-group">
                    <label for="urlFilter">URL</label>
                    <input type="text" id="urlFilter" placeholder="Filter by URL">
                </div>
                <div class="filter-group">
                    <label for="userIdFilter">User ID</label>
                    <input type="number" id="userIdFilter" placeholder="User ID">
                </div>
                <div class="filter-group">
                    <label for="startDateFilter">Start Date</label>
                    <input type="datetime-local" id="startDateFilter">
                </div>
                <div class="filter-group">
                    <label for="endDateFilter">End Date</label>
                    <input type="datetime-local" id="endDateFilter">
                </div>
            </div>
            <div class="filter-actions">
                <button class="btn" onclick="applyFilters()">Apply Filters</button>
                <button class="btn btn-secondary" onclick="clearFilters()">Clear</button>
                <button class="btn btn-danger" onclick="clearAllLogs()">Clear All Logs</button>
            </div>
        </div>

        <div class="log-container">
            <div class="loading" id="loadingIndicator">Loading logs...</div>
            <div id="logsContent" style="display: none;">
                <table class="log-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Method</th>
                            <th>URL</th>
                            <th>Status</th>
                            <th>Level</th>
                            <th>Response Time</th>
                            <th>User</th>
                        </tr>
                    </thead>
                    <tbody id="logsTableBody">
                    </tbody>
                </table>
                <div class="pagination">
                    <div class="pagination-info" id="paginationInfo"></div>
                    <div class="pagination-controls" id="paginationControls"></div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentPage = 1;
        let currentFilters = {};
        let totalPages = 1;

        // Load initial data
        document.addEventListener('DOMContentLoaded', function() {
            loadStats();
            loadLogs();
        });

        async function loadStats() {
            try {
                const response = await fetch('/api/logs/stats');
                const result = await response.json();
                
                if (result.success) {
                    const stats = result.data;
                    document.getElementById('totalLogs').textContent = stats.total.toLocaleString();
                    document.getElementById('infoCount').textContent = (stats.byLevel.info || 0).toLocaleString();
                    document.getElementById('warnCount').textContent = (stats.byLevel.warn || 0).toLocaleString();
                    document.getElementById('errorCount').textContent = (stats.byLevel.error || 0).toLocaleString();
                }
            } catch (error) {
                console.error('Error loading stats:', error);
            }
        }

        async function loadLogs() {
            const loadingIndicator = document.getElementById('loadingIndicator');
            const logsContent = document.getElementById('logsContent');
            
            loadingIndicator.style.display = 'block';
            logsContent.style.display = 'none';

            try {
                const params = new URLSearchParams({
                    page: currentPage.toString(),
                    limit: '50',
                    ...currentFilters
                });

                const response = await fetch(\`/api/logs?\${params}\`);
                const result = await response.json();

                if (result.success) {
                    displayLogs(result.data);
                    totalPages = result.data.totalPages;
                    updatePagination(result.data);
                } else {
                    displayError(result.message);
                }
            } catch (error) {
                displayError('Failed to load logs');
                console.error('Error loading logs:', error);
            } finally {
                loadingIndicator.style.display = 'none';
                logsContent.style.display = 'block';
            }
        }

        function displayLogs(data) {
            const tbody = document.getElementById('logsTableBody');
            
            if (data.logs.length === 0) {
                tbody.innerHTML = \`
                    <tr>
                        <td colspan="7" class="empty-state">
                            <h3>No logs found</h3>
                            <p>Try adjusting your filters or check back later.</p>
                        </td>
                    </tr>
                \`;
                return;
            }

            tbody.innerHTML = data.logs.map(log => \`
                <tr>
                    <td class="log-time" title="\${log.timestamp}">
                        \${new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>
                        <span class="method-badge method-\${log.method}">\${log.method}</span>
                    </td>
                    <td class="log-url" title="\${log.url}">\${log.url}</td>
                    <td>
                        <span class="status-badge status-\${Math.floor(log.statusCode / 100)}xx">
                            \${log.statusCode}
                        </span>
                    </td>
                    <td>
                        <span class="level-badge level-\${log.level}">\${log.level.toUpperCase()}</span>
                    </td>
                    <td>\${log.responseTime}ms</td>
                    <td>\${log.userId || '-'}</td>
                </tr>
            \`).join('');
        }

        function updatePagination(data) {
            const paginationInfo = document.getElementById('paginationInfo');
            const paginationControls = document.getElementById('paginationControls');

            paginationInfo.textContent = \`Showing \${(data.page - 1) * data.limit + 1} to \${Math.min(data.page * data.limit, data.total)} of \${data.total} logs\`;

            let controlsHTML = '';
            
            if (data.page > 1) {
                controlsHTML += \`<button class="btn btn-secondary" onclick="changePage(\${data.page - 1})">Previous</button>\`;
            }

            if (data.page < data.totalPages) {
                controlsHTML += \`<button class="btn btn-secondary" onclick="changePage(\${data.page + 1})">Next</button>\`;
            }

            paginationControls.innerHTML = controlsHTML;
        }

        function changePage(page) {
            currentPage = page;
            loadLogs();
        }

        function applyFilters() {
            currentFilters = {};
            
            const method = document.getElementById('methodFilter').value;
            const level = document.getElementById('levelFilter').value;
            const statusCode = document.getElementById('statusCodeFilter').value;
            const url = document.getElementById('urlFilter').value;
            const userId = document.getElementById('userIdFilter').value;
            const startDate = document.getElementById('startDateFilter').value;
            const endDate = document.getElementById('endDateFilter').value;

            if (method) currentFilters.method = method;
            if (level) currentFilters.level = level;
            if (statusCode) currentFilters.statusCode = statusCode;
            if (url) currentFilters.url = url;
            if (userId) currentFilters.userId = userId;
            if (startDate) currentFilters.startDate = startDate;
            if (endDate) currentFilters.endDate = endDate;

            currentPage = 1;
            loadLogs();
        }

        function clearFilters() {
            currentFilters = {};
            currentPage = 1;
            
            document.getElementById('methodFilter').value = '';
            document.getElementById('levelFilter').value = '';
            document.getElementById('statusCodeFilter').value = '';
            document.getElementById('urlFilter').value = '';
            document.getElementById('userIdFilter').value = '';
            document.getElementById('startDateFilter').value = '';
            document.getElementById('endDateFilter').value = '';

            loadLogs();
        }

        async function clearAllLogs() {
            if (!confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
                return;
            }

            try {
                const response = await fetch('/api/logs', { method: 'DELETE' });
                const result = await response.json();

                if (result.success) {
                    alert('All logs have been cleared successfully.');
                    location.reload();
                } else {
                    alert('Failed to clear logs: ' + result.message);
                }
            } catch (error) {
                alert('Failed to clear logs. Please try again.');
                console.error('Error clearing logs:', error);
            }
        }

        function displayError(message) {
            const tbody = document.getElementById('logsTableBody');
            tbody.innerHTML = \`
                <tr>
                    <td colspan="7" class="empty-state">
                        <h3>Error</h3>
                        <p>\${message}</p>
                    </td>
                </tr>
            \`;
        }
    </script>
</body>
</html>`;

    return reply.type('text/html').send(html);
  });
}
