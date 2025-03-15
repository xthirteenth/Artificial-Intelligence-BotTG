const { OpenAI } = require("openai");
const config = require("../config/config");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { logger } = require("../utils/logger");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

class OpenAIService {
  constructor() {
    const options = {
      apiKey: config.openai.apiKey,
    };

    // Добавляем прокси, если он настроен
    if (config.proxy && config.proxy.enabled) {
      logger.info(
        `Using proxy for OpenAI API: ${config.proxy.host}:${config.proxy.port}`
      );
      const proxyUrl = `http://${config.proxy.host}:${config.proxy.port}`;

      // Добавляем аутентификацию прокси, если она настроена
      if (
        config.proxy.auth &&
        config.proxy.auth.username &&
        config.proxy.auth.password
      ) {
        const proxyAuthUrl = `http://${config.proxy.auth.username}:${config.proxy.auth.password}@${config.proxy.host}:${config.proxy.port}`;
        options.httpAgent = new HttpsProxyAgent(proxyAuthUrl);
        logger.info("Using proxy with authentication");
      } else {
        options.httpAgent = new HttpsProxyAgent(proxyUrl);
      }
    }

    this.client = new OpenAI(options);

    // Создаем директорию для изображений, если она не существует
    this.imagesDir = path.join(process.cwd(), "images");
    if (!fs.existsSync(this.imagesDir)) {
      try {
        fs.mkdirSync(this.imagesDir, { recursive: true });
        logger.info(`Created directory for images: ${this.imagesDir}`);
      } catch (error) {
        logger.error(`Error creating images directory: ${error.message}`);
      }
    } else {
      logger.info(`Images directory exists: ${this.imagesDir}`);
    }
  }

  /**
   * Generate content using OpenAI's GPT model with web browsing capability
   * @param {string} prompt - The prompt to send to the API
   * @returns {Promise<string>} - The generated content
   */
  async generateContent(prompt) {
    // Добавляем таймаут для запроса
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Content generation timed out for prompt`));
      }, 45000); // 45 секунд таймаут
    });

    try {
      logger.info(
        `Generating content with prompt length: ${prompt.length} chars`
      );

      // Получаем текущий год и месяц для добавления в промпт
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().toLocaleString("ru-RU", {
        month: "long",
      });
      const currentDate = new Date().getDate();

      const systemPrompt =
        config.language === "ru"
          ? `Ты - полезный ассистент, который предоставляет точную, краткую и увлекательную информацию. Твоя задача - создавать уникальный контент для Telegram-канала, который не повторяет предыдущие публикации. Используй актуальные данные и интересные факты. Сегодня ${currentDate} ${currentMonth} ${currentYear} года, используй эту информацию при создании контента. Обязательно включай самую актуальную информацию о последних событиях, технологиях и тенденциях ${currentYear} года. Когда ищешь информацию в интернете, обязательно указывай дату публикации и источник информации.`
          : `You are a helpful assistant that provides accurate, concise, and engaging information. Your task is to create unique content for a Telegram channel that doesn't repeat previous publications. Use current data and interesting facts. Today is ${currentMonth} ${currentDate}, ${currentYear}, use this information when creating content. Be sure to include the most up-to-date information about the latest events, technologies, and trends of ${currentYear}. When searching for information on the internet, always mention the publication date and source of information.`;

      // Не определяем здесь необходимость веб-поиска, так как это уже делается в contentService
      logger.info(`Generating content with standard GPT model`);

      // Создаем базовые параметры запроса
      const requestParams = {
        model: config.openai.model || "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          { role: "user", content: prompt },
        ],
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature,
      };

      // Используем Promise.race для ограничения времени выполнения запроса
      const response = await Promise.race([
        this.client.chat.completions.create(requestParams),
        timeoutPromise,
      ]);

      // Проверяем, что ответ содержит нужные данные
      if (
        !response ||
        !response.choices ||
        !response.choices[0] ||
        !response.choices[0].message
      ) {
        logger.warn(`Invalid response format from content generation`);
        throw new Error("Invalid response format from OpenAI API");
      }

      const content = response.choices[0].message.content.trim();

      // Проверяем, что контент не пустой
      if (!content || content.length < 10) {
        logger.warn(`Empty or too short content from content generation`);
        throw new Error("Generated content is empty or too short");
      }

