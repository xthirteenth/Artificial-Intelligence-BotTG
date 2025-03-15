# BotInfoTG

A Node.js bot that collects news, technologies, code, formulas, and other information using the ChatGPT API, processes it into a suitable form, and publishes it to a Telegram channel.

## Features

- Automatically generates content on various topics using OpenAI's GPT models
- Posts content to a Telegram channel on a fixed schedule (3 posts per day)
- Supports multiple content topics including:
  - Technology News
  - Programming Tips
  - AI Advancements
  - Scientific Discoveries
  - Machine Learning & Neural Networks News
  - Frontend Tips
- **Web search capability** to find and include the latest information from the internet
- Generates unique content that doesn't repeat previous posts
- Tracks post history to avoid duplicates
- Supports image generation with DALL-E for each topic
- Configurable via environment variables
- Posts at 9 AM, 3 PM, and 9 PM daily
- Supports proxy for OpenAI and Telegram API connections
- Telegram bot commands for manual post creation and management

## Prerequisites

- Node.js (v14 or higher)
- OpenAI API key
- Telegram Bot Token
- Telegram Channel ID

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/yourusername/botinfotgjs.git
   cd botinfotgjs
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:

   ```
   # OpenAI API Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4-turbo
   MAX_TOKENS=1500
   TEMPERATURE=0.7

   # Telegram Bot Configuration
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   TELEGRAM_CHANNEL_ID=your_telegram_channel_id_here
   ENABLE_COMMANDS=true
   ADMIN_USER_IDS=123456789,987654321

   # Proxy Configuration
   PROXY_ENABLED=false
   PROXY_HOST=your_proxy_host
   PROXY_PORT=your_proxy_port
   PROXY_USERNAME=your_proxy_username
   PROXY_PASSWORD=your_proxy_password

   # Bot Configuration
   RUN_ON_STARTUP=false
   TEST_BOT_ON_STARTUP=false
   LANGUAGE=ru
   GENERATE_IMAGES=true
   ENABLE_WEB_SEARCH=true
   DEBUG_MODE=true
   ```

## Getting API Keys and Tokens

### OpenAI API Key

