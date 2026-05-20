import { isbot } from "isbot";
import type { BotInfo } from "./types";

const PREVIEW_BOTS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /TelegramBot/i, name: "TelegramBot" },
  { pattern: /facebookexternalhit|Facebot/i, name: "facebookexternalhit" },
  { pattern: /WhatsApp/i, name: "WhatsApp" },
  { pattern: /Twitterbot/i, name: "Twitterbot" },
  { pattern: /LinkedInBot/i, name: "LinkedInBot" },
  { pattern: /Slackbot/i, name: "Slackbot" },
  { pattern: /Discordbot/i, name: "Discordbot" },
  { pattern: /SkypeUriPreview/i, name: "SkypeUriPreview" },
  { pattern: /Pinterest/i, name: "Pinterest" },
  { pattern: /redditbot/i, name: "redditbot" },
];

const NAMED_BOTS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /Googlebot/i, name: "Googlebot" },
  { pattern: /bingbot/i, name: "bingbot" },
  { pattern: /YandexBot/i, name: "YandexBot" },
  { pattern: /DuckDuckBot/i, name: "DuckDuckBot" },
  { pattern: /Baiduspider/i, name: "Baiduspider" },
  { pattern: /AhrefsBot/i, name: "AhrefsBot" },
  { pattern: /SemrushBot/i, name: "SemrushBot" },
  { pattern: /MJ12bot/i, name: "MJ12bot" },
  { pattern: /Applebot/i, name: "Applebot" },
];

export function detectBot(userAgent: string): BotInfo {
  if (!userAgent) return { isBot: false, name: null, isPreview: false };

  for (const { pattern, name } of PREVIEW_BOTS) {
    if (pattern.test(userAgent)) {
      return { isBot: true, name, isPreview: true };
    }
  }

  for (const { pattern, name } of NAMED_BOTS) {
    if (pattern.test(userAgent)) {
      return { isBot: true, name, isPreview: false };
    }
  }

  if (isbot(userAgent)) {
    return { isBot: true, name: "generic-bot", isPreview: false };
  }

  return { isBot: false, name: null, isPreview: false };
}
