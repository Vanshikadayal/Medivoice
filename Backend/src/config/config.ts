export default () => ({
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  database: {
    connectionString: process.env.MONGODB_URI,
  },
  medicineScanner: {
    requestTimeoutMs: Number(process.env.MEDICINE_DATABASE_TIMEOUT_MS ?? 15000),
    openFda: {
      baseUrl: process.env.OPENFDA_BASE_URL ?? 'https://api.fda.gov',
      apiKey: process.env.OPENFDA_API_KEY,
    },
  },
  chat: {
    maxHistoryMessages: Number(process.env.CHAT_MAX_HISTORY_MESSAGES ?? 20),
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL ?? 'gemini-3.6-flash',
      timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS ?? 30000),
    },
  },
  voice: {
    maxAudioFileSizeBytes: Number(
      process.env.VOICE_MAX_AUDIO_FILE_SIZE_BYTES ?? 10 * 1024 * 1024,
    ),
    speechToText: {
      provider: process.env.SPEECH_TO_TEXT_PROVIDER ?? 'local-whisper',
      serviceUrl: process.env.WHISPER_SERVICE_URL ?? 'http://127.0.0.1:8001',
      timeoutMs: Number(process.env.WHISPER_TIMEOUT_MS ?? 60000),
    },
    textToSpeech: {
      provider: process.env.TEXT_TO_SPEECH_PROVIDER ?? 'local-piper',
      executable: process.env.PIPER_EXECUTABLE,
      model: process.env.PIPER_MODEL,
      config: process.env.PIPER_CONFIG,
      timeoutMs: Number(process.env.PIPER_TIMEOUT_MS ?? 30000),
    },
  },
});