1. Go to [OpenAI's platform](https://platform.openai.com/account/api-keys)
2. Create an account or log in
3. Generate a new API key
4. Copy the key to your `.env` file

### Telegram Bot Token

1. Talk to [BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow the instructions to create a new bot
3. Copy the token provided by BotFather to your `.env` file

### Telegram Channel ID

1. Create a channel in Telegram or use an existing one
2. Add your bot as an administrator to the channel with posting privileges
3. To get the channel ID, you can:
   - Forward a message from your channel to [@userinfobot](https://t.me/userinfobot)
   - Or use the Telegram API's getUpdates method
4. Channel IDs usually start with `-100` followed by numbers

### Telegram Admin User IDs

1. To get your Telegram user ID, talk to [@userinfobot](https://t.me/userinfobot) on Telegram
2. Add your user ID and any other admin user IDs to the `ADMIN_USER_IDS` environment variable, separated by commas

## Usage

### Starting the Bot

```bash
# Start the bot
npm start

# For development with auto-restart
npm run dev
```

### Post Schedule

The bot is configured to post three times a day with specific topics:

- **Morning Post (9:00 AM)**: Technology News
- **Afternoon Post (3:00 PM)**: AI Advancements
- **Evening Post (9:00 PM)**: Rotating topics depending on the day of the week:
  - Sunday: Scientific Discoveries
  - Monday: Machine Learning & Neural Networks News
  - Tuesday: Frontend Tips
  - Wednesday: Programming Tips
  - Thursday: Technology News
  - Friday: Machine Learning & Neural Networks News
  - Saturday: AI Advancements

### Web Search Capability

The bot can search the internet for the latest information on topics:

- Set `ENABLE_WEB_SEARCH=true` in your `.env` file to enable this feature
- The bot will automatically search for current information for news-related topics
- Web search is specifically enabled for:
  - Technology News
  - Machine Learning & Neural Networks News
  - AI Advancements
- Search results include publication dates and sources
- This ensures that your posts contain the most up-to-date information available

### Content Uniqueness

The bot includes a sophisticated system to prevent content duplication:

- Tracks history of previous posts for each topic
- Enhances prompts with information about previous content
- Instructs the AI to generate unique content that doesn't repeat previous posts
- Smart topic selection for random posts that avoids recently posted topics
- Stores post history in a JSON file for persistence between restarts

### Telegram Commands

When `ENABLE_COMMANDS` is set to `true`, the bot will listen for the following commands from admin users:

- `/post` - Create a post on a random topic immediately
- `/post_topic <index>` - Create a post on a specific topic immediately (e.g., `/post_topic 0` for Technology News)
- `/topics` - Show a list of available topics and their indices
- `/status` - Check the bot's status and view last post dates for each topic
- `/help` - Show a list of available commands and information about the bot

### Image Generation

When `GENERATE_IMAGES=true`, the bot will generate images for each post using OpenAI's DALL-E model. Each topic has a specific image prompt that is used to generate relevant images.

### Proxy Configuration

If you need to use a proxy to connect to OpenAI or Telegram APIs (for regions where these services might be restricted), set `PROXY_ENABLED` to `true` and configure the proxy settings:

```
PROXY_ENABLED=true
PROXY_HOST=your_proxy_host
PROXY_PORT=your_proxy_port
PROXY_USERNAME=your_proxy_username (optional)
PROXY_PASSWORD=your_proxy_password (optional)
```

### Customizing Content Topics

You can customize the content topics by editing the `topics` array in `src/config/config.js`:

```javascript
topics: [
  {
    name: "Your Topic Name",
    nameEn: "English Topic Name",
    prompt: "Your detailed prompt in Russian",
    promptEn: "Your detailed prompt in English",
    imagePrompt: "Prompt for image generation",
  },
  // Add more topics as needed
];
```

You can also customize which topics use web search by modifying the `webSearchTopics` array:

```javascript
webSearchTopics: ["Topic Name 1", "Topic Name 2", "Topic Name 3"],
```

If you change the topics, you may also want to update the scheduled jobs in `server.js` to use your new topics.

### Customizing the Schedule

If you want to change the posting times, you need to modify the cron expressions in the `server.js` file:

```javascript
// Morning post
const morningJob = scheduler.createJob(
  "Morning Post",
  "0 9 * * *" // 9 AM every day - change this to your preferred time
  // ...
);

// Afternoon post
const afternoonJob = scheduler.createJob(
  "Afternoon Post",
  "0 15 * * *" // 3 PM every day - change this to your preferred time
  // ...
);

// Evening post
const eveningJob = scheduler.createJob(
  "Evening Post",
  "0 21 * * *" // 9 PM every day - change this to your preferred time
  // ...
);
```

## Project Structure

```
botinfotgjs/
├── .env                  # Environment variables
├── .gitignore            # Git ignore file
├── package.json          # Project dependencies and scripts
├── README.md             # Project documentation
├── server.js             # Main application entry point
├── data/                 # Directory for storing post history
│   └── post_history.json # History of previous posts
├── images/               # Directory for storing generated images
└── src/
    ├── config/
    │   └── config.js     # Application configuration
    ├── services/
    │   ├── contentService.js  # Content generation and processing
    │   ├── historyService.js  # Post history tracking and management
    │   ├── openaiService.js   # OpenAI API integration
    │   └── telegramService.js # Telegram API integration
    └── utils/
        ├── logger.js     # Logging utility
        └── scheduler.js  # Cron job scheduler
```

## License

13

## Authors

13 and Claude 3.7 Sonnet

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Disclaimer

This bot uses AI-generated content. Always review the content before sharing it with a wider audience. The accuracy and quality of the generated content depend on the OpenAI model used.
