/**
 * Configuration loader from environment variables
 */

import type { Account, Config } from "./types/index.js";

const REQUIRED_ENV_VARS = ["DISCORD_WEBHOOK_URL"] as const;
const DEFAULT_CRON_SCHEDULE = "0 1 * * *"; // Daily at 1 AM
const DEFAULT_TIMEZONE = "Asia/Seoul";

const DEFAULT_USERNAME = "Endfield Auto Check-In";
const DEFAULT_AVATAR_URL =
  "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/assets/avatar.png";

/**
 * Load and validate application configuration
 * @throws {Error} If required environment variables are missing
 */
export function loadConfig(): Config {
  validateRequiredEnvVars();

  const discordWebhook = process.env["DISCORD_WEBHOOK_URL"]!;
  const discordWebhookUsername =
    process.env["DISCORD_WEBHOOK_USERNAME"] ?? DEFAULT_USERNAME;
  const discordWebhookAvatarUrl =
    process.env["DISCORD_WEBHOOK_AVATAR_URL"] ?? DEFAULT_AVATAR_URL;
  const cronSchedule = process.env["CRON_CHECKIN"] ?? DEFAULT_CRON_SCHEDULE;
  const timezone = process.env["TIMEZONE"] ?? DEFAULT_TIMEZONE;
  const accounts = loadAccounts();

  if (accounts.length === 0) {
    throw new Error(
      "No accounts configured. Please set ACCOUNT_1_CRED, and ACCOUNT_1_SK_GAME_ROLE",
    );
  }

  return {
    discordWebhook,
    discordWebhookUsername,
    discordWebhookAvatarUrl,
    cronSchedule,
    timezone,
    accounts,
  };
}

/**
 * Validate required environment variables
 * @throws {Error} If any required variable is missing
 */
function validateRequiredEnvVars(): void {
  const missing = REQUIRED_ENV_VARS.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

/**
 * Load account configurations from environment variables
 * Pattern: ACCOUNT_N_CRED, ACCOUNT_N_SK_GAME_ROLE
 */
function loadAccounts(): Account[] {
  const accountMap = new Map<number, Partial<Record<string, string>>>();
  const accountPattern = /^ACCOUNT_(\d+)_(.+)$/;

  // Group environment variables by account number
  for (const [key, value] of Object.entries(process.env)) {
    if (!value) continue;

    const match = accountPattern.exec(key);
    if (!match || !match[1] || !match[2]) continue;

    const accountNum = parseInt(match[1], 10);
    const field = match[2].toLowerCase();

    if (!accountMap.has(accountNum)) {
      accountMap.set(accountNum, {});
    }

    const accountData = accountMap.get(accountNum)!;
    accountData[field] = value;
  }

  // Convert to Account objects and validate
  const accounts: Account[] = [];

  for (const [num, data] of Array.from(accountMap.entries()).sort(
    ([a], [b]) => a - b,
  )) {
    const { cred, sk_game_role } = data;

    if (!cred || !sk_game_role) {
      const missing: string[] = [];
      if (!cred) missing.push("CRED");
      if (!sk_game_role) missing.push("SK_GAME_ROLE");

      throw new Error(
        `Account ${num} is missing required fields: ${missing.join(", ")}`,
      );
    }

    accounts.push({
      cred,
      sk_game_role,
    });
  }

  return accounts;
}
