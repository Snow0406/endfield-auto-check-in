/**
 * Cron job scheduler
 * Manages scheduled tasks for automated check-ins
 */

import { CronJob } from "cron";
import type { CheckInService } from "../services/CheckInService.js";
import type { Config } from "../types/index.js";

/**
 * Scheduler for managing cron jobs
 */
export class CronScheduler {
  private readonly jobs: CronJob[] = [];

  constructor(
    private readonly config: Config,
    private readonly checkInService: CheckInService
  ) {}

  /**
   * Start all scheduled jobs
   */
  start(): void {
    const checkInJob = this.createCheckInJob();
    this.jobs.push(checkInJob);

    console.log(`\x1b[96m⏰ Cron scheduled: ${this.config.cronSchedule} (${this.config.timezone})\x1b[0m`);
    console.log(
      `\x1b[90m   Next execution: \x1b[37m${checkInJob.nextDate().toFormat("yyyy-MM-dd HH:mm:ss")}\x1b[0m\n`
    );
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    for (const job of this.jobs) {
      job.stop();
    }
    console.log("\x1b[93m⏹️  Cron scheduler stopped\x1b[0m");
  }

  /**
   * Create check-in cron job
   */
  private createCheckInJob(): CronJob {
    return new CronJob(
      this.config.cronSchedule,
      async () => {
        this.logJobStart();

        try {
          await this.checkInService.executeAll(this.config.accounts);
        } catch (error) {
          console.error(
            "Cron check-in failed:",
            error instanceof Error ? error.message : String(error)
          );
        }

        this.logJobEnd();
      },
      null, // onComplete
      true, // start immediately
      this.config.timezone
    );
  }

  /**
   * Log job execution start
   */
  private logJobStart(): void {
    const separator = "=".repeat(50);
    console.log(`\n\x1b[90m${separator}\x1b[0m`);
    console.log(`\x1b[96m⏰ Running scheduled check-in\x1b[0m`);
    console.log(`\x1b[90m   Time: \x1b[37m${new Date().toISOString()}\x1b[0m`);
    console.log(`\x1b[90m${separator}\x1b[0m\n`);
  }

  /**
   * Log job execution end
   */
  private logJobEnd(): void {
    const separator = "=".repeat(50);
    console.log(`\x1b[90m${separator}\x1b[0m`);
    console.log(`\x1b[92m✅ Check-in job completed\x1b[0m`);
    console.log(`\x1b[90m${separator}\x1b[0m\n`);
  }
}
