const { Telegraf } = require("telegraf");
const config = require("../config/config");
const { logger } = require("../utils/logger");
const { HttpsProxyAgent } = require("https-proxy-agent");
const openaiService = require("./openaiService");
const fs = require("fs");

class TelegramService {
  constructor() {
    this.initBot();
  }

  /**
   * Initialize the Telegram bot
   */
  initBot() {
    try {
      const options = {};

      // Добавляем прокси, если он настроен
      if (config.proxy && config.proxy.enabled) {
        logger.info(
          `Using proxy for Telegram API: ${config.proxy.host}:${config.proxy.port}`
        );
        const proxyUrl = `http://${config.proxy.host}:${config.proxy.port}`;

        // Добавляем аутентификацию прокси, если она настроена
        if (
          config.proxy.auth &&
          config.proxy.auth.username &&
          config.proxy.auth.password
        ) {
          const proxyAuthUrl = `http://${config.proxy.auth.username}:${config.proxy.auth.password}@${config.proxy.host}:${config.proxy.port}`;
          options.telegram = {
            agent: new HttpsProxyAgent(proxyAuthUrl),
          };
          logger.info("Using proxy with authentication");
        } else {
          options.telegram = {
            agent: new HttpsProxyAgent(proxyUrl),
          };
        }
      }

      // Создаем экземпляр бота
      this.bot = new Telegraf(config.telegram.botToken, options);

      // Логируем настройки бота
      logger.info(`Admin user IDs: ${config.telegram.adminUserIds.join(", ")}`);
      logger.info(`Commands enabled: ${config.telegram.enableCommands}`);
      logger.info(`Channel ID: ${config.telegram.channelId}`);

      // Обработчик для всех сообщений (для отладки)
      this.bot.on("message", (ctx) => {
        try {
          const userId = ctx.from?.id;
          const chatId = ctx.chat?.id;
          const messageText = ctx.message?.text || "";

          logger.info(
            `Received message from user ${userId} in chat ${chatId}: ${messageText}`
          );

          // Проверяем, является ли сообщение командой
          if (messageText.startsWith("/")) {
            logger.info(`Detected command: ${messageText}`);

            // Проверяем, является ли пользователь администратором
            const isAdmin = this.isAdmin(userId);
            logger.info(`User ${userId} is admin: ${isAdmin}`);

            if (!isAdmin) {
              logger.info(
                `Non-admin user ${userId} attempted to use command: ${messageText}`
              );
              ctx.reply("Извините, у вас нет прав для использования команд.");
              return;
            }

            // Обрабатываем команды напрямую
            if (messageText === "/help") {
              this.handleHelpCommand(ctx);
            } else if (messageText === "/status") {
              this.handleStatusCommand(ctx);
            } else if (messageText === "/topics") {
              this.handleTopicsCommand(ctx);
            } else if (messageText === "/post") {
              this.handlePostCommand(ctx);
            } else if (messageText.startsWith("/post_topic")) {
              this.handlePostTopicCommand(ctx);
            }
          }
        } catch (error) {
          logger.error("Error processing message:", error);
        }
      });

      // Обработчик ошибок при поллинге
      this.bot.catch((err) => {
        logger.error("Telegram bot polling error:", err);
      });

      // Запускаем бота, если команды включены
      if (config.telegram.enableCommands) {
        this.bot
          .launch()
          .then(() => {
            logger.info("Telegram bot started in polling mode");
            this.bot.telegram
              .getMe()
              .then((botInfo) => {
                logger.info(`Bot username: @${botInfo.username}`);
                logger.info(`Bot ID: ${botInfo.id}`);
              })
              .catch((err) => {
                logger.error("Failed to get bot info:", err);
              });
          })
          .catch((err) => {
            logger.error("Failed to start Telegram bot:", err);
          });
      } else {
        logger.info("Telegram bot commands are disabled");
      }
    } catch (error) {
      logger.error("Error initializing Telegram bot:", error);
      throw error;
    }
  }

