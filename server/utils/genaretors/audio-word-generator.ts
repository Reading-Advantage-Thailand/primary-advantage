import { prisma } from "@/lib/prisma";
import {
  AUDIO_WORDS_URL,
  AVAILABLE_VOICES,
  BASE_TEXT_TO_SPEECH_URL,
} from "../constants";
import base64 from "base64-js";
import fs from "fs";
import path from "path";

export type WordListResponse = {
  vocabulary: string;
  definition: {
    en: string;
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
};

export type GenerateAudioParams = {
  wordList: WordListResponse[];
  articleId: string;
};

export type GenerateChapterAudioParams = {
  wordList: WordListResponse[];
  storyId: string;
  chapterNumber: string;
};

interface TimePoint {
  timeSeconds: number;
  markName: string;
}

function contentToSSML(content: string[]): string {
  let ssml = "<speak>";
  content.forEach((sentence, i) => {
    ssml += `<s><mark name='word${
      i + 1
    }'/>${sentence}<break time="500ms"/></s>`;
  });
  ssml += "</speak>";
  return ssml;
}

export async function generateAudioForWord({
  wordList,
  articleId,
}: GenerateAudioParams): Promise<TimePoint[]> {
  {
    try {
      const voice =
        AVAILABLE_VOICES[Math.floor(Math.random() * AVAILABLE_VOICES.length)];

      const vocabulary: string[] = Array.isArray(wordList)
        ? wordList.map((item: any) => item?.vocabulary)
        : [];

      let allTimePoints: TimePoint[] = [];

      const response = await fetch(
        `${BASE_TEXT_TO_SPEECH_URL}/v1beta1/text:synthesize?key=${process.env.GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: { ssml: contentToSSML(vocabulary) },
            voice: {
              languageCode: "en-US",
              name: voice,
            },
            audioConfig: {
              audioEncoding: "MP3",
            },
            enableTimePointing: ["SSML_MARK"],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      const audio = data.audioContent;
      allTimePoints = data?.timepoints;
      const MP3 = base64.toByteArray(audio);

      const localPath = path.join(
        process.cwd(),
        "data/audios/words",
        `${articleId}.mp3`
      );
      fs.writeFileSync(localPath, MP3);

      //   await uploadToBucket(localPath, `${AUDIO_WORDS_URL}/${articleId}.mp3`);

      //   await db.collection("word-list").doc(articleId).update({
      //     timepoints: allTimePoints,
      //     id: articleId,
      //   });

      await prisma.wordList.update({
        where: {
          articleId: articleId,
        },
        data: {
          timepoints: JSON.parse(JSON.stringify(allTimePoints)),
        },
      });
      return allTimePoints;
    } catch (error: any) {
      throw `failed to generate audio: ${error} \n\n error: ${JSON.stringify(
        error.response.data
      )}`;
    }
  }
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
