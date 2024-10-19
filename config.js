const config = {
  // List of friendly channel names where the bot is allowed to respond
  allowedChannels: ["ai-bot"],

  // URLs to be crawled daily for the latest SAINTCON information
  urls: [
    "https://saintcon.org/",
    "https://saintcon.org/coc",
    "https://saintcon.org/com-ai-community/",
    "https://saintcon.org/com-appsec-community/",
    "https://saintcon.org/com-badgelife-community/",
    "https://saintcon.org/com-blueteam-community/",
    "https://saintcon.org/com-briefs-community/",
    "https://saintcon.org/com-education-security-community/",
    "https://saintcon.org/com-ham-radio-community/",
    "https://saintcon.org/com-hardware-community/",
    "https://saintcon.org/com-health-care-hacking-community/",
    "https://saintcon.org/com-homelabs-community/",
    "https://saintcon.org/com-id-iot-community/",
    "https://saintcon.org/com-leadership-community/",
    "https://saintcon.org/com-lockpick-community/",
    "https://saintcon.org/com-rfid-nfc-community/",
    "https://saintcon.org/com-space-community/",
    "https://saintcon.org/com-tamper-evident-community/",
    "https://saintcon.org/com-thekeep-community/",
    "https://saintcon.org/com-v-e-n-d/",
    "https://saintcon.org/com-wic-advocates/",
    "https://saintcon.org/comments/feed/",
    "https://saintcon.org/con-appsec-challenge/",
    "https://saintcon.org/con-ctf-blue-team-style/",
    "https://saintcon.org/con-foxhunt/",
    "https://saintcon.org/con-hackerschallenge/",
    "https://saintcon.org/con-lan-cable/",
    "https://saintcon.org/con-so-youve-been-hacked/",
    "https://saintcon.org/con-tamper-evident-challenge/",
    "https://saintcon.org/con-vault-challenge/",
    "https://saintcon.org/evt-family-night/",
    "https://saintcon.org/evt-golf-club/",
    "https://saintcon.org/evt-hackinthebox/",
    "https://saintcon.org/evt-jeopardy/",
    "https://saintcon.org/evt-job-fair/",
    "https://saintcon.org/evt-lanparty/",
    "https://saintcon.org/evt-tfht/",
    "https://saintcon.org/keynotes/",
    "https://saintcon.org/main-communities/",
    "https://saintcon.org/main-contests/",
    "https://saintcon.org/main-events/",
    "https://saintcon.org/minibadge-trading/",
    "https://saintcon.org/register/",
    "https://saintcon.org/sec/",
    "https://saintcon.org/sponsors/",
    "https://saintcon.org/training/",
    "https://www.saintcon.org/tac/",
  ],

  // URL for the FAQ page to be processed separately
  faqUrl: "https://saintcon.org/faq/",

  // URL for the Sessionize API to fetch session and speaker data
  sessionizeApiUrl: "https://sessionize.com/api/v2/wr191qz5/view/All",

  // Settings for the AI model used for generating responses
  // aiModel: "gemini-1.5-flash", // options: "gpt-4o-mini", "gemini-1.5-flash"
  aiModel: "gpt-4o-mini", // options: "gpt-4o-mini", "gemini-1.5-flash"
  maxTokens: 500,
  aiPromptPath: "ai_prompt.txt",

  // Settings for logging
  logFilePath: "saintcon-bot.log",
  extractionLogFilePath: "extraction.log",
};

export default config;
