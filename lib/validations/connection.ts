import { z } from 'zod';

export const connectionQuerySchema = z.object({
  token: z.string().min(1, 'Token is required'),
  dataSource: z.string().min(1, 'Data source is required'),
  limit: z.string().optional(),
  username: z.string().optional(),
});

export const sessionIdSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  token: z.string().min(1, 'Token is required'),
  dataSource: z.string().min(1, 'Data source is required'),
});

export type ConnectionQueryInput = z.infer<typeof connectionQuerySchema>;
export type SessionIdInput = z.infer<typeof sessionIdSchema>;
