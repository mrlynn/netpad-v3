/**
 * Shared CLI Session Token Store
 * 
 * Stores CLI session tokens in memory.
 * In production, this should be replaced with Redis or a database.
 */

export const cliSessionStore = new Map<string, { userId: string; email: string; createdAt: Date }>();