      logger.info(
        `Content generated successfully, length: ${content.length} chars`
      );
      return content;
    } catch (error) {
      logger.error("Error generating content with OpenAI:", error);

      // Возвращаем информативное сообщение об ошибке
      return config.language === "ru"
        ? `Не удалось сгенерировать контент. Ошибка: ${error.message}. Пожалуйста, попробуйте позже.`
        : `Failed to generate content. Error: ${error.message}. Please try again later.`;
    }
  }

  /**
   * Search for current information on the web
   * @param {string} query - The search query
   * @returns {Promise<string>} - The search results
   */
  async searchWeb(query) {
    // Добавляем таймаут для запроса
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Web search timed out for query: ${query}`));
      }, 30000); // 30 секунд таймаут
    });

    try {
      logger.info(`Searching web for: ${query}`);

      // Получаем текущий год для добавления в промпт
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().toLocaleString("ru-RU", {
        month: "long",
      });
      const currentDate = new Date().getDate();

      // Проверяем, содержит ли запрос упоминание о машинном обучении или нейросетях
      const isMLQuery =
        query.toLowerCase().includes("машинн") ||
        query.toLowerCase().includes("нейросет") ||
        query.toLowerCase().includes("machine learning") ||
        query.toLowerCase().includes("neural network");

      // Если запрос связан с машинным обучением, добавляем инструкцию о поиске на GitHub
      const systemPrompt = isMLQuery
        ? config.language === "ru"
          ? `Ты - исследователь, который ищет актуальную информацию. Твоя задача - найти самую свежую информацию по запросу и представить её в структурированном виде с указанием источников и дат публикации. Используй свои знания и базу данных для поиска информации. Сегодня ${currentDate} ${currentMonth} ${currentYear} года, предоставляй только актуальную информацию за текущий год. Обязательно включай информацию о последних событиях, технологиях и тенденциях ${currentYear} года. 
            
            ВАЖНО: Для запросов о машинном обучении и нейросетях обязательно включи информацию о новых проектах и репозиториях на GitHub, которые стали популярными в ${currentYear} году. Укажи названия репозиториев, их авторов, количество звезд и краткое описание технологии.`
          : `You are a researcher looking for current information. Your task is to find the most up-to-date information on the query and present it in a structured way with sources and publication dates. Use your knowledge and database to search for information. Today is ${currentMonth} ${currentDate}, ${currentYear}, provide only current information for this year. Be sure to include information about the latest events, technologies, and trends of ${currentYear}.
            
            IMPORTANT: For queries about machine learning and neural networks, be sure to include information about new projects and repositories on GitHub that have become popular in ${currentYear}. Include repository names, their authors, number of stars, and a brief description of the technology.`
        : config.language === "ru"
        ? `Ты - исследователь, который ищет актуальную информацию. Твоя задача - найти самую свежую информацию по запросу и представить её в структурированном виде с указанием источников и дат публикации. Используй свои знания и базу данных для поиска информации. Сегодня ${currentDate} ${currentMonth} ${currentYear} года, предоставляй только актуальную информацию за текущий год. Обязательно включай информацию о последних событиях, технологиях и тенденциях ${currentYear} года.`
        : `You are a researcher looking for current information. Your task is to find the most up-to-date information on the query and present it in a structured way with sources and publication dates. Use your knowledge and database to search for information. Today is ${currentMonth} ${currentDate}, ${currentYear}, provide only current information for this year. Be sure to include information about the latest events, technologies, and trends of ${currentYear}.`;

      // Если запрос связан с машинным обучением, добавляем информацию о GitHub в запрос
      const enhancedQuery = isMLQuery
        ? `${query} Включи информацию о новых популярных проектах и репозиториях на GitHub в области машинного обучения и нейросетей за ${currentYear} год.`
        : query;

      // Используем обычный запрос без параметра tools, так как он вызывает ошибки
      const response = await Promise.race([
        this.client.chat.completions.create({
          model: "gpt-4o", // Используем GPT-4o для более актуальной информации
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            { role: "user", content: enhancedQuery },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
        timeoutPromise,
      ]);

      // Проверяем, что ответ содержит нужные данные
      if (
        !response ||
        !response.choices ||
        !response.choices[0] ||
        !response.choices[0].message
      ) {
        logger.warn(
          `Invalid response format from web search for query: ${query}`
        );
        return `Не удалось найти актуальную информацию по запросу: ${query}`;
      }

      const content = response.choices[0].message.content.trim();

      // Проверяем, что контент не пустой
      if (!content || content.length < 10) {
        logger.warn(
          `Empty or too short content from web search for query: ${query}`
        );
        return `Не удалось найти достаточно информации по запросу: ${query}`;
      }

      logger.info(
        `Web search completed for: ${query}, content length: ${content.length} chars`
      );
      return content;
    } catch (error) {
      logger.error(
        `Error searching web with OpenAI for query "${query}":`,
        error
      );

      // Возвращаем информативное сообщение об ошибке
      return config.language === "ru"
        ? `Не удалось выполнить поиск в интернете по запросу "${query}". Ошибка: ${error.message}`
        : `Failed to search the web for "${query}". Error: ${error.message}`;
    }
  }

  /**
   * Generate content with web search for specific topics that require current information
   * @param {string} prompt - The base prompt
   * @param {string} topic - The topic name
   * @returns {Promise<string>} - The generated content with current information
   */
  async generateContentWithWebSearch(prompt, topic) {
    // Добавляем таймаут для всей операции
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Web search operation timed out for topic: ${topic}`));
      }, 60000); // 60 секунд таймаут
    });

    try {
      logger.info(`Generating content with web search for topic: ${topic}`);

      // Получаем текущий год и месяц для добавления в промпт
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().toLocaleString("ru-RU", {
        month: "long",
      });
      const currentDate = new Date().getDate();

      // Сначала ищем актуальную информацию по теме
      const searchQuery =
        config.language === "ru"
          ? `Последние новости и события по теме "${topic}" за ${currentYear} год (по состоянию на ${currentDate} ${currentMonth}). Предоставь самую актуальную информацию, факты, тенденции и достижения в этой области за текущий год.`
          : `Latest news and events about "${topic}" in ${currentYear} (as of ${currentMonth} ${currentDate}). Provide the most current information, facts, trends, and achievements in this field for the current year.`;

      logger.info(`Starting web search for query: "${searchQuery}"`);

      // Используем Promise.race для ограничения времени выполнения запроса
      const searchResults = await Promise.race([
        this.searchWeb(searchQuery),
        timeoutPromise,
      ]);

      logger.info(`Web search results obtained for topic: ${topic}`);

      // Если результаты поиска пустые или слишком короткие, используем обычную генерацию
      if (!searchResults || searchResults.length < 50) {
        logger.warn(
          `Web search returned insufficient results for topic: ${topic}, falling back to regular content generation`
        );
        return this.generateContent(prompt);
      }

      // Создаем расширенный промпт с результатами поиска
      const enhancedPrompt =
        config.language === "ru"
          ? `${prompt}\n\nИспользуй следующую актуальную информацию для создания поста:\n\n${searchResults}\n\nСоздай информативный и увлекательный пост для Telegram-канала, используя эту актуальную информацию за ${currentYear} год (по состоянию на ${currentDate} ${currentMonth}). Обязательно укажи источники информации в конце поста. Не упоминай 2023 год как текущий, сейчас ${currentYear} год.`
          : `${prompt}\n\nUse the following current information to create your post:\n\n${searchResults}\n\nCreate an informative and engaging post for a Telegram channel using this current information for ${currentYear} (as of ${currentMonth} ${currentDate}). Be sure to include the sources of information at the end of the post. Do not mention 2023 as the current year, the current year is ${currentYear}.`;

      logger.info(
        `Enhanced prompt created with web search results for topic: ${topic}`
      );

      // Генерируем контент с расширенным промптом с таймаутом
      const content = await Promise.race([
        this.generateContent(enhancedPrompt),
        timeoutPromise,
      ]);

      logger.info(
        `Content with web search generated successfully for topic: ${topic}`
      );
      return content;
    } catch (error) {
      logger.error(
        `Error generating content with web search for topic ${topic}:`,
        error
      );
      // В случае ошибки или таймаута, возвращаемся к обычной генерации контента
      logger.info(
        `Falling back to regular content generation for topic: ${topic}`
      );
      try {
        return await this.generateContent(prompt);
      } catch (fallbackError) {
        logger.error(
          `Error in fallback content generation: ${fallbackError.message}`
        );
        // В случае критической ошибки возвращаем простое сообщение
        return config.language === "ru"
          ? `Информация по теме "${topic}" временно недоступна. Пожалуйста, попробуйте позже.`
          : `Information on "${topic}" is temporarily unavailable. Please try again later.`;
      }
    }
  }

  /**
   * Generate an image using OpenAI's DALL-E model
   * @param {string} prompt - The prompt to generate an image from
   * @param {string} topicName - The topic name (used for the filename)
   * @returns {Promise<string>} - The path to the saved image
   */
  async generateImage(prompt, topicName) {
    try {
      logger.info(`Generating image for topic: ${topicName}`);
      logger.info(`Image prompt: ${prompt}`);

      // Добавляем русский язык к промпту, если нужно
      const fullPrompt =
        config.language === "ru"
          ? `${prompt}, высокое качество, фотореалистичное изображение`
          : `${prompt}, high quality, photorealistic image`;

      const response = await this.client.images.generate({
        model: "dall-e-3",
        prompt: fullPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "url",
      });

      const imageUrl = response.data[0].url;
      logger.info(`Image generated successfully, URL: ${imageUrl}`);

      // Скачиваем и сохраняем изображение
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const sanitizedTopicName = topicName.replace(/[^a-zA-Zа-яА-Я0-9]/g, "_");
      const filename = `${sanitizedTopicName}_${timestamp}.png`;
      const imagePath = path.join(this.imagesDir, filename);

      logger.info(`Downloading image to: ${imagePath}`);

      // Скачиваем изображение
      const imageResponse = await axios({
        method: "GET",
        url: imageUrl,
        responseType: "stream",
      });

      // Сохраняем изображение
      const writer = fs.createWriteStream(imagePath);
      imageResponse.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on("finish", () => {
          // Проверяем, что файл действительно создан
          if (fs.existsSync(imagePath)) {
            const stats = fs.statSync(imagePath);
            logger.info(
              `Image saved to: ${imagePath} (size: ${stats.size} bytes)`
            );
            resolve(imagePath);
          } else {
            const error = new Error(`Image file was not created: ${imagePath}`);
            logger.error(error.message);
            reject(error);
          }
        });
        writer.on("error", (error) => {
          logger.error(`Error saving image: ${error.message}`);
          reject(error);
        });
      });
    } catch (error) {
      logger.error("Error generating image with OpenAI:", error);
      throw new Error(`Failed to generate image: ${error.message}`);
    }
  }
}

module.exports = new OpenAIService();
