export type DeviceType = "mobile" | "tablet" | "desktop" | "bot" | "unknown";

export interface DeviceInfo {
  type: DeviceType;
  os: string | null;
  osVersion: string | null;
  browser: string | null;
  browserVersion: string | null;
  vendor: string | null;
  model: string | null;
  userAgent: string;
}

export interface GeoInfo {
  country: string | null;       // ISO 3166-1 alpha-2 (e.g. "EG")
  region: string | null;
  city: string | null;
  timezone: string | null;
  ip: string | null;
}

export interface BotInfo {
  isBot: boolean;
  name: string | null;          // "Googlebot" | "Telegrambot" | "facebookexternalhit" | ...
  isPreview: boolean;           // social media link preview crawler
}

export interface UtmParams {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
}

export interface VisitorContext {
  device: DeviceInfo;
  geo: GeoInfo;
  bot: BotInfo;
  utm: UtmParams;
  language: string | null;      // primary language from Accept-Language
  referrer: string | null;
  referrerDomain: string | null;
  isVpn: boolean;
  isProxy: boolean;
  fingerprint: string;          // stable hash for "unique visitor"
  visitorType: "new" | "returning";
  hour: number;                 // 0–23 in their tz (or UTC if unknown)
  weekday: number;              // 0=Sun … 6=Sat
}

export type RuleConditions = Partial<{
  os: string | string[];
  device: DeviceType | DeviceType[];
  browser: string | string[];
  country: string | string[];
  language: string | string[];
  referrer_domain: string | string[];
  utm_source: string | string[];
  utm_medium: string | string[];
  utm_campaign: string | string[];
  is_bot: boolean;
  is_vpn: boolean;
  visitor_type: "new" | "returning";
  time_range: { from: string; to: string; tz?: string }; // "09:00", "22:00"
  weekday: number | number[];
}>;

export interface LinkRule {
  id: string;
  priority: number;
  conditions: RuleConditions;
  destination_url: string;
  is_active: boolean;
}
