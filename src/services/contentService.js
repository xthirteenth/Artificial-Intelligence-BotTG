const openaiService = require("./openaiService");
// Импортируем telegramService только при необходимости, чтобы избежать циклической зависимости
// const telegramService = require("./telegramService");
const config = require("../config/config");
const { logger } = require("../utils/logger");
const historyService = require("./historyService");

class ContentService {
  constructor() {
    this.topics = config.topics;
  }

  /**
   * Generate content for a specific topic
   * @param {Object} topic - The topic object with name and prompt
   * @returns {Promise<string>} - The generated content
   */
  async generateTopicContent(topic) {
    try {
      logger.info(`Generating content for topic: ${topic.name}`);

      // Получаем текущий год для добавления в промпт
      const currentYear = new Date().getFullYear();

      // Получаем базовый промпт в зависимости от языка
      let basePrompt = config.language === "ru" ? topic.prompt : topic.promptEn;

      // Добавляем указание на текущий год
      basePrompt =
        config.language === "ru"
          ? `${basePrompt} Предоставь актуальную информацию за ${currentYear} год.`
          : `${basePrompt} Provide current information for ${currentYear}.`;

      // Улучшаем промпт с учетом истории постов
      const enhancedPrompt = historyService.enhancePromptWithHistory(
        topic.name,
        basePrompt
      );
      logger.info(
        `Using enhanced prompt with history for topic: ${topic.name}`
      );

      // Проверяем, является ли тема "Новости машинного обучения и нейросетей"
      const isMLTopic =
        topic.name === "Новости машинного обучения и нейросетей";

      // Проверяем, нужно ли использовать поиск в интернете для этой темы
      // Всегда используем веб-поиск для темы "Новости машинного обучения и нейросетей"
      const useWebSearch =
        isMLTopic ||
        (config.enableWebSearch && config.webSearchTopics.includes(topic.name));

      // Добавляем ключевые слова для поиска в интернете в промпт
      let finalPrompt = enhancedPrompt;
      if (useWebSearch) {
        if (isMLTopic) {
          // Специальный промпт для темы "Новости машинного обучения и нейросетей"
          finalPrompt =
            config.language === "ru"
              ? `${enhancedPrompt}\n\nПредоставь последние новости и актуальную информацию по машинному обучению и нейросетям за ${currentYear} год. Обязательно включи информацию о новых проектах и репозиториях на GitHub, которые стали популярными в ${currentYear} году. Укажи названия репозиториев, их авторов, количество звезд и краткое описание технологии. Не упоминай 2023 год как текущий.`
              : `${enhancedPrompt}\n\nProvide the latest news and current information on machine learning and neural networks for ${currentYear}. Be sure to include information about new projects and repositories on GitHub that have become popular in ${currentYear}. Include repository names, their authors, number of stars, and a brief description of the technology. Do not mention 2023 as the current year.`;
        } else {
          finalPrompt =
            config.language === "ru"
              ? `${enhancedPrompt}\n\nПредоставь последние новости и актуальную информацию по этой теме за ${currentYear} год. Не упоминай 2023 год как текущий.`
              : `${enhancedPrompt}\n\nProvide the latest news and current information on this topic for ${currentYear}. Do not mention 2023 as the current year.`;
        }
      }

      let content;
      if (useWebSearch) {
        logger.info(`Using web search for topic: ${topic.name}`);
        content = await openaiService.generateContentWithWebSearch(
          finalPrompt,
          topic.name
        );
        logger.info(
          `Content with web search generated for topic: ${topic.name}`
        );
      } else {
        // Генерируем контент с улучшенным промптом
        content = await openaiService.generateContent(finalPrompt);
        logger.info(
          `Content generated without web search for topic: ${topic.name}`
        );
      }

      // Сохраняем сгенерированный контент в историю
      historyService.addPost(topic.name, content);

      logger.info(`Content generated successfully for topic: ${topic.name}`);
      return content;
    } catch (error) {
      logger.error(`Error generating content for topic ${topic.name}:`, error);
      throw error;
    }
  }

  /**
   * Post content for a specific topic
   * @param {number} topicIndex - The index of the topic in the config
   * @returns {Promise<void>}
   */
  async postTopicContent(topicIndex) {
    try {
      // Импортируем telegramService здесь, чтобы избежать циклической зависимости
      const telegramService = require("./telegramService");

      const topic = config.topics[topicIndex];
      if (!topic) {
        throw new Error(`Topic with index ${topicIndex} not found`);
      }

      logger.info(`Posting content for topic: ${topic.name}`);
      const content = await this.generateTopicContent(topic);

      // Генерируем изображение, если включена соответствующая опция
      let imagePath = null;
      if (config.generateImages && topic.imagePrompt) {
        try {
          imagePath = await openaiService.generateImage(
            topic.imagePrompt,
            topic.name
          );
          logger.info(
            `Image generated for topic: ${topic.name}, path: ${imagePath}`
          );
        } catch (imageError) {
          logger.error(
            `Error generating image for topic ${topic.name}:`,
            imageError
          );
          // Продолжаем без изображения в случае ошибки
        }
      }

      // Формируем заголовок поста (не экранируем, так как это будет сделано в telegramService)
      const header =
        config.language === "ru"
          ? `📝 *${topic.name}*\n\n`
          : `📝 *${topic.name}*\n\n`;

      // Отправляем пост с изображением или без
      if (imagePath) {
        await telegramService.sendPhotoToChannel(
          imagePath,
          `${header}${content}`
        );
      } else {
        await telegramService.sendMessageToChannel(`${header}${content}`);
      }

      logger.info(`Content posted successfully for topic: ${topic.name}`);
    } catch (error) {
      logger.error(
        `Error posting content for topic index ${topicIndex}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Post content for a random topic
   * @returns {Promise<void>}
   */
  async postRandomTopicContent() {
    try {
      logger.info("Starting topic selection process for default topic");

      // Находим индекс темы "Новости машинного обучения и нейросетей"
      const defaultTopicName = "Новости машинного обучения и нейросетей";
      let topicIndex = this.topics.findIndex(
        (topic) => topic.name === defaultTopicName
      );

      // Если тема не найдена, используем первую тему
      if (topicIndex === -1) {
        topicIndex = 0;
        logger.warn(
          `Default topic "${defaultTopicName}" not found, using topic at index 0`
        );
      }

      const selectedTopic = this.topics[topicIndex];
      logger.info(
        `Using default topic: "${selectedTopic.name}" (index: ${topicIndex})`
      );

      // Публикуем контент для выбранной темы
      await this.postTopicContent(topicIndex);
      logger.info(
        `Content posted successfully for default topic: ${selectedTopic.name}`
      );
    } catch (error) {
      logger.error("Error posting content for default topic:", error);
      throw error;
    }
  }

  /**
   * Post content for all topics
   * @returns {Promise<void>}
   */
  async postAllTopicsContent() {
    try {
      for (let i = 0; i < config.topics.length; i++) {
        await this.postTopicContent(i);
      }
    } catch (error) {
      logger.error("Error posting all topics content:", error);
      throw error;
    }
  }
}

module.exports = new ContentService();
