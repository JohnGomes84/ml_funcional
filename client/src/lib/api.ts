export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:3001";

export const ALLOWED_EMAIL_DOMAIN =
  (import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN as string | undefined) || "mlservicoseco.com.br";

export const isAllowedEmail = (email: string) => {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(`@${ALLOWED_EMAIL_DOMAIN.toLowerCase()}`);
};
