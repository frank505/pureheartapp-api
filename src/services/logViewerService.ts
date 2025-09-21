import fs from 'fs-extra';
import path from 'path';
import { RequestLogData } from '../middleware/httpLogging';

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: RequestLogData;
  rawLine: string;
}

export interface PaginatedLogs {
  logs: LogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface LogFilter {
  level?: string;
  method?: string;
  statusCode?: number;
  fromDate?: string;
  toDate?: string;
  searchTerm?: string;
  userId?: string;
}

export class LogViewerService {
  private logsDir: string;

  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
  }

  async getAvailableLogFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.logsDir);
      return files.filter(file => file.endsWith('.log'));
    } catch (error) {
      return [];
    }
  }

  async readLogFile(filename: string, page = 1, limit = 50, filters: LogFilter = {}): Promise<PaginatedLogs> {
    const filePath = path.join(this.logsDir, filename);
    
    if (!await fs.pathExists(filePath)) {
      throw new Error(`Log file ${filename} not found`);
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // Parse log entries
    let logEntries: LogEntry[] = [];
    
    for (const line of lines) {
      try {
        const entry = this.parseLogLine(line);
        if (entry && this.matchesFilter(entry, filters)) {
          logEntries.push(entry);
        }
      } catch (error) {
        // Skip malformed lines
        continue;
      }
    }

    // Sort by timestamp (newest first)
    logEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Pagination
    const total = logEntries.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = logEntries.slice(startIndex, endIndex);

    return {
      logs: paginatedLogs,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  private parseLogLine(line: string): LogEntry | null {
    try {
      // Try parsing as JSON first (for HTTP logs)
      if (line.startsWith('{')) {
        const jsonData = JSON.parse(line);
        return {
          timestamp: jsonData.timestamp,
          level: jsonData.level,
          message: jsonData.message,
          data: jsonData.data || jsonData,
          rawLine: line,
        };
      }

      // Parse winston format logs
      const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}:\d{3})/);
      const levelMatch = line.match(/\s(error|warn|info|http|debug):\s/i);
      
      if (timestampMatch && levelMatch && timestampMatch[1] && levelMatch[1]) {
        const timestamp = timestampMatch[1];
        const level = levelMatch[1].toLowerCase();
        const messageStart = line.indexOf(level + ':') + level.length + 1;
        const message = line.substring(messageStart).trim();

        return {
          timestamp,
          level,
          message,
          rawLine: line,
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private matchesFilter(entry: LogEntry, filters: LogFilter): boolean {
    // Level filter
    if (filters.level && entry.level !== filters.level.toLowerCase()) {
      return false;
    }

    // Method filter
    if (filters.method && entry.data?.method !== filters.method.toUpperCase()) {
      return false;
    }

    // Status code filter
    if (filters.statusCode && entry.data?.statusCode !== filters.statusCode) {
      return false;
    }

    // User ID filter
    if (filters.userId && entry.data?.userId !== filters.userId) {
      return false;
    }

    // Date range filter
    if (filters.fromDate || filters.toDate) {
      const entryDate = new Date(entry.timestamp);
      
      if (filters.fromDate && entryDate < new Date(filters.fromDate)) {
        return false;
      }
      
      if (filters.toDate && entryDate > new Date(filters.toDate)) {
        return false;
      }
    }

    // Search term filter
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      const searchableText = [
        entry.message,
        entry.data?.url,
        entry.data?.userAgent,
        entry.data?.error,
        JSON.stringify(entry.data?.body || {}),
      ].join(' ').toLowerCase();

      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  }

  async getLogStats(filename: string): Promise<any> {
    const filePath = path.join(this.logsDir, filename);
    
    if (!await fs.pathExists(filePath)) {
      throw new Error(`Log file ${filename} not found`);
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    const stats = {
      totalRequests: 0,
      errorRequests: 0,
      averageResponseTime: 0,
      statusCodes: {} as Record<string, number>,
      methods: {} as Record<string, number>,
      topUrls: {} as Record<string, number>,
      recentActivity: [] as any[],
    };

    let totalResponseTime = 0;
    let responseTimeCount = 0;

    for (const line of lines) {
      try {
        const entry = this.parseLogLine(line);
        if (entry?.data) {
          stats.totalRequests++;
          
          if (entry.data.statusCode && entry.data.statusCode >= 400) {
            stats.errorRequests++;
          }

          if (entry.data.statusCode) {
            const statusGroup = `${Math.floor(entry.data.statusCode / 100)}xx`;
            stats.statusCodes[statusGroup] = (stats.statusCodes[statusGroup] || 0) + 1;
          }

          if (entry.data.method) {
            stats.methods[entry.data.method] = (stats.methods[entry.data.method] || 0) + 1;
          }

          if (entry.data.url) {
            stats.topUrls[entry.data.url] = (stats.topUrls[entry.data.url] || 0) + 1;
          }

          if (entry.data.responseTime) {
            totalResponseTime += entry.data.responseTime;
            responseTimeCount++;
          }
        }
      } catch (error) {
        continue;
      }
    }

    if (responseTimeCount > 0) {
      stats.averageResponseTime = Math.round(totalResponseTime / responseTimeCount);
    }

    // Sort top URLs by frequency
    stats.topUrls = Object.fromEntries(
      Object.entries(stats.topUrls)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
    );

    return stats;
  }
}

export const logViewerService = new LogViewerService();
