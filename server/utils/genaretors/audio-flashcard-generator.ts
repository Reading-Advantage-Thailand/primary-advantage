import { prisma } from "@/lib/prisma";
import {
  AUDIO_WORDS_URL,
  AVAILABLE_VOICES,
  BASE_TEXT_TO_SPEECH_URL,
} from "../constants";
import base64 from "base64-js";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { generateWordList } from "./wordlist-generator";
import { uploadToBucket } from "@/utils/storage";

export type sentenceTranslation = {
  sentence: string;
  translation: {
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
};

export type wordTranslation = {
  vocabulary: string;
  definition: {
    en: string;
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
};

export type SentencesResponse = {
  sentence: string;
  translation: {
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  timeSeconds?: number;
};

export type WordsResponse = {
  vocabulary: string;
  definition: {
    en: string;
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  timeSeconds?: number;
};

export type GenerateAudioParams = {
  sentences: sentenceTranslation[];
  words: wordTranslation[];
  contentId: string;
  job: "article" | "story";
};

// export type GenerateChapterAudioParams = {
//   sentences: SentencesResponse[];
//   words: WordsResponse[];
//   storyId: string;
//   chapterNumber: string;
// };

interface TimePoint {
  timeSeconds: number;
  markName: string;
}

function contentToSSML(content: string[]): string {
  let ssml = "<speak>";
  content.forEach((sentence, i) => {
    ssml += `<s><mark name='sentence${
      i + 1
    }'/>${sentence}<break time="500ms"/></s>`;
  });
  ssml += "</speak>";
  return ssml;
}

const FLASHCARD_MAX_RETRIES = 3;
const FLASHCARD_RETRY_DELAY_BASE = 1000;

async function synthesizeAndUpload({
  texts,
  localPath,
  cloudPath,
  voice,
}: {
  texts: string[];
  localPath: string;
  cloudPath: string;
  voice: string;
}): Promise<{
  timePoints: TimePoint[];
  audioContent: string;
  uploadSuccess: boolean;
  uploadError?: string;
}> {
  // ── Phase 1: TTS generate + write to disk (retry on TTS/write failure) ──
  let ttsData: any;
  let generateAttempts = 0;

  while (generateAttempts < FLASHCARD_MAX_RETRIES) {
    try {
      const response = await fetch(
        `${BASE_TEXT_TO_SPEECH_URL}/v1beta1/text:synthesize?key=${process.env.GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { ssml: contentToSSML(texts) },
            voice: { languageCode: "en-US", name: voice },
            audioConfig: { audioEncoding: "MP3" },
            enableTimePointing: ["SSML_MARK"],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`TTS HTTP error: ${response.statusText}`);
      }

      ttsData = await response.json();
      const MP3 = base64.toByteArray(ttsData.audioContent);
      await fsPromises.writeFile(localPath, MP3);
      break; // generation succeeded
    } catch (err: any) {
      generateAttempts++;
      if (generateAttempts >= FLASHCARD_MAX_RETRIES) {
        throw new Error(
          `TTS generation failed after ${FLASHCARD_MAX_RETRIES} attempts: ${err?.message ?? err}`,
        );
      }
      const delay = Math.pow(2, generateAttempts) * FLASHCARD_RETRY_DELAY_BASE;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // ── Phase 2: Upload from saved file (retry without re-generating) ──
  let uploadSuccess = true;
  let uploadError: string | undefined;
  let uploadAttempts = 0;

  while (uploadAttempts < FLASHCARD_MAX_RETRIES) {
    try {
      await uploadToBucket(localPath, cloudPath);
      break; // upload succeeded
    } catch (err: any) {
      uploadAttempts++;
      if (uploadAttempts >= FLASHCARD_MAX_RETRIES) {
        uploadSuccess = false;
        uploadError = err?.message ?? String(err);
      } else {
        const delay = Math.pow(2, uploadAttempts) * FLASHCARD_RETRY_DELAY_BASE;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Always clean up temp file after upload phase
  await fsPromises.unlink(localPath).catch(() => {});

  return {
    timePoints: ttsData?.timepoints ?? [],
    audioContent: ttsData?.audioContent ?? "",
    uploadSuccess,
    uploadError,
  };
}

export async function generateAudioForFlashcard({
  sentences,
  words,
  contentId,
  job,
}: GenerateAudioParams): Promise<{
  sentenceUploadSuccess: boolean;
  sentenceUploadError?: string;
  wordUploadSuccess: boolean;
  wordUploadError?: string;
}> {
  const voice =
    AVAILABLE_VOICES[Math.floor(Math.random() * AVAILABLE_VOICES.length)];
  const urlPath = job === "article" ? "audios" : "audios/story";

  const sentenceTexts = Array.isArray(sentences)
    ? sentences.map((item: any) => item?.sentence as string)
    : [];
  const wordTexts = Array.isArray(words)
    ? words.map((item: any) => item?.vocabulary as string)
    : [];

  let sentenceTimePoints: SentencesResponse[] = [];
  let sentenceUploadSuccess = true;
  let sentenceUploadError: string | undefined;

  let wordTimePoints: WordsResponse[] = [];
  let wordUploadSuccess = true;
  let wordUploadError: string | undefined;

  // ── Sentences ──
  if (sentenceTexts.length > 0) {
    const sentencesDir = path.join(process.cwd(), "data/audios/sentences");
    if (!fs.existsSync(sentencesDir)) {
      fs.mkdirSync(sentencesDir, { recursive: true });
    }

    const result = await synthesizeAndUpload({
      texts: sentenceTexts,
      localPath: path.join(sentencesDir, `${contentId}.mp3`),
      cloudPath: `${urlPath}/sentences/${contentId}.mp3`,
      voice,
    });

    sentenceUploadSuccess = result.uploadSuccess;
    sentenceUploadError = result.uploadError;

    sentenceTimePoints = sentences.map((sentence, index) => ({
      sentence: sentence.sentence,
      translation: sentence.translation,
      timeSeconds: result.timePoints[index]?.timeSeconds,
    }));
  }

  // ── Words ──
  if (wordTexts.length > 0) {
    const wordsDir = path.join(process.cwd(), "data/audios/words");
    if (!fs.existsSync(wordsDir)) {
      fs.mkdirSync(wordsDir, { recursive: true });
    }

    const result = await synthesizeAndUpload({
      texts: wordTexts,
      localPath: path.join(wordsDir, `${contentId}.mp3`),
      cloudPath: `${urlPath}/words/${contentId}.mp3`,
      voice,
    });

    wordUploadSuccess = result.uploadSuccess;
    wordUploadError = result.uploadError;

    wordTimePoints = words.map((word, index) => ({
      vocabulary: word.vocabulary,
      definition: word.definition,
      timeSeconds: result.timePoints[index]?.timeSeconds,
    }));
  }

  // ── Update DB — use null for URL if upload failed ──
  await prisma.sentencsAndWordsForFlashcard.updateMany({
    where: {
      articleId: job === "article" ? contentId : undefined,
      storyChapterId: job === "story" ? contentId : undefined,
    },
    data: {
      sentence:
        sentenceTimePoints.length > 0
          ? JSON.parse(JSON.stringify(sentenceTimePoints))
          : null,
      audioSentencesUrl: sentenceUploadSuccess && sentenceTimePoints.length > 0
        ? `${urlPath}/sentences/${contentId}.mp3`
        : null,
      words:
        wordTimePoints.length > 0
          ? JSON.parse(JSON.stringify(wordTimePoints))
          : null,
      wordsUrl: wordUploadSuccess && wordTimePoints.length > 0
        ? `${urlPath}/words/${contentId}.mp3`
        : null,
    },
  });

  return {
    sentenceUploadSuccess,
    sentenceUploadError,
    wordUploadSuccess,
    wordUploadError,
  };
}

//   export async function generateChapterAudioForWord({
//     wordList,
//     storyId,
//     chapterNumber,
//   }: GenerateChapterAudioParams): Promise<void> {
//     {
//       try {
//         const voice =
//           AVAILABLE_VOICES[Math.floor(Math.random() * AVAILABLE_VOICES.length)];

//         const vocabulary: string[] = Array.isArray(wordList)
//           ? wordList.map((item: any) => item?.vocabulary)
//           : [];

//         let allTimePoints: TimePoint[] = [];

//         const response = await fetch(
//           `${BASE_TEXT_TO_SPEECH_URL}/v1beta1/text:synthesize?key=${process.env.GOOGLE_TEXT_TO_SPEECH_API_KEY}`,
//           {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//             },
//             body: JSON.stringify({
//               input: { ssml: contentToSSML(vocabulary) },
//               voice: {
//                 languageCode: "en-US",
//                 name: voice,
//               },
//               audioConfig: {
//                 audioEncoding: "MP3",
//               },
//               enableTimePointing: ["SSML_MARK"],
//             }),
//           }
//         );

//         if (!response.ok) {
//           throw new Error(`Error: ${response.statusText}`);
//         }

//         const data = await response.json();
//         const audio = data.audioContent;
//         allTimePoints = data?.timepoints;
//         const MP3 = base64.toByteArray(audio);

//         const localPath = `${process.cwd()}/data/audios-words/${storyId}-${chapterNumber}.mp3`;
//         fs.writeFileSync(localPath, MP3);

//         await uploadToBucket(
//           localPath,
//           `${AUDIO_WORDS_URL}/${storyId}-${chapterNumber}.mp3`
//         );

//         await db
//           .collection("stories-word-list")
//           .doc(`${storyId}-${chapterNumber}`)
//           .update({
//             timepoints: allTimePoints,
//             id: storyId,
//             chapterNumber: chapterNumber,
//           });
//       } catch (error: any) {
//         throw `failed to generate audio: ${error} \n\n error: ${JSON.stringify(
//           error.response.data
//         )}`;
//       }
//     }
//   }

//   export async function saveWordList({
//     wordList,
//     storyId,
//     chapterNumber,
//   }: GenerateChapterAudioParams): Promise<void> {
//     {
//       try {
//         const wordListRef = db
//           .collection("stories-word-list")
//           .doc(`${storyId}-${chapterNumber}`);
//         await wordListRef.set({
//           word_list: wordList,
//         });
//       } catch (error: any) {
//         throw `failed to save word list: ${error} \n\n error: ${JSON.stringify(
//           error.response.data
//         )}`;
//       }
//     }
//   }