  /**
   * Обработчик команды /help
   */
  handleHelpCommand(ctx) {
    try {
      const userId = ctx.from?.id;
      logger.info(`Help command received from user ${userId}`);

      const helpText =
        config.language === "ru"
          ? `Доступные команды:
/help - показать эту справку
/status - проверить статус бота
/topics - показать список доступных тем
/post - создать пост на тему "Новости машинного обучения и нейросетей"
/post_topic [индекс] - создать пост на конкретную тему (например, /post_topic 0)

Бот автоматически публикует посты по расписанию:
- Утром (09:00 UTC): Новости технологий
- Днем (15:00 UTC): Достижения в области ИИ
- Вечером (21:00 UTC): Разные темы в зависимости от дня недели

Функция уникальности контента:
Бот отслеживает историю постов и генерирует уникальный контент, который не повторяет предыдущие публикации.`
          : `Available commands:
/help - show this help message
/status - check bot status
/topics - show list of available topics
/post - create a post on "Machine Learning & Neural Networks News" topic
/post_topic [index] - create a post on a specific topic (e.g., /post_topic 0)

The bot automatically publishes posts on schedule:
- Morning (09:00 UTC): Technology News
- Afternoon (15:00 UTC): AI Advancements
- Evening (21:00 UTC): Various topics depending on the day of the week

Content uniqueness feature:
The bot tracks post history and generates unique content that doesn't repeat previous publications.`;

      ctx.reply(helpText);
      logger.info(`Help command executed by user ${userId}`);
    } catch (error) {
      logger.error("Error processing help command:", error);
    }
  }

  /**
   * Обработчик команды /status
   */
  async handleStatusCommand(ctx) {
    try {
      const userId = ctx.from?.id;
      logger.info(`Status command received from user ${userId}`);

      // Импортируем historyService для получения информации о последних постах
      const historyService = require("./historyService");

      // Получаем информацию о последних постах для каждой темы
      const topicsWithHistory = config.topics.map((topic) => {
        const lastPosts = historyService.getPreviousPosts(topic.name, 1);
        const lastPostDate =
          lastPosts.length > 0
            ? new Date(lastPosts[0].date).toLocaleString("ru-RU")
            : "Нет данных";
        return {
          name: topic.name,
          lastPostDate: lastPostDate,
        };
      });

      // Формируем текст статуса
      let statusText =
        config.language === "ru"
          ? "Бот работает нормально. Готов к созданию постов.\n\n"
          : "Bot is running normally. Ready to create posts.\n\n";

      // Добавляем информацию о последних постах
      statusText +=
        config.language === "ru"
          ? "Последние публикации по темам:\n"
          : "Latest publications by topic:\n";

      topicsWithHistory.forEach((topic) => {
        statusText += `${topic.name}: ${topic.lastPostDate}\n`;
      });

      await ctx.reply(statusText);
      logger.info(`Status command executed by user ${userId}`);
    } catch (error) {
      logger.error("Error processing status command:", error);

      // Если произошла ошибка, отправляем базовый статус
      const basicStatusText =
        config.language === "ru"
          ? "Бот работает нормально. Готов к созданию постов."
          : "Bot is running normally. Ready to create posts.";

      await ctx.reply(basicStatusText);
    }
  }

  /**
   * Обработчик команды /topics
   */
  handleTopicsCommand(ctx) {
    try {
      const userId = ctx.from?.id;
      logger.info(`Topics command received from user ${userId}`);

      const topicsText = config.topics
        .map((topic, index) => `${index}: ${topic.name}`)
        .join("\n");

      const message =
        config.language === "ru"
          ? `Доступные темы:\n${topicsText}`
          : `Available topics:\n${topicsText}`;

      ctx.reply(message);
      logger.info(`Topics command executed by user ${userId}`);
    } catch (error) {
      logger.error("Error processing topics command:", error);
    }
  }

