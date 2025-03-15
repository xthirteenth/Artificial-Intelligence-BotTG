require("dotenv").config();

module.exports = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    maxTokens: parseInt(process.env.MAX_TOKENS || "1000"),
    temperature: parseFloat(process.env.TEMPERATURE || "0.7"),
    model: process.env.OPENAI_MODEL || "gpt-4",
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    channelId: process.env.TELEGRAM_CHANNEL_ID,
    enableCommands: process.env.ENABLE_COMMANDS === "true",
    adminUserIds: process.env.ADMIN_USER_IDS
      ? process.env.ADMIN_USER_IDS.split(",")
      : [],
  },
  proxy: {
    enabled: process.env.PROXY_ENABLED === "true",
    host: process.env.PROXY_HOST,
    port: process.env.PROXY_PORT,
    auth: {
      username: process.env.PROXY_USERNAME,
      password: process.env.PROXY_PASSWORD,
    },
  },
  cron: {
    schedule: process.env.CRON_SCHEDULE || "0 * * * *", // Каждый час (в 0 минут каждого часа)
  },
  language: process.env.LANGUAGE || "ru", // Default language: Russian
  generateImages: process.env.GENERATE_IMAGES === "true", // Whether to generate images for posts
  enableWebSearch: process.env.ENABLE_WEB_SEARCH === "true", // Whether to enable web search for current information
  // Темы, для которых всегда используется поиск в интернете
  webSearchTopics: [
    "Новости технологий",
    "Новости машинного обучения и нейросетей",
    "Достижения в области ИИ",
  ],
  topics: [
    {
      name: "Новости технологий",
      nameEn: "Technology News",
      prompt:
        "Предоставь последние новости и прорывы в области технологий в краткой форме. Пиши на русском языке.",
      promptEn:
        "Provide the latest technology news and breakthroughs in a concise format.",
      imagePrompt:
        "Футуристическая технологическая сцена, инновации, новые технологии",
    },
    {
      name: "Советы по программированию",
      nameEn: "Programming Tips",
      prompt:
        "Поделись полезными советами по программированию, лучшими практиками или фрагментами кода, которые разработчики сочтут ценными. Пиши на русском языке.",
      promptEn:
        "Share useful programming tips, best practices, or code snippets that developers would find valuable.",
      imagePrompt:
        "Код на экране компьютера, программирование, разработка программного обеспечения",
    },
    {
      name: "Достижения в области ИИ",
      nameEn: "AI Advancements",
      prompt:
        "Опиши недавние достижения в области искусственного интеллекта и машинного обучения. Пиши на русском языке.",
      promptEn:
        "Describe recent advancements in artificial intelligence and machine learning.",
      imagePrompt:
        "Искусственный интеллект, нейронные сети, футуристический робот с человеческими чертами",
    },
    {
      name: "Научные открытия",
      nameEn: "Scientific Discoveries",
      prompt:
        "Объясни недавние научные открытия или результаты исследований в доступной форме. Пиши на русском языке.",
      promptEn:
        "Explain recent scientific discoveries or research findings in an accessible way.",
      imagePrompt:
        "Научная лаборатория, исследования, микроскоп, ученые за работой",
    },
    {
      name: "Новости машинного обучения и нейросетей",
      nameEn: "Machine Learning & Neural Networks News",
      prompt:
        "Расскажи о последних достижениях, исследованиях и новостях в области машинного обучения и нейронных сетей. Пиши на русском языке.",
      promptEn:
        "Share the latest advancements, research, and news in machine learning and neural networks.",
      imagePrompt:
        "Визуализация нейронной сети, машинное обучение, анализ данных, алгоритмы ИИ",
    },
    {
      name: "Советы по фронтенду",
      nameEn: "Frontend Tips",
      prompt:
        "Поделись полезными советами, трюками и лучшими практиками по фронтенд-разработке (HTML, CSS, JavaScript, фреймворки). Пиши на русском языке.",
      promptEn:
        "Share useful tips, tricks, and best practices for frontend development (HTML, CSS, JavaScript, frameworks).",
      imagePrompt:
        "Веб-дизайн, интерфейс пользователя, красивый веб-сайт, фронтенд-разработка",
    },
  ],
};
