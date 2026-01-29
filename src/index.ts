/**
 * Main entry point
 * Dependency Injection container and application bootstrap
 */

import { loadConfig } from "./config.js";
import { SkportApiClient } from "./repositories/SkportApiClient.js";
import { DiscordNotifier } from "./notifiers/DiscordNotifier.js";
import { CheckInService } from "./services/CheckInService.js";
import { CronScheduler } from "./schedulers/CronScheduler.js";

/**
 * Application bootstrap
 */
async function main(): Promise<void> {
  printBanner();

  try {
    // Load and validate configuration
    console.log("\x1b[90m   Loading configuration...\x1b[0m");
    const config = loadConfig();
    console.log(
      `\x1b[92m   ✓ Loaded ${config.accounts.length} account(s)\x1b[0m`,
    );

    // Initialize dependencies (Dependency Injection)
    console.log("\x1b[90m   Initializing services...\x1b[0m");
    const apiClient = new SkportApiClient();
    const notifier = new DiscordNotifier(
      config.discordWebhook,
      config.discordWebhookUsername,
      config.discordWebhookAvatarUrl,
    );
    const checkInService = new CheckInService(apiClient, notifier);
    const scheduler = new CronScheduler(config, checkInService);
    console.log("\x1b[92m   ✓ Services initialized\x1b[0m\n");

    await checkInService.executeAll(config.accounts);

    // Start scheduler
    scheduler.start();

    printRunning();

    // Setup graceful shutdown
    setupGracefulShutdown(scheduler);
  } catch (error) {
    console.error("\n\x1b[91m❌ Fatal error during startup:\x1b[0m");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown(scheduler: CronScheduler): void {
  const shutdown = (signal: string) => {
    console.log(`\n\n\x1b[93m🛑 Shutdown signal received: ${signal}\x1b[0m`);
    scheduler.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    console.error("\n\x1b[91m❌ Unhandled Promise Rejection:\x1b[0m");
    console.error(reason);
  });

  process.on("uncaughtException", (error) => {
    console.error("\n\x1b[91m❌ Uncaught Exception:\x1b[0m");
    console.error(error);
    process.exit(1);
  });
}

/**
 * Print application banner
 */
function printBanner(): void {
  console.log("\x1b[96m🤖 Endfield Auto Check-In Service\x1b[0m");
  console.log(`\x1b[90m   Service Layer Edition\x1b[0m`);
  console.log(`\x1b[90m   Time: \x1b[37m${new Date().toISOString()}\x1b[0m\n`);
}

/**
 * Print running status
 */
function printRunning(): void {
  console.log("\x1b[92m✅ System is running\x1b[0m");
}

// Start application
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
