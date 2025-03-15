const { CronJob } = require("cron");
const { logger } = require("./logger");
const config = require("../config/config");

class Scheduler {
  /**
   * Create a new cron job
   * @param {string} name - The name of the job
   * @param {string} schedule - The cron schedule expression
   * @param {Function} task - The function to execute
   * @returns {CronJob} - The created cron job
   */
  createJob(name, schedule, task) {
    logger.info(`Creating job: ${name} with schedule: ${schedule}`);

    const job = new CronJob(
      schedule,
      async () => {
        try {
          logger.info(`Running scheduled job: ${name}`);
          await task();
          logger.info(`Completed scheduled job: ${name}`);
        } catch (error) {
          logger.error(`Error in scheduled job ${name}:`, error);
        }
      },
      null, // onComplete
      true, // start
      "UTC" // timeZone
    );

    return job;
  }

  /**
   * Start a job immediately
   * @param {string} name - The name of the job
   * @param {Function} task - The function to execute
   */
  async runJobNow(name, task) {
    logger.info(`Running job now: ${name}`);
    try {
      await task();
      logger.info(`Completed job: ${name}`);
    } catch (error) {
      logger.error(`Error in job ${name}:`, error);
    }
  }
}

module.exports = new Scheduler();
