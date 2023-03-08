"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var TelegramBot = require("node-telegram-bot-api");
var dotenv = require("dotenv");
var needle = require("needle");
var ffmpeg = require("fluent-ffmpeg");
var https = require("https");
var fs = require("fs");
dotenv.config();
var telegramToken = process.env.TELEGRAM_TOKEN;
var openAIToken = process.env.OPENAI_API_KEY;
var openAIChatUrl = 'https://api.openai.com/v1/chat/completions';
var openAIWhisperUrl = 'https://api.openai.com/v1/audio/transcriptions';
var removeFile = function (filePath) {
    return fs.unlink(filePath, function (err) {
        if (err) {
            console.error(err);
            return;
        }
    });
};
var initTelegramBot = function (options) {
    if (options === void 0) { options = {}; }
    if (!telegramToken)
        return;
    var bot = new TelegramBot(telegramToken, __assign({ polling: false }, options));
    return bot;
};
var bot = initTelegramBot({ polling: true });
function convertToMp3(wavFilename) {
    if (!fs.existsSync(wavFilename)) {
        throw new Error("File ".concat(wavFilename, " does not exist"));
    }
    return new Promise(function (resolve, reject) {
        var outputFile = wavFilename.replace('.oga', '.mp3');
        ffmpeg({
            source: wavFilename
        })
            .on('error', function (err) {
            reject(err);
        })
            .on('end', function () {
            resolve(outputFile);
        })
            .save(outputFile);
    });
}
var transcribeAudio = function (audioPath) {
    return new Promise(function (resolve, reject) {
        needle.post(openAIWhisperUrl, { model: 'whisper-1', file: { file: audioPath, content_type: 'audio/mpeg' } }, { headers: { Authorization: "Bearer ".concat(openAIToken) }, multipart: true }, function (error, response) {
            var _a;
            if (error) {
                reject(error);
            }
            var transcription = (_a = response === null || response === void 0 ? void 0 : response.body) === null || _a === void 0 ? void 0 : _a.text;
            resolve(transcription);
        });
    });
};
var summarizeText = function (textToSummarize) {
    return new Promise(function (resolve, reject) {
        needle.post(openAIChatUrl, {
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'user',
                    content: "Summarize the following content in bullet points with an emoji in front of each point: ".concat(textToSummarize)
                },
            ]
        }, { headers: { Authorization: "Bearer ".concat(openAIToken) }, json: true }, function (error, response) {
            if (error) {
                reject(error);
            }
            var telegramResponse = response.body.choices[0].message.content;
            resolve(telegramResponse);
        });
    });
};
bot.on('voice', function (msg) { return __awaiter(void 0, void 0, void 0, function () {
    var file_id, chatId, file, filePath_1, voiceUrl_1, tempFile_1, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                file_id = msg.voice.file_id;
                chatId = msg.chat.id;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4, bot.getFile(file_id)];
            case 2:
                file = _a.sent();
                filePath_1 = file.file_path;
                voiceUrl_1 = "https://api.telegram.org/file/bot".concat(telegramToken, "/").concat(filePath_1);
                tempFile_1 = fs.createWriteStream("".concat(__dirname, "/").concat(filePath_1));
                tempFile_1.on('open', function () {
                    https.get(voiceUrl_1, function (response) {
                        if (!tempFile_1)
                            return;
                        response.pipe(tempFile_1);
                    });
                });
                tempFile_1.on('finish', function () { return __awaiter(void 0, void 0, void 0, function () {
                    var ogaFilePath, mp3FilePath, transcription, summary;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                ogaFilePath = "".concat(__dirname, "/").concat(filePath_1);
                                return [4, convertToMp3(ogaFilePath)];
                            case 1:
                                mp3FilePath = _a.sent();
                                return [4, transcribeAudio(mp3FilePath)];
                            case 2:
                                transcription = _a.sent();
                                return [4, summarizeText(transcription)];
                            case 3:
                                summary = _a.sent();
                                bot.sendMessage(chatId, summary);
                                removeFile(mp3FilePath);
                                removeFile(ogaFilePath);
                                return [2];
                        }
                    });
                }); });
                return [3, 4];
            case 3:
                err_1 = _a.sent();
                console.log(err_1);
                return [3, 4];
            case 4: return [2];
        }
    });
}); });
//# sourceMappingURL=chatbot.js.map