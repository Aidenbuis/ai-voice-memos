import TelegramBot = require('node-telegram-bot-api')
import dotenv = require('dotenv')
import needle = require('needle')
import ffmpeg = require('fluent-ffmpeg')
import https = require('https')
import fs = require('fs')

dotenv.config()

const telegramToken = process.env.TELEGRAM_TOKEN
const openAIToken = process.env.OPENAI_API_KEY

const openAIChatUrl = 'https://api.openai.com/v1/chat/completions'
const openAIWhisperUrl = 'https://api.openai.com/v1/audio/transcriptions'

const removeFile = (filePath: string) =>
  fs.unlink(filePath, (err: any) => {
    if (err) {
      console.error(err)
      return
    }
  })

const initTelegramBot = (options: TelegramBot.ConstructorOptions = {}) => {
  if (!telegramToken) return
  const bot = new TelegramBot(telegramToken, { polling: false, ...options })
  return bot
}

const bot = initTelegramBot({ polling: true })

function convertToMp3(wavFilename: string): Promise<string> {
  if (!fs.existsSync(wavFilename)) {
    throw new Error(`File ${wavFilename} does not exist`)
  }

  return new Promise((resolve, reject) => {
    const outputFile = wavFilename.replace('.oga', '.mp3')

    ffmpeg({
      source: wavFilename,
    })
      .on('error', (err: any) => {
        reject(err)
      })
      .on('end', () => {
        resolve(outputFile)
      })
      .save(outputFile)
  })
}

const transcribeAudio = (audioPath: string) => {
  return new Promise<null | string>((resolve, reject) => {
    needle.post(
      openAIWhisperUrl,
      { model: 'whisper-1', file: { file: audioPath, content_type: 'audio/mpeg' } },
      { headers: { Authorization: `Bearer ${openAIToken}` }, multipart: true },
      function (error, response) {
        if (error) {
          reject(error)
        }

        const transcription = response?.body?.text

        resolve(transcription)
      }
    )
  })
}

const summarizeText = (textToSummarize: string) => {
  return new Promise<string | null>((resolve, reject) => {
    needle.post(
      openAIChatUrl,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: `Summarize the following content in bullet points with an emoji in front of each point: ${textToSummarize}`,
          },
        ],
      },
      { headers: { Authorization: `Bearer ${openAIToken}` }, json: true },
      function (error, response) {
        if (error) {
          reject(error)
        }

        const telegramResponse = response.body.choices[0].message.content
        resolve(telegramResponse)
      }
    )
  })
}

bot.on('voice', async msg => {
  const file_id = msg.voice.file_id
  const chatId = msg.chat.id

  try {
    const file = await bot.getFile(file_id)
    const filePath = file.file_path
    const voiceUrl = `https://api.telegram.org/file/bot${telegramToken}/${filePath}`
    const tempFile = fs.createWriteStream(`${__dirname}/${filePath}`)

    tempFile.on('open', function () {
      https.get(voiceUrl, function (response: any) {
        if (!tempFile) return
        response.pipe(tempFile)
      })
    })

    tempFile.on('finish', async () => {
      const ogaFilePath = `${__dirname}/${filePath}`
      const mp3FilePath = await convertToMp3(ogaFilePath)
      const transcription = await transcribeAudio(mp3FilePath)
      const summary = await summarizeText(transcription)

      bot.sendMessage(chatId, summary)

      removeFile(mp3FilePath)
      removeFile(ogaFilePath)
    })
  } catch (err) {
    console.log(err)
  }
})
