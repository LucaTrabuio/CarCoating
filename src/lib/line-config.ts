export interface LineConfig {
  channel_id: string;
  channel_secret: string;
  official_account_id: string;
}

export interface LineCoupon {
  id: string;
  store_id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  valid_years: number;
  created_at: string;
  redeemed_at?: string;
}

/**
 * Build the LINE Login authorization URL.
 * Returns '#' when NEXT_PUBLIC_LINE_CHANNEL_ID is not configured.
 */
export function getLineLoginUrl(storeId: string, redirectUri: string): string {
  const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
  if (!channelId) return '#';
  const state = encodeURIComponent(JSON.stringify({ storeId }));
  return `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=profile%20openid`;
}

/** Placeholder for Twilio call-tracking configuration */
export interface TwilioConfig {
  account_sid: string;
  auth_token: string;
  forwarding_numbers: Record<string, string>; // storeId -> Twilio number
}
