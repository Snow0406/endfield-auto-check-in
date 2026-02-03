/**
 * OAuth authentication and signature generation utilities
 */

import crypto from "node:crypto";
import type { RuntimeCredentials } from "../types/index.js";

interface BasicInfoResponse {
  status: number;
  data?: { hgId: string; nickname: string; email: string };
  msg?: string;
}

interface GrantCodeResponse {
  status: number;
  data?: { uid: string; code: string };
  msg?: string;
}

interface GenerateCredResponse {
  code: number;
  message: string;
  data?: { cred: string; token: string; userId: string };
}

/**
 * Step 1: Get basic user info from Gryphline
 */
async function getBasicInfo(accountToken: string): Promise<BasicInfoResponse> {
  const url = `https://as.gryphline.com/user/info/v1/basic?token=${encodeURIComponent(accountToken)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return (await response.json()) as BasicInfoResponse;
}

/**
 * Step 2: Grant OAuth code from Gryphline
 */
async function grantOAuthCode(accountToken: string): Promise<GrantCodeResponse> {
  const response = await fetch(
    "https://as.gryphline.com/user/oauth2/v2/grant",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        token: accountToken,
        appCode: "6eb76d4e13aa36e6",
        type: 0,
      }),
    },
  );
  return (await response.json()) as GrantCodeResponse;
}

/**
 * Step 3: Generate credentials from SKPort using OAuth code
 */
async function generateCredByCode(
  code: string,
): Promise<GenerateCredResponse> {
  const response = await fetch(
    "https://zonai.skport.com/web/v1/user/auth/generate_cred_by_code",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        platform: "3",
        Referer: "https://www.skport.com/",
        Origin: "https://www.skport.com",
      },
      body: JSON.stringify({ code, kind: 1 }),
    },
  );
  return (await response.json()) as GenerateCredResponse;
}

/**
 * Perform full OAuth flow to obtain credentials
 * @param accountToken Account token from Gryphline
 * @returns Runtime credentials including cred, salt, and userId
 */
export async function performOAuthFlow(
  accountToken: string,
): Promise<RuntimeCredentials> {
  // Step 1: Get basic info
  const basicResult = await getBasicInfo(accountToken);
  if (basicResult.status !== 0) {
    throw new Error(
      `OAuth Step 1 failed: ${basicResult.msg ?? `status ${basicResult.status}`}`,
    );
  }

  // Step 2: Grant OAuth code
  const grantResult = await grantOAuthCode(accountToken);
  if (grantResult.status !== 0 || !grantResult.data?.code) {
    throw new Error(
      `OAuth Step 2 failed: ${grantResult.msg ?? `status ${grantResult.status}`}`,
    );
  }

  // Step 3: Generate credentials
  const credResult = await generateCredByCode(grantResult.data.code);
  if (credResult.code !== 0 || !credResult.data?.cred) {
    throw new Error(
      `OAuth Step 3 failed: ${credResult.message ?? `code ${credResult.code}`}`,
    );
  }

  return {
    cred: credResult.data.cred,
    salt: credResult.data.token,
    userId: credResult.data.userId,
    hgId: basicResult.data?.hgId,
    obtainedAt: Date.now(),
  };
}

/**
 * Refresh token using existing credentials
 * @param cred Credential string
 * @returns Refreshed token
 */
export async function refreshToken(cred: string): Promise<string> {
  const response = await fetch(
    "https://zonai.skport.com/web/v1/auth/refresh",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        cred: cred,
        platform: "3",
        vname: "1.0.0",  // Back to lowercase (matches browser)
      },
    },
  );

  const result = (await response.json()) as {
    code: number;
    message: string;
    data?: { token: string };
  };

  if (result.code !== 0 || !result.data?.token) {
    throw new Error(
      `Token refresh failed: ${result.message ?? `code ${result.code}`}`,
    );
  }

  return result.data.token;
}

/**
 * Generate V1 signature: MD5 of "timestamp=X&cred=Y"
 * Used for most API endpoints
 */
export function generateSignV1(timestamp: string, cred: string): string {
  return crypto
    .createHash("md5")
    .update(`timestamp=${timestamp}&cred=${cred}`)
    .digest("hex");
}

/**
 * Generate V2 signature: HMAC-SHA256 + MD5
 * Used for specific endpoints like /card/detail, /wiki/, /binding, /enums, /v2/
 */
export function generateSignV2(
  path: string,
  timestamp: string,
  platform: string,
  vName: string,
  salt: string,
  body = "",
): string {
  const headerJson = `{"platform":"${platform}","timestamp":"${timestamp}","dId":"","vName":"${vName}"}`;
  const s = `${path}${body}${timestamp}${headerJson}`;
  const hmac = crypto.createHmac("sha256", salt).update(s).digest("hex");
  return crypto.createHash("md5").update(hmac).digest("hex");
}

/**
 * Determine which signature version to use based on the path
 */
export function getSignVersion(path: string): "v1" | "v2" {
  const v2Patterns = ["/binding", "/card/detail", "/wiki/", "/enums", "/v2/"];
  return v2Patterns.some((pattern) => path.includes(pattern)) ? "v2" : "v1";
}
