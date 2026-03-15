import { prisma } from '@/lib/prisma';
import { ActivityLogCategory, ActivityLogLevel } from './generated/prisma/enums';

interface LogEntry {
  level: ActivityLogLevel;
  category: ActivityLogCategory;
  message: string;
  username?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

class Logger {
  private enableAuthLogging: boolean;
  private enableConnectionLogging: boolean;
  private enableAnalytics: boolean;

  constructor() {
    this.enableAuthLogging = process.env.ENABLE_AUTH_LOGGING === 'true';
    this.enableConnectionLogging = process.env.ENABLE_CONNECTION_LOGGING === 'true';
    this.enableAnalytics = process.env.ENABLE_USAGE_ANALYTICS === 'true';
  }

  async log(entry: LogEntry) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${entry.level}] [${entry.category}] ${entry.message}`;

    // Console log
    switch (entry.level) {
      case 'ERROR':
        console.error(logMessage, entry.metadata);
        break;
      case 'WARN':
        console.warn(logMessage, entry.metadata);
        break;
      case 'SUCCESS':
        console.log(`✅ ${logMessage}`, entry.metadata);
        break;
      default:
        console.log(logMessage, entry.metadata);
    }

    // Database log (if enabled)
    try {
      if (this.shouldLog(entry.category)) {
        await prisma.activityLog.create({
          data: {
            level: entry.level,
            category: entry.category,
            message: entry.message,
            username: entry.username,
            ipAddress: entry.ipAddress,
            metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
            timestamp: new Date(),
          },
        });
      }
    } catch (error) {
      console.error('Failed to write log to database:', error);
    }
  }

  private shouldLog(category: ActivityLogCategory): boolean {
    switch (category) {
      case 'AUTH':
        return this.enableAuthLogging;
      case 'CONNECTION':
        return this.enableConnectionLogging;
      default:
        return true;
    }
  }

  // Convenience methods
  async logAuth(message: string, username?: string, ipAddress?: string, metadata?: any) {
    await this.log({
      level: 'INFO',
      category: 'AUTH',
      message,
      username,
      ipAddress,
      metadata,
    });
  }

  async logAuthSuccess(username: string, ipAddress?: string) {
    await this.log({
      level: 'SUCCESS',
      category: 'AUTH',
      message: `User ${username} logged in successfully`,
      username,
      ipAddress,
    });
  }

  async logAuthFailure(username: string, ipAddress?: string, reason?: string) {
    await this.log({
      level: 'WARN',
      category: 'AUTH',
      message: `Failed login attempt for user ${username}${reason ? `: ${reason}` : ''}`,
      username,
      ipAddress,
      metadata: { reason },
    });
  }

  async logConnection(
    username: string,
    connectionId: string,
    connectionName: string,
    action: 'START' | 'END',
    metadata?: any,
  ) {
    await this.log({
      level: 'INFO',
      category: 'CONNECTION',
      message: `User ${username} ${action === 'START' ? 'connected to' : 'disconnected from'} ${connectionName} (ID: ${connectionId})`,
      username,
      metadata: {
        connectionId,
        connectionName,
        action,
        ...metadata,
      },
    });
  }
}

export const logger = new Logger();
