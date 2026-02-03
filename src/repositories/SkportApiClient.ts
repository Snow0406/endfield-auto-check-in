/**
 * SKPort API client repository
 * Handles all HTTP communication with SKPort Web API
 */

import axios, { type AxiosInstance, AxiosError } from "axios";
import type {
  Account,
  ApiResponse,
  AttendanceData,
  ClaimData,
  RuntimeCredentials,
} from "../types/index.js";
import {
  performOAuthFlow,
  generateSignV1,
  generateSignV2,
} from "../utils/oauth.js";

const BASE_URL = "https://zonai.skport.com/web/v1";
const REQUEST_TIMEOUT = 30_000; // 30 seconds
const API_VERSION = "1.0.0";
const PLATFORM_ID = "3"; // Web platform

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 10_000; // 10 seconds

/**
 * Repository for SKPort API operations
 */
export class SkportApiClient {
  private readonly client: AxiosInstance;
  private readonly credentials = new Map<string, RuntimeCredentials>();

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: REQUEST_TIMEOUT,
      headers: {
        accept: "*/*",
        "accept-language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/json",
        "sec-ch-ua":
          '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
        Referer: "https://game.skport.com/",
        Origin: "https://game.skport.com",
      },
    });
  }

  /**
   * Initialize OAuth credentials for an account
   * @param account Account configuration
   */
  async initOAuth(account: Account): Promise<boolean> {
    const accountKey = account.sk_game_role;

    try {
      const credentials = await performOAuthFlow(account.account_token);
      this.credentials.set(accountKey, credentials);
      return true;
    } catch (error) {
      console.error(
        `\x1b[91m   ✗ OAuth failed for ${accountKey}: ${error instanceof Error ? error.message : String(error)}\x1b[0m`,
      );
      return false;
    }
  }

  /**
   * Check attendance status for an account
   * @returns API response with attendance data
   */
  async checkAttendance(
    account: Account,
  ): Promise<ApiResponse<AttendanceData>> {
    try {
      return await this.withRetry(async () => {
        const response = await this.client.get<ApiResponse<AttendanceData>>(
          "/game/endfield/attendance",
          {
            headers: this.buildAccountHeaders(account),
          },
        );

        return response.data;
      }, "Check attendance");
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Claim attendance reward for an account
   * @returns API response with claim data
   */
  async claimAttendance(account: Account): Promise<ApiResponse<ClaimData>> {
    try {
      return await this.withRetry(async () => {
        const response = await this.client.post<ApiResponse<ClaimData>>(
          "/game/endfield/attendance",
          undefined,
          {
            headers: {
              ...this.buildAccountHeaders(account, {
                useV2Sign: true,
                signPath: "/web/v1/game/endfield/attendance",
                body: "",
              }),
              "Content-Type": "application/json",
            },
          },
        );

        return response.data;
      }, "Claim attendance");
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Build request headers for SKPort API
   */
  private buildAccountHeaders(
    account: Account,
    options?: { useV2Sign?: boolean; signPath?: string; body?: string },
  ): Record<string, string> {
    const accountKey = account.sk_game_role;
    const credentials = this.credentials.get(accountKey);

    if (!credentials) {
      throw new Error(
        `No credentials available for ${accountKey}. Call initOAuth first.`,
      );
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sign = options?.useV2Sign
      ? generateSignV2(
          options.signPath ?? "/web/v1/game/endfield/attendance",
          timestamp,
          PLATFORM_ID,
          API_VERSION,
          credentials.salt,
          options.body ?? "",
        )
      : generateSignV1(timestamp, credentials.cred);

    return {
      cred: credentials.cred,
      "sk-game-role": account.sk_game_role,
      "sk-language": "en_US",
      timestamp,
      vName: API_VERSION,
      platform: PLATFORM_ID,
      sign,
      priority: "u=1, i",
    };
  }

  /**
   * Handle and normalize errors from API requests
   */
  private handleError<T = never>(error: unknown): ApiResponse<T> {
    if (error instanceof AxiosError) {
      const status = error.response?.status ?? -1;
      const message =
        error.response?.data?.message ?? error.message ?? "Unknown API error";

      return {
        code: status,
        message,
      };
    }

    return {
      code: -1,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  /**
   * Execute request with retry logic
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        const isRetryable =
          error instanceof AxiosError &&
          (!error.response ||
            error.response.status >= 500 ||
            error.response.status === 429);

        if (!isRetryable || attempt === MAX_RETRIES - 1) {
          throw error;
        }

        // Calculate exponential backoff with jitter
        const baseDelay = Math.min(
          INITIAL_RETRY_DELAY * Math.pow(2, attempt),
          MAX_RETRY_DELAY,
        );
        const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1);
        const delay = Math.floor(baseDelay + jitter);

        console.log(
          `\x1b[33m   ⚠ ${operationName} failed (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay}ms...\x1b[0m`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}