  /**
   * Обработчик команды /post
   */
  async handlePostCommand(ctx) {
    try {
      const userId = ctx.from?.id;
      logger.info(`Post command received from user ${userId}`);

      try {
        const waitMessage =
          config.language === "ru"
            ? 'Генерирую пост на тему "Новости машинного обучения и нейросетей"... Пожалуйста, подождите.'
            : 'Generating post on topic "Machine Learning & Neural Networks News"... Please wait.';

        await ctx.reply(waitMessage);
        logger.info(`Post command execution started by user ${userId}`);

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
          `Using default topic: "${selectedTopic.name}" (index: ${topicIndex})`
        );

        // Получаем contentService и вызываем метод postTopicContent
        const contentService = require("./contentService");
        await contentService.postTopicContent(topicIndex);

        const successMessage =
          config.language === "ru"
            ? `Пост на тему "${selectedTopic.name}" успешно опубликован в канале.`
            : `Post on topic "${selectedTopic.name}" successfully published to the channel.`;

        await ctx.reply(successMessage);
        logger.info(`Post command completed successfully for user ${userId}`);
      } catch (error) {
        logger.error("Error executing post command:", error);

        const errorMessage =
          config.language === "ru"
            ? `Ошибка при создании поста: ${error.message}`
            : `Error creating post: ${error.message}`;

        await ctx.reply(errorMessage);
      }
    } catch (error) {
      logger.error("Error processing post command:", error);
    }
  }

  /**
   * Обработчик команды /post_topic
   */
  async handlePostTopicCommand(ctx) {
    try {
      const userId = ctx.from?.id;
      logger.info(
        `Post_topic command received from user ${userId}: ${ctx.message?.text}`
      );

      try {
        const args = ctx.message?.text.split(" ");
        if (!args || args.length < 2) {
          const usageMessage =
            config.language === "ru"
              ? "Использование: /post_topic [индекс темы]"
              : "Usage: /post_topic [topic index]";

          await ctx.reply(usageMessage);
          logger.info(
            `Post_topic command used without arguments by user ${userId}`
          );
          return;
        }

        const topicIndex = parseInt(args[1]);
        logger.info(
          `Post_topic command with index ${topicIndex} by user ${userId}`
        );

        if (
          isNaN(topicIndex) ||
          topicIndex < 0 ||
          topicIndex >= config.topics.length
        ) {
          const invalidIndexMessage =
            config.language === "ru"
              ? `Неверный индекс темы. Используйте /topics для просмотра доступных тем.`
              : `Invalid topic index. Use /topics to see available topics.`;

          await ctx.reply(invalidIndexMessage);
          logger.info(
            `Invalid topic index ${topicIndex} provided by user ${userId}`
          );
          return;
        }

        const topic = config.topics[topicIndex];
        const waitMessage =
          config.language === "ru"
            ? `Генерирую пост на тему "${topic.name}"... Пожалуйста, подождите.`
            : `Generating post on topic "${topic.name}"... Please wait.`;

        await ctx.reply(waitMessage);
        logger.info(
          `Post_topic command execution started by user ${userId} for topic index ${topicIndex}`
        );

        // Получаем contentService и вызываем метод postTopicContent
        const contentService = require("./contentService");
        await contentService.postTopicContent(topicIndex);

        const successMessage =
          config.language === "ru"
            ? `Пост на тему "${topic.name}" успешно опубликован в канале.`
            : `Post on topic "${topic.name}" successfully published to the channel.`;

        await ctx.reply(successMessage);
        logger.info(
          `Post_topic command completed successfully for user ${userId} and topic ${topic.name}`
        );
      } catch (error) {
        logger.error("Error executing post_topic command:", error);

        const errorMessage =
          config.language === "ru"
            ? `Ошибка при создании поста: ${error.message}`
            : `Error creating post: ${error.message}`;

        await ctx.reply(errorMessage);
      }
    } catch (error) {
      logger.error("Error processing post_topic command:", error);
    }
  }

  /**
   * Проверяет, является ли пользователь администратором
   * @param {number} userId - ID пользователя Telegram
   * @returns {boolean} - true, если пользователь администратор
   */
  isAdmin(userId) {
    if (!userId) return false;

    // Преобразуем userId в строку для сравнения
    const userIdStr = userId.toString();
    const isAdmin = config.telegram.adminUserIds.includes(userIdStr);
    logger.info(
      `Checking if user ${userId} is admin: ${isAdmin} (admin IDs: ${config.telegram.adminUserIds.join(
        ", "
      )})`
    );
    return isAdmin;
  }

  /**
   * Экранирует специальные символы Markdown в тексте
   * @param {string} text - Текст для экранирования
   * @returns {string} - Экранированный текст
   */
  escapeMarkdown(text) {
    if (!text) return "";

    // Экранируем специальные символы Markdown
    return text
      .replace(/\_/g, "\\_")
      .replace(/\*/g, "\\*")
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/\~/g, "\\~")
      .replace(/\`/g, "\\`")
      .replace(/\>/g, "\\>")
      .replace(/\#/g, "\\#")
      .replace(/\+/g, "\\+")
      .replace(/\-/g, "\\-")
      .replace(/\=/g, "\\=")
      .replace(/\|/g, "\\|")
      .replace(/\{/g, "\\{")
      .replace(/\}/g, "\\}")
      .replace(/\./g, "\\.")
      .replace(/\!/g, "\\!");
  }

  /**
   * Send a message to the Telegram channel
   * @param {string} message - The message to send
   * @returns {Promise<object>} - The Telegram API response
   */
  async sendMessageToChannel(message) {
    try {
      logger.info("Sending message to Telegram channel");

      // Разделяем заголовок (первые строки) и основной текст
      const lines = message.split("\n");
      let header = "";
      let content = "";

      if (lines.length > 0) {
        // Первые две строки обычно содержат заголовок с форматированием
        header = lines.slice(0, 2).join("\n");
        // Остальное - это контент, который нужно экранировать
        content = this.escapeMarkdown(lines.slice(2).join("\n"));
      } else {
        content = this.escapeMarkdown(message);
      }

      // Собираем сообщение обратно
      const formattedMessage = `${header}\n${content}`;

      const result = await this.bot.telegram.sendMessage(
        config.telegram.channelId,
        formattedMessage,
        { parse_mode: "MarkdownV2" }
      );
      logger.info("Message sent successfully to Telegram channel");
      return result;
    } catch (error) {
      logger.error("Error sending message to Telegram channel:", error);

      // Если ошибка связана с форматированием, пробуем отправить без форматирования
      try {
        logger.info("Trying to send message without Markdown formatting");
        const result = await this.bot.telegram.sendMessage(
          config.telegram.channelId,
          message,
          { parse_mode: "" }
        );
        logger.info("Message sent successfully without formatting");
        return result;
      } catch (plainError) {
        logger.error(
          "Error sending plain message to Telegram channel:",
          plainError
        );
        throw error;
      }
    }
  }

  /**
   * Send a photo with caption to the Telegram channel
   * @param {string} photoPath - Path to the photo file
   * @param {string} caption - Caption for the photo
   * @returns {Promise<object>} - The Telegram API response
   */
  async sendPhotoToChannel(photoPath, caption) {
    try {
      logger.info(`Sending photo to Telegram channel: ${photoPath}`);

      // Проверяем существование файла
      if (!fs.existsSync(photoPath)) {
        logger.error(`Photo file does not exist: ${photoPath}`);
        // Если файл не существует, отправляем только текст
        return this.sendMessageToChannel(caption);
      }

      // Разделяем заголовок (первые строки) и основной текст
      const lines = caption.split("\n");
      let header = "";
      let content = "";

      if (lines.length > 0) {
        // Первые две строки обычно содержат заголовок с форматированием
        header = lines.slice(0, 2).join("\n");
        // Остальное - это контент, который нужно экранировать
        content = this.escapeMarkdown(lines.slice(2).join("\n"));
      } else {
        content = this.escapeMarkdown(caption);
      }

      // Собираем сообщение обратно
      const formattedCaption = `${header}\n${content}`;

      // Используем InputFile для отправки изображения
      const result = await this.bot.telegram.sendPhoto(
        config.telegram.channelId,
        { source: fs.createReadStream(photoPath) },
        {
          caption: formattedCaption,
          parse_mode: "MarkdownV2",
        }
      );
      logger.info("Photo sent successfully to Telegram channel");
      return result;
    } catch (error) {
      logger.error("Error sending photo to Telegram channel:", error);

      // Если ошибка связана с форматированием, пробуем отправить без форматирования
      try {
        logger.info("Trying to send photo without Markdown formatting");
        const result = await this.bot.telegram.sendPhoto(
          config.telegram.channelId,
          { source: fs.createReadStream(photoPath) },
          {
            caption: caption,
            parse_mode: "",
          }
        );
        logger.info("Photo sent successfully without formatting");
        return result;
      } catch (plainError) {
        logger.error("Error sending photo with plain caption:", plainError);
        // Если не удалось отправить фото, пробуем отправить только текст
        logger.info("Trying to send message without photo");
        return this.sendMessageToChannel(caption);
      }
    }
  }

  /**
   * Stop the Telegram bot
   */
  stopBot() {
    if (this.bot) {
      this.bot.stop();
      logger.info("Telegram bot stopped");
    }
  }
}

module.exports = new TelegramService();
