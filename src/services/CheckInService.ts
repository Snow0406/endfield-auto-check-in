/**
 * Check-in business logic service
 * Orchestrates attendance checking and claiming for multiple accounts
 */

import type {
  Account,
  CheckInResult,
  ClaimData,
  Reward,
} from "../types/index.js";
import type { SkportApiClient } from "../repositories/SkportApiClient.js";
import type { DiscordNotifier } from "../notifiers/DiscordNotifier.js";

const RATE_LIMIT_DELAY = 1_000; // 1 second between accounts

const CONCURRENT_LIMIT = 3; // Process 3 accounts concurrently

/**
 * Service for managing check-in operations
 */
export class CheckInService {
  constructor(
    private readonly apiClient: SkportApiClient,
    private readonly notifier: DiscordNotifier,
  ) {}

  /**
   * Execute check-in for all accounts sequentially
   * @param accounts List of accounts to process
   */
  async executeAll(accounts: readonly Account[]): Promise<void> {
    console.log(
      `\x1b[96m📋 Starting check-in for ${accounts.length} account(s)\x1b[0m`,
    );

    const results = await this.processConcurrently(
      accounts,
      async (account, index) => {
        const result = await this.executeForAccount(account);

        // Rate limiting between requests
        if (index < accounts.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
        }

        return result;
      },
      CONCURRENT_LIMIT,
    );

    // Check for errors in results
    const errors = results.filter((r) => r.status === "error");
    if (errors.length > 0) {
      console.log("\n\x1b[91m❌ Check-in completed with errors:\x1b[0m");
      errors.forEach((err) => {
        console.log(`  • UID ${err.uid}: ${err.error}`);
      });
      console.log();
    } else {
      console.log("\n\x1b[92m✅ Check-in completed for all accounts\x1b[0m\n");
    }

    // Send batch notification
    await this.notifier.sendBatchResults(results);
  }

  /**
   * Execute check-in for a single account
   */
  private async executeForAccount(account: Account): Promise<CheckInResult> {
    try {
      // Step 0: Initialize OAuth credentials
      const oauthSuccess = await this.apiClient.initOAuth(account);
      if (!oauthSuccess) {
        return {
          uid: account.sk_game_role,
          status: "error",
          rewards: [],
          error: "Failed to initialize OAuth credentials",
        };
      }

      // Step 1: Check current attendance status
      const checkResponse = await this.apiClient.checkAttendance(account);

      if (checkResponse.code !== 0) {
        return {
          uid: account.sk_game_role,
          status: "error",
          rewards: [],
          error: checkResponse.message ?? "Failed to check attendance",
        };
      }

      // Step 2: Verify if already checked in today
      if (checkResponse.data?.hasToday) {
        return {
          uid: account.sk_game_role,
          status: "already_claimed",
          rewards: [],
        };
      }

      // Step 3: Claim attendance reward
      const claimResponse = await this.apiClient.claimAttendance(account);

      if (claimResponse.code !== 0) {
        return {
          uid: account.sk_game_role,
          status: "error",
          rewards: [],
          error: claimResponse.message ?? "Failed to claim reward",
        };
      }

      // Step 4: Extract rewards
      const rewards = claimResponse.data?.resourceInfoMap
        ? Object.values(claimResponse.data.resourceInfoMap).map((item) => ({
            name: item.name,
            count: item.count,
            icon: item.icon,
          }))
        : [];

      return {
        uid: account.sk_game_role,
        status: "claimed",
        rewards,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        uid: account.sk_game_role,
        status: "error",
        rewards: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Process items with limited concurrency
   */
  private async processConcurrently<T, R>(
    items: readonly T[],
    processor: (item: T, index: number) => Promise<R>,
    limit: number,
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    const executing: Set<Promise<void>> = new Set();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;

      const promise = (async () => {
        results[i] = await processor(item, i);
      })().finally(() => {
        executing.delete(promise);
      });

      executing.add(promise);

      if (executing.size >= limit) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results.filter((r) => r !== undefined);
  }
}
