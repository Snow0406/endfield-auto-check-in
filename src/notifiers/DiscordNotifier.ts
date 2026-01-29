/**
 * Discord webhook notifier
 * Sends formatted notifications to Discord channels
 */

import axios, { type AxiosInstance } from "axios";
import type {
  CheckInResult,
  DiscordEmbed,
  DiscordWebhookPayload,
  EmbedField,
} from "../types/index.js";
import { EmbedColors } from "../types/index.js";

const WEBHOOK_TIMEOUT = 10_000; // 10 seconds

/**
 * Discord notification service
 */
export class DiscordNotifier {
  private readonly client: AxiosInstance;
  private readonly webhookUrl: string;
  private readonly username: string;
  private readonly avatarUrl: string;

  constructor(webhookUrl: string, username: string, avatarUrl: string) {
    this.client = axios.create({
      timeout: WEBHOOK_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.webhookUrl = webhookUrl;
    this.username = username;
    this.avatarUrl = avatarUrl;
  }

  /**
   * Send batch check-in results notification to Discord
   * @param results All check-in operation results
   */
  async sendBatchResults(results: CheckInResult[]): Promise<void> {
    if (results.length === 0) return;

    const payload: DiscordWebhookPayload = {
      username: this.username,
      avatar_url: this.avatarUrl,
      embeds: [this.buildBatchEmbed(results)],
    };

    try {
      await this.client.post(this.webhookUrl, payload);
    } catch (error) {
      console.error(
        `\x1b[91m❌ Discord webhook failed:\x1b[0m`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Build Discord embed from batch check-in results
   */
  private buildBatchEmbed(results: CheckInResult[]): DiscordEmbed {
    const errorResults = results.filter((r) => r.status === "error");
    const claimedResults = results.filter((r) => r.status === "claimed");

    // Determine embed style
    let title: string;
    let color: number;
    if (errorResults.length > 0) {
      title = "Check-In Completed with Errors";
      color = EmbedColors.ERROR;
    } else if (claimedResults.length > 0) {
      title = "Check-In Completed Successfully";
      color = EmbedColors.SUCCESS;
    } else {
      title = "All Accounts Already Checked In";
      color = EmbedColors.INFO;
    }

    // Build error description
    const description =
      errorResults.length > 0
        ? errorResults.map((r) => `❌ **${r.uid}**: ${r.error}`).join("\n")
        : undefined;

    return {
      title,
      color,
      description,
      timestamp: new Date().toISOString(),
      footer: {
        text: `Total: ${results.length} accounts`,
      },
    };
  }
}
