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
} from "../types/index.js";

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

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: REQUEST_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
        Referer: "https://game.skport.com/",
        Origin: "https://game.skport.com",
      },
    });
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
          {},
          {
            headers: this.buildAccountHeaders(account),
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
  private buildAccountHeaders(account: Account): Record<string, string> {
    return {
      cred: account.cred,
      "sk-game-role": account.sk_game_role,
      "sk-language": "en",
      timestamp: Math.floor(Date.now() / 1000).toString(),
      vname: API_VERSION,
      platform: PLATFORM_ID,
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
