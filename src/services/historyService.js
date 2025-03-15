const fs = require("fs");
const path = require("path");
const { logger } = require("../utils/logger");

class HistoryService {
  constructor() {
    this.historyFile = path.join(process.cwd(), "data", "post_history.json");
    this.history = this.loadHistory();
    this.ensureDirectoryExists();
  }

  /**
   * Убедиться, что директория для хранения данных существует
   */
  ensureDirectoryExists() {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
        logger.info(`Created directory for data: ${dataDir}`);
      } catch (error) {
        logger.error(`Error creating data directory: ${error.message}`);
      }
    }
  }

  /**
   * Загрузить историю постов из файла
   * @returns {Object} - История постов по темам
   */
  loadHistory() {
    try {
      logger.info(`Loading post history from file: ${this.historyFile}`);

      if (fs.existsSync(this.historyFile)) {
        const data = fs.readFileSync(this.historyFile, "utf8");

        // Проверяем, что файл не пустой
        if (!data || data.trim() === "") {
          logger.warn(
            "Post history file exists but is empty, initializing new history"
          );
          return this.initializeEmptyHistory();
        }

        try {
          const history = JSON.parse(data);

          // Проверяем структуру загруженной истории
          if (!history || typeof history !== "object") {
            logger.warn(
              "Invalid history data format, initializing new history"
            );
            return this.initializeEmptyHistory();
          }

          // Проверяем наличие необходимых полей
          if (!history.posts || !history.lastPostDates) {
            logger.warn(
              "History data is missing required fields, initializing with defaults"
            );
            return {
              posts: history.posts || {},
              lastPostDates: history.lastPostDates || {},
            };
          }

          logger.info("Post history loaded successfully");
          return history;
        } catch (parseError) {
          logger.error(
            `Error parsing post history JSON: ${parseError.message}`
          );
          return this.initializeEmptyHistory();
        }
      } else {
        logger.info(
          "Post history file does not exist, initializing new history"
        );
        return this.initializeEmptyHistory();
      }
    } catch (error) {
      logger.error(`Error loading post history: ${error.message}`);
      return this.initializeEmptyHistory();
    }
  }

  /**
   * Инициализировать пустую историю
   * @returns {Object} - Пустая структура истории
   */
  initializeEmptyHistory() {
    const emptyHistory = {
      posts: {},
      lastPostDates: {},
    };

    // Сразу сохраняем пустую историю в файл
    try {
      this.ensureDirectoryExists();
      fs.writeFileSync(
        this.historyFile,
        JSON.stringify(emptyHistory, null, 2),
        "utf8"
      );
      logger.info("Initialized and saved empty post history");
    } catch (saveError) {
      logger.error(`Error saving initialized history: ${saveError.message}`);
    }

    return emptyHistory;
  }

  /**
   * Сохранить историю постов в файл
   */
  saveHistory() {
    try {
      fs.writeFileSync(
        this.historyFile,
        JSON.stringify(this.history, null, 2),
        "utf8"
      );
      logger.info("Post history saved successfully");
    } catch (error) {
      logger.error(`Error saving post history: ${error.message}`);
    }
  }

  /**
   * Добавить пост в историю
   * @param {string} topicName - Название темы
   * @param {string} content - Содержимое поста
   */
  addPost(topicName, content) {
    // Инициализируем массив для темы, если его еще нет
    if (!this.history.posts[topicName]) {
      this.history.posts[topicName] = [];
    }

    // Добавляем пост в историю
    this.history.posts[topicName].push({
      content: content,
      date: new Date().toISOString(),
    });

    // Ограничиваем количество сохраненных постов (храним последние 10)
    if (this.history.posts[topicName].length > 10) {
      this.history.posts[topicName] = this.history.posts[topicName].slice(-10);
    }

    // Обновляем дату последнего поста для этой темы
    this.history.lastPostDates[topicName] = new Date().toISOString();

    // Сохраняем обновленную историю
    this.saveHistory();

    logger.info(`Added post for topic "${topicName}" to history`);
  }

  /**
   * Получить предыдущие посты по теме
   * @param {string} topicName - Название темы
   * @param {number} count - Количество последних постов для получения
   * @returns {Array} - Массив предыдущих постов
   */
  getPreviousPosts(topicName, count = 3) {
    try {
      logger.info(
        `Getting previous posts for topic "${topicName}" (count: ${count})`
      );

      // Проверяем наличие истории
      if (!this.history || !this.history.posts) {
        logger.info(`No history data available for topic "${topicName}"`);
        return [];
      }

      if (!this.history.posts[topicName]) {
        logger.info(`No posts found for topic "${topicName}"`);
        return [];
      }

      // Проверяем, что posts[topicName] - это массив
      if (!Array.isArray(this.history.posts[topicName])) {
        logger.warn(
          `Invalid posts data for topic "${topicName}": expected array, got ${typeof this
            .history.posts[topicName]}`
        );
        return [];
      }

      // Возвращаем последние N постов
      const posts = this.history.posts[topicName].slice(-count);
      logger.info(
        `Retrieved ${posts.length} previous posts for topic "${topicName}"`
      );
      return posts;
    } catch (error) {
      logger.error(
        `Error getting previous posts for topic "${topicName}": ${error.message}`
      );
      return []; // В случае ошибки возвращаем пустой массив
    }
  }

  /**
   * Проверить, был ли недавно пост на эту тему
   * @param {string} topicName - Название темы
   * @param {number} hoursThreshold - Порог в часах
   * @returns {boolean} - true, если пост был недавно
   */
  wasRecentlyPosted(topicName, hoursThreshold = 12) {
    try {
      logger.info(
        `Checking if topic "${topicName}" was recently posted (threshold: ${hoursThreshold} hours)`
      );

      // Проверяем, существует ли запись о последнем посте для этой темы
      if (!this.history || !this.history.lastPostDates) {
        logger.info(`No history data available for topic "${topicName}"`);
        return false;
      }

      const lastPostDate = this.history.lastPostDates[topicName];
      if (!lastPostDate) {
        logger.info(`No previous posts found for topic "${topicName}"`);
        return false;
      }

      // Проверяем, является ли lastPostDate валидной датой
      let lastPost;
      try {
        lastPost = new Date(lastPostDate);
        if (isNaN(lastPost.getTime())) {
          logger.warn(
            `Invalid date format for topic "${topicName}": ${lastPostDate}`
          );
          return false;
        }
      } catch (dateError) {
        logger.warn(
          `Error parsing date for topic "${topicName}": ${dateError.message}`
        );
        return false;
      }

      const now = new Date();
      const hoursDiff = (now - lastPost) / (1000 * 60 * 60);

      logger.info(
        `Topic "${topicName}" was last posted ${hoursDiff.toFixed(2)} hours ago`
      );
      return hoursDiff < hoursThreshold;
    } catch (error) {
      logger.error(
        `Error checking if topic "${topicName}" was recently posted: ${error.message}`
      );
      return false; // В случае ошибки считаем, что пост не был недавно
    }
  }

  /**
   * Модифицировать промпт с учетом предыдущих постов
   * @param {string} topicName - Название темы
   * @param {string} originalPrompt - Исходный промпт
   * @returns {string} - Модифицированный промпт
   */
  enhancePromptWithHistory(topicName, originalPrompt) {
    try {
      logger.info(`Enhancing prompt with history for topic "${topicName}"`);

      // Проверяем наличие истории
      if (!this.history || !this.history.posts) {
        logger.info(
          `No history data available, using original prompt for topic "${topicName}"`
        );
        return originalPrompt;
      }

      const previousPosts = this.getPreviousPosts(topicName);

      if (previousPosts.length === 0) {
        logger.info(
          `No previous posts found for topic "${topicName}", using original prompt`
        );
        return originalPrompt;
      }

      logger.info(
        `Found ${previousPosts.length} previous posts for topic "${topicName}"`
      );

      // Добавляем информацию о предыдущих постах к промпту
      let enhancedPrompt =
        originalPrompt +
        "\n\nВажно: Создай уникальный контент, который не повторяет предыдущие посты на эту тему. Вот содержание последних постов для справки:\n\n";

      previousPosts.forEach((post, index) => {
        try {
          const date = new Date(post.date).toLocaleDateString("ru-RU");
          const contentPreview = post.content
            ? post.content.substring(0, 200) + "..."
            : "[Содержимое недоступно]";
          enhancedPrompt += `Пост от ${date}:\n${contentPreview}\n\n`;
        } catch (postError) {
          logger.warn(
            `Error processing post ${index} for topic "${topicName}": ${postError.message}`
          );
          enhancedPrompt += `[Ошибка при обработке поста ${index}]\n\n`;
        }
      });

      enhancedPrompt +=
        "Пожалуйста, создай новый уникальный контент, который не повторяет информацию из этих постов.";

      logger.info(`Successfully enhanced prompt for topic "${topicName}"`);
      return enhancedPrompt;
    } catch (error) {
      logger.error(
        `Error enhancing prompt for topic "${topicName}": ${error.message}`
      );
      // В случае ошибки возвращаем оригинальный промпт
      return originalPrompt;
    }
  }
}

module.exports = new HistoryService();
