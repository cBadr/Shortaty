import { UAParser } from "ua-parser-js";
import type { DeviceInfo, DeviceType } from "./types";

const MOBILE_OS = new Set(["iOS", "Android", "HarmonyOS", "KaiOS", "Windows Phone"]);
const DESKTOP_OS = new Set([
  "Windows", "Mac OS", "macOS", "Linux", "Ubuntu", "Fedora",
  "Debian", "CentOS", "RedHat", "Chrome OS",
]);

export function parseDevice(userAgent: string): DeviceInfo {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const os = result.os.name ?? null;
  const rawDeviceType = result.device.type;

  let type: DeviceType = "unknown";
  if (rawDeviceType === "mobile") type = "mobile";
  else if (rawDeviceType === "tablet") type = "tablet";
  else if (rawDeviceType === undefined) {
    if (os && DESKTOP_OS.has(os)) type = "desktop";
    else if (os && MOBILE_OS.has(os)) type = "mobile";
    else type = "desktop";
  }

  return {
    type,
    os,
    osVersion: result.os.version ?? null,
    browser: result.browser.name ?? null,
    browserVersion: result.browser.version ?? null,
    vendor: result.device.vendor ?? null,
    model: result.device.model ?? null,
    userAgent,
  };
}
