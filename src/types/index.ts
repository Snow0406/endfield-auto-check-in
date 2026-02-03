/**
 * Type definitions for Endfield Auto Check-In service
 */

/**
 * Account configuration
 */
export interface Account {
  readonly account_token: string;
  readonly sk_game_role: string;
}

/**
 * Runtime credentials obtained from OAuth
 */
export interface RuntimeCredentials {
  readonly cred: string;
  readonly salt: string;
  readonly userId: string;
  readonly hgId?: string;
  readonly obtainedAt: number;
}

/**
 * Application configuration
 */
export interface Config {
  readonly discordWebhook: string;
  readonly discordWebhookUsername: string;
  readonly discordWebhookAvatarUrl: string;
  readonly cronSchedule: string;
  readonly timezone: string;
  readonly accounts: readonly Account[];
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  readonly code: number;
  readonly message?: string;
  readonly data?: T;
}

/**
 * Attendance check response data
 */
export interface AttendanceData {
  readonly hasToday: boolean;
  readonly records?: readonly AttendanceRecord[];
}

export interface AttendanceRecord {
  readonly resourceId: string;
  readonly resourceName: string;
  readonly count: number;
  readonly icon: string;
}

/**
 * Attendance claim response data
 */
export interface ClaimData {
  readonly awardIds: readonly Award[];
  readonly resourceInfoMap: Readonly<Record<string, ResourceInfo>>;
}

export interface Award {
  readonly id: string;
}

export interface ResourceInfo {
  readonly name: string;
  readonly count: number;
  readonly icon: string;
}

/**
 * Reward item
 */
export interface Reward {
  readonly name: string;
  readonly count: number;
  readonly icon: string;
}

/**
 * Check-in operation result
 */
export type CheckInStatus = "claimed" | "already_claimed" | "error";

export interface CheckInResult {
  readonly uid: string;
  readonly status: CheckInStatus;
  readonly rewards: readonly Reward[];
  readonly profile?: UserProfile;
  readonly game?: GameInfo;
  readonly error?: string;
}

export interface UserProfile {
  readonly nickname?: string;
  readonly avatar?: string;
}

export interface GameInfo {
  readonly uid: string;
  readonly level?: number;
}

/**
 * Discord webhook payload
 */
export interface DiscordWebhookPayload {
  readonly username: string;
  readonly avatar_url?: string;
  readonly embeds: readonly DiscordEmbed[];
}

export interface DiscordEmbed {
  readonly title: string;
  readonly description?: string;
  readonly color: number;
  readonly footer?: EmbedFooter;
  readonly timestamp?: string;
  readonly fields?: readonly EmbedField[];
}

export interface EmbedField {
  readonly name: string;
  readonly value: string;
  readonly inline: boolean;
}

export interface EmbedThumbnail {
  readonly url: string;
}

export interface EmbedFooter {
  readonly text: string;
  readonly icon_url?: string;
}

/**
 * Discord embed color constants
 */
export const EmbedColors = {
  SUCCESS: 0xb4f8c8,
  INFO: 0x83b3f6,
  ERROR: 0xffa6a6,
} as const;
