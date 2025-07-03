import crypto from 'crypto';

interface AuthToken {
  userId: number;
  username: string;
  role: string;
  createdAt: number;
  expiresAt: number;
}

// In-memory token store (in production, use Redis or database)
const tokens = new Map<string, AuthToken>();

export function createAuthToken(userId: number, username: string, role: string): string {
  const tokenId = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours
  
  const token = {
    userId,
    username,
    role,
    createdAt: now,
    expiresAt
  };
  
  tokens.set(tokenId, token);
  
  // Clean up expired tokens periodically
  setTimeout(() => cleanupExpiredTokens(), 60 * 60 * 1000); // Check every hour
  
  return tokenId;
}

export function validateAuthToken(tokenId: string): AuthToken | null {
  const token = tokens.get(tokenId);
  
  if (!token) {
    return null;
  }
  
  if (Date.now() > token.expiresAt) {
    tokens.delete(tokenId);
    return null;
  }
  
  return token;
}

export function deleteAuthToken(tokenId: string): void {
  tokens.delete(tokenId);
}

function cleanupExpiredTokens(): void {
  const now = Date.now();
  const entries = Array.from(tokens.entries());
  for (const [tokenId, token] of entries) {
    if (now > token.expiresAt) {
      tokens.delete(tokenId);
    }
  }
}

export function refreshAuthToken(tokenId: string): string | null {
  const token = validateAuthToken(tokenId);
  if (!token) {
    return null;
  }
  
  // Delete old token
  tokens.delete(tokenId);
  
  // Create new token with extended expiry
  return createAuthToken(token.userId, token.username, token.role);
}