/**
 * api.js — Central API configuration
 *
 * Resolves the backend base URL dynamically:
 * - In Production (Vercel): uses import.meta.env.VITE_API_URL (e.g., https://your-backend.onrender.com)
 * - In Local Development: empty string, delegating to Vite proxy (/api -> localhost:3001)
 */

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
