require("dotenv").config();
const { logger } = require("./src/utils/logger");
const scheduler = require("./src/utils/scheduler");
const contentService = require("./src/services/contentService");
const historyService = require("./src/services/historyService");
const config = require("./src/config/config");

// Функция для запуска бота
async function startBot() {
  try {
    // Log startup information
    logger.info("Starting BotInfoTG...");
    logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
    logger.info(`Language: ${config.language}`);
    logger.info(`Generate images: ${config.generateImages ? "Yes" : "No"}`);
    logger.info("Content uniqueness tracking: Enabled");

    // Validate required environment variables
    const requiredEnvVars = [
      "OPENAI_API_KEY",
      "TELEGRAM_BOT_TOKEN",
      "TELEGRAM_CHANNEL_ID",
    ];
    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar]
    );

    if (missingEnvVars.length > 0) {
      logger.error(
        `Missing required environment variables: ${missingEnvVars.join(", ")}`
      );
      process.exit(1);
    }

    // Логируем информацию о настройках прокси
    if (config.proxy && config.proxy.enabled) {
      logger.info(`Proxy enabled: ${config.proxy.host}:${config.proxy.port}`);
      if (config.proxy.auth && config.proxy.auth.username) {
        logger.info("Proxy authentication enabled");
      }
    } else {
      logger.info("Proxy disabled");
    }

    // Логируем информацию о командах
    if (config.telegram.enableCommands) {
      logger.info("Telegram commands enabled");
      logger.info(
        `Admin users: ${config.telegram.adminUserIds.join(", ") || "None"}`
      );
    } else {
      logger.info("Telegram commands disabled");
    }

    // Проверяем, что Telegram бот инициализирован правильно
    try {
      // Импортируем telegramService для проверки
      const telegramService = require("./src/services/telegramService");
      logger.info("Telegram bot initialized successfully");

      // Проверяем, что бот может отправлять сообщения
      if (process.env.TEST_BOT_ON_STARTUP === "true") {
        logger.info("Testing bot message sending...");
        try {
          await telegramService.sendMessageToChannel(
            "🤖 Бот запущен и готов к работе! Используйте /help для получения списка команд."
          );
          logger.info("Test message sent successfully");
        } catch (err) {
          logger.error("Failed to send test message:", err);
        }
      }
    } catch (error) {
      logger.error("Error initializing Telegram bot:", error);
      process.exit(1);
    }

    // Create scheduled jobs for posting content at specific times
    // Hourly post - Machine Learning & Neural Networks News
    const hourlyJob = scheduler.createJob(
      "Hourly Post",
      config.cron.schedule, // Каждый час (настройка из конфига)
      async () => {
        try {
          // Находим индекс темы "Новости машинного обучения и нейросетей"
          const defaultTopicName = "Новости машинного обучения и нейросетей";
          let topicIndex = config.topics.findIndex(
            (topic) => topic.name === defaultTopicName
          );

          // Если тема не найдена, используем первую тему
          if (topicIndex === -1) {
            topicIndex = 0;
            logger.warn(
              `Default topic "${defaultTopicName}" not found, using topic at index 0`
            );
          }

          const selectedTopic = config.topics[topicIndex];
          logger.info(
            `Publishing hourly post on topic: "${selectedTopic.name}" (index: ${topicIndex})`
          );

          await contentService.postTopicContent(topicIndex);
          logger.info(
            `Hourly post published successfully on topic: "${selectedTopic.name}"`
          );
        } catch (error) {
          logger.error("Error in hourly job:", error);
        }
      }
    );

    // Handle process termination
    process.on("SIGINT", () => {
      logger.info("Received SIGINT. Shutting down gracefully...");
      hourlyJob.stop();
      const telegramService = require("./src/services/telegramService");
      telegramService.stopBot();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      logger.info("Received SIGTERM. Shutting down gracefully...");
      hourlyJob.stop();
      const telegramService = require("./src/services/telegramService");
      telegramService.stopBot();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught exception:", error);
      // Не завершаем процесс при ошибке, чтобы бот продолжал работать
      // process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled promise rejection:", reason);
    });

    // Run a job immediately on startup if needed
    if (process.env.RUN_ON_STARTUP === "true") {
      logger.info("Running initial content post on startup");
      setTimeout(async () => {
        try {
          await contentService.postRandomTopicContent();
          logger.info("Initial post published successfully");
        } catch (error) {
          logger.error("Error publishing initial post:", error);
        }
      }, 5000); // Даем 5 секунд на инициализацию всех сервисов
    }

    logger.info("BotInfoTG is running. Press Ctrl+C to stop.");
    logger.info("Scheduled posts:");
    logger.info(
      "- Hourly post (Новости машинного обучения и нейросетей): every hour"
    );
    logger.info("Content uniqueness features:");
    logger.info("- Tracking post history to avoid duplicates");
    logger.info("- Enhancing prompts with previous content information");
    logger.info("- Smart topic selection for random posts");
  } catch (error) {
    logger.error("Error starting bot:", error);
    process.exit(1);
  }
}

// Запускаем бота
startBot();
