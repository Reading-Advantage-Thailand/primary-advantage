import { ArticleBaseCefrLevel, ArticleType } from "@/types/enum";
import {
  generateStoryTopic,
  generateStoryContent,
  evaluateStoryContent,
  generateStotyImage,
} from "../utils/genaretors/story-generator";
import {
  saveStoryToDB,
  getStoriesModel,
  getStoriesGenresModel,
  getStoryByIdModel,
  getChapterByNumberModel,
  deleteStoryByIdModel,
  getExportStoryWorkbookModel,
} from "../models/storieModel";
import { NextRequest } from "next/server";
import { AuthenticatedUser } from "../utils/middleware";
import {
  StoryFilters,
  StoryListResponse,
  RaLevelRange,
  StoryDetail,
  StoryChapterDetail,
} from "@/types/story";
import { generateChapterAudio } from "../utils/genaretors/audio-generator";
import {
  generateAudioForFlashcard,
  sentenceTranslation,
  wordTranslation,
} from "../utils/genaretors/audio-flashcard-generator";
import { WorkbookJSON } from "@/utils/workbook-data-mapper";

export const generateStoryContentController = async (amountPerGen: number) => {
  try {
    const CEFRLevels = [
      ArticleBaseCefrLevel.A0,
      // ArticleBaseCefrLevel.A1,
      // ArticleBaseCefrLevel.A2,
      // ArticleBaseCefrLevel.B1,
      // ArticleBaseCefrLevel.B2,
    ];

    const genres = [
      "Children's Relationship",
      "Children's Sci-Fi",
      "Children's Mystery",
      "Children's Adventure",
      "Children's Fantasy",
      "Children's Realistic Fiction",
      "Children's Animal Stories",
      "Children's Sports",
      "Children's Friendship",
      "Children's Family",
      "Children's Humor",
    ];

    const totalArticles = CEFRLevels.length * amountPerGen;
    let completedStory = 0;
    let result;
    let attempt = 0;
    const MAX_RETRY_ATTEMPTS = 3;
    const MIN_RATING = 2;

    for (let i = 0; i < amountPerGen; i++) {
      for (const level of CEFRLevels) {
        try {
          const genre = genres[Math.floor(Math.random() * genres.length)];

          const topic = await generateStoryTopic(genre, 10);

          while (attempt < MAX_RETRY_ATTEMPTS) {
            try {
              result = await generateStoryContent({
                cefrLevel: level,
                genre,
                topic:
                  topic.topics![
                    Math.floor(Math.random() * topic.topics!.length)
                  ],
              });

              //Process evaluation of story
              const evaluationData = result.chapters.map(
                (chapter) => chapter.passage,
              );

              const evaluation = await evaluateStoryContent(
                evaluationData,
                level,
              );

              if (evaluation.rating < MIN_RATING) {
                throw new Error("Story rating below minimum threshold");
              }

              const savedStory = await saveStoryToDB(
                result,
                genre,
                evaluation.cefrLevel,
                evaluation.rating,
              );

              console.log(
                `Save Story Completed CefrLevel: ${evaluation.cefrLevel}`,
              );

              // 1. สั่งทำรูป (เก็บ Promise ไว้ก่อน)
              const imagePromise = generateStotyImage(
                savedStory.character,
                savedStory.imagesDesc,
              );

              // 2. เตรียม Promise สำหรับทำ Audio ทุกบท (ใช้ .map จะไวกว่า for loop)
              const audioPromises = savedStory.chapters.map((chapter) => {
                generateChapterAudio({
                  passage: chapter.passage,
                  sentences: chapter.sentences as string[],
                  chapterId: chapter.id,
                  chapterNumber: chapter.chapterNumber,
                  cefrLevel: level,
                }),
                  generateAudioForFlashcard({
                    sentences: chapter.sentencsAndWordsForFlashcards
                      .sentence as sentenceTranslation[],
                    words: chapter.sentencsAndWordsForFlashcards
                      .words as wordTranslation[],
                    contentId: chapter.id,
                    job: "story",
                  });
              });

              // 3. สั่งรอทุกอย่าง (รูป + เสียงทุกบท) ให้เสร็จพร้อมกัน
              // results[0] คือผลลัพธ์รูป, ที่เหลือคือผลลัพธ์เสียง
              const results = await Promise.all([
                imagePromise,
                ...audioPromises,
              ]);

              break; // Exit retry loop on success
            } catch (error) {
              console.error(`Retry attempt ${attempt + 1} failed:`, error);
              attempt++;
              if (attempt >= MAX_RETRY_ATTEMPTS) {
                throw new Error("Max retry attempts reached");
              }
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }

          completedStory++;
          console.log(
            `Progress: ${completedStory}/${totalArticles} articles generated (Level: ${level})`,
          );
        } catch (error: any) {
          console.error(`Failed to generate article (Level: ${level}):`, error);
          throw new Error(`Failed to generate article: ${error.message}`);
        }
      }
    }
  } catch (error) {
    console.error("Error in generateStoryContentController:", error);
  }
};

export const fetchStorieSelectionController = async () => {
  try {
    // Placeholder for fetching storie selection logic
  } catch (error) {
    console.error("Error in fetchStorieSelectionController:", error);
    throw error;
  }
};

/**
 * Controller for fetching paginated stories with filtering
 * Handles query parameter parsing and applies raLevel restrictions for students
 */
export const getStoriesController = async (
  req: NextRequest,
  user: AuthenticatedUser,
): Promise<StoryListResponse> => {
  try {
    const searchParams = req.nextUrl.searchParams;

    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10)),
    );
    const sortBy =
      (searchParams.get("sortBy") as
        | "createdAt"
        | "title"
        | "rating"
        | "raLevel") || "createdAt";
    const sortOrder =
      (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

    // Build filters from query params
    const filters: StoryFilters = {};

    const search = searchParams.get("search");
    if (search) filters.search = search;

    const genre = searchParams.get("genre");
    if (genre) filters.genre = genre;

    const cefrLevel = searchParams.get("cefrLevel");
    if (cefrLevel) filters.cefrLevel = cefrLevel;

    const raLevel = searchParams.get("raLevel");
    if (raLevel) filters.raLevel = parseInt(raLevel, 10);

    const type = searchParams.get("type");
    if (type) filters.type = type;

    const isPublished = searchParams.get("isPublished");
    if (isPublished !== null) {
      filters.isPublished = isPublished === "true";
    }

    // Apply raLevel restriction for students (±1 from their level)
    let raLevelRange: RaLevelRange | undefined;

    if (user.role === "student") {
      // Get student's level - use the level from user profile
      const studentLevel = user.level ?? 1;

      raLevelRange = {
        minRaLevel: Math.max(1, studentLevel - 1),
        maxRaLevel: studentLevel + 1,
      };

      // For students, only show published stories
      filters.isPublished = true;
    }

    // Call model to get stories
    const result = await getStoriesModel(
      filters,
      page,
      limit,
      sortBy,
      sortOrder,
      raLevelRange,
    );

    return result;
  } catch (error) {
    console.error("Error in getStoriesController:", error);
    throw error;
  }
};

/**
 * Controller for fetching available genres
 */
export const getStoriesGenresController = async (): Promise<string[]> => {
  try {
    return await getStoriesGenresModel();
  } catch (error) {
    console.error("Error in getStoriesGenresController:", error);
    throw error;
  }
};

/**
 * Controller for fetching a single story by ID
 */
export const getStoryByIdController = async (
  storyId: string,
  user: AuthenticatedUser,
): Promise<StoryDetail | null> => {
  try {
    // Apply raLevel restriction for students
    let raLevelRange: RaLevelRange | undefined;

    if (user.role === "student") {
      const studentLevel = user.level ?? 1;
      raLevelRange = {
        minRaLevel: Math.max(1, studentLevel - 1),
        maxRaLevel: studentLevel + 1,
      };
    }

    const story = await getStoryByIdModel(storyId, raLevelRange);
    return story;
  } catch (error) {
    console.error("Error in getStoryByIdController:", error);
    throw error;
  }
};

/**
 * Controller for fetching a chapter by story ID and chapter number
 */
export const getChapterByNumberController = async (
  storyId: string,
  chapterNumber: number,
  user: AuthenticatedUser,
): Promise<StoryChapterDetail | null> => {
  try {
    const chapter = await getChapterByNumberModel(storyId, chapterNumber, user);
    return chapter;
  } catch (error) {
    console.error("Error in getChapterByNumberController:", error);
    throw error;
  }
};

export const deleteStoryByIdController = async (
  storyId: string,
): Promise<void> => {
  try {
    // Placeholder for delete story logic
    await deleteStoryByIdModel(storyId);
  } catch (error) {
    console.error("Error in deleteStoryByIdController:", error);
    throw error;
  }
};

export const getExportStoryWorkbookController = async (storyId: string) => {
  try {
    const storyData = await getExportStoryWorkbookModel(storyId);

    if (!storyData) {
      throw new Error("No workbook data found for the given story ID");
    }

    const workbookData: WorkbookJSON[] = [];

    // 2. Extract Vocabulary from Article Words (limit to 5)

    for (let i = 0; i < storyData.length; i++) {
      let vocab: WorkbookJSON["vocabulary"] = [];

      const firstFlashcard = storyData[i].sentencsAndWordsForFlashcards?.[0];

      if (Array.isArray(firstFlashcard?.words)) {
        vocab = (firstFlashcard.words as any[]).map((w: any) => ({
          word: w.vocabulary || "",
          phonetic: "",
          definition: w.definition?.en || w.definition || "",
        }));
      }
      // // 3. Check if translatedPassage exists, if not, call translate function
      let translatedSentences = storyData[i].translatedSentences;
      // // 4. Parse translatedPassage to align EN and TH arrays
      let enSentences: string[] = [];
      let thSentences: string[] = [];
      if (
        translatedSentences &&
        typeof translatedSentences === "object" &&
        !Array.isArray(translatedSentences)
      ) {
        const translations = translatedSentences as Record<string, string[]>;

        if (Array.isArray(storyData[i]?.sentences)) {
          enSentences = (storyData[i].sentences as any[]).map(
            (s: any) => s.sentence,
          );
        }

        const targetLang = ["th", "cn", "vi", "tw"].find(
          (lang) => translations[lang] && translations[lang].length > 0,
        );

        if (targetLang && translations[targetLang]) {
          thSentences = translations[targetLang];
        }
      }
      // // 5. Create article_paragraphs by grouping sentences
      // // Group every 3-5 sentences into a paragraph
      const paragraphs: { number: number; text: string }[] = [];
      const sentencesPerParagraph = Math.ceil(enSentences.length / 3); // Aim for ~3 paragraphs
      for (let i = 0; i < enSentences.length; i += sentencesPerParagraph) {
        const paragraphSentences = enSentences.slice(
          i,
          i + sentencesPerParagraph,
        );
        paragraphs.push({
          number: paragraphs.length + 1,
          text: paragraphSentences.join(" "),
        });
      }
      // // If no translated sentences, fallback to splitting passage by \n\n
      if (paragraphs.length === 0 && storyData[i].passage) {
        const fallbackParagraphs = (storyData[i].passage as string).split(
          "\n\n",
        );
        fallbackParagraphs.forEach((p: string, i: number) => {
          paragraphs.push({
            number: i + 1,
            text: p,
          });
        });
      }
      // // 6. Create translation_paragraphs aligned with article_paragraphs
      const translationParagraphs: { label: string; text: string }[] = [];
      for (let i = 0; i < paragraphs.length; i++) {
        const startIdx = i * sentencesPerParagraph;
        const endIdx = Math.min(
          startIdx + sentencesPerParagraph,
          thSentences.length,
        );
        const translatedSentences = thSentences.slice(startIdx, endIdx);
        translationParagraphs.push({
          label: `Paragraph ${i + 1}`,
          text: translatedSentences.join(" "),
        });
      }
      // // 7. Get 4 comprehension questions (limit to first 4 MCQs)
      const compQuestions = storyData[i].multipleChoiceQuestions
        .slice(0, 4)
        .map((q: any, i: number) => ({
          number: i + 1,
          question: q.question,
          options: q.options,
        }));
      // // 8. Get MC answers (from first 4 questions)
      const mcAnswers = storyData[i].multipleChoiceQuestions
        .slice(0, 4)
        .map((q: any, i: number) => {
          const answerIndex = q.options.findIndex(
            (opt: string) =>
              opt.toLowerCase().includes(q.answer.toLowerCase()) ||
              q.answer.toLowerCase().includes(opt.toLowerCase()),
          );
          const letter = String.fromCharCode(97 + Math.max(0, answerIndex)); // a, b, c, d
          return {
            number: i + 1,
            letter: letter,
            text: q.answer,
          };
        });
      // // 9. Get 1 short answer question with sentence starters
      let shortAnswerQuestion = "";
      let sentenceStarters: string[] = [
        "I think...",
        "The article says...",
        "In my opinion...",
      ];
      if (storyData[i].shortAnswerQuestions.length > 0) {
        // Find a valid question (not just a single letter)
        const validSAQ = storyData[i].shortAnswerQuestions.find(
          (q: any) => q.question.length > 5 && q.question.includes(" "),
        );
        if (validSAQ) {
          shortAnswerQuestion = validSAQ.question;
          // Extract first 2 words from answer for sentence starters
          const answerWords = validSAQ.answer.trim().split(/\s+/);
          if (answerWords.length >= 2) {
            const starter = `${answerWords[0]} ${answerWords[1]}...`;
            sentenceStarters = [starter, "I think...", "The article says..."];
          }
        } else {
          // Fallback: use first question even if it's short
          shortAnswerQuestion = storyData[i].shortAnswerQuestions[0].question;
        }
      }
      // 10. Create vocab_match (shuffled definitions)
      const vocabMatch = vocab.map((v, i) => ({
        number: i + 1,
        word: v.word,
        letter: String.fromCharCode(97 + i), // a, b, c, d, e
        definition: v.definition,
      }));
      // Shuffle definitions for the matching game
      const shuffledDefinitions = [...vocab.map((v) => v.definition)];
      for (let i = shuffledDefinitions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledDefinitions[i], shuffledDefinitions[j]] = [
          shuffledDefinitions[j],
          shuffledDefinitions[i],
        ];
      }
      const vocabMatchShuffled = vocabMatch.map((vm, i) => ({
        ...vm,
        definition: shuffledDefinitions[i],
      }));
      // Create answer string for vocab_match
      const vocabMatchAnswerString = vocabMatch
        .map((vm) => {
          const correctLetter = String.fromCharCode(
            97 + shuffledDefinitions.indexOf(vm.definition),
          );
          return `${vm.number}-${correctLetter}`;
        })
        .join(", ");
      // 11. Create vocab_fill (fill in the blank sentences)
      // Create contextual sentences using the vocabulary words
      const vocabFill = vocab.slice(0, 4).map((v, i) => {
        // Find sentences in the article that contain this word
        const allSentences = enSentences
          .join(" ")
          .split(/[.!?]+/)
          .filter((s) => s.trim());
        const sentenceWithWord = allSentences.find((s) =>
          s.toLowerCase().includes(v.word.toLowerCase()),
        );
        let sentence = "";
        if (sentenceWithWord) {
          // Replace the word with a blank
          sentence =
            sentenceWithWord
              .trim()
              .replace(
                new RegExp(`\\b${v.word}\\b`, "i"),
                '<span class="blank"></span>',
              ) + ".";
        } else {
          // Fallback: create a generic sentence
          sentence = `A ${v.word} is <span class="blank"></span>.`;
        }
        return {
          number: i + 1,
          sentence: sentence,
        };
      });
      const vocabFillAnswerString = vocab
        .slice(0, 4)
        .map((v, i) => `${i + 1}. ${v.word}`)
        .join(", ");
      // 12. Create sentence_order_questions (from first 2 paragraphs)
      const sentenceOrderQuestions = paragraphs.slice(0, 2).map((p) => {
        const sentences = p.text.split(/[.!?]+/).filter((s) => s.trim());
        const firstSentence = sentences[0] || p.text;
        const words = firstSentence.trim().split(/\s+/);
        // Take complete sentence (up to 10 words for simplicity)
        const sentenceWords = words.slice(0, Math.min(10, words.length));
        // Shuffle the words
        const shuffled = [...sentenceWords];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return { words: shuffled };
      });
      const sentenceOrderAnswers = paragraphs.slice(0, 2).map((p, i) => {
        const sentences = p.text.split(/[.!?]+/).filter((s) => s.trim());
        const firstSentence = sentences[0] || p.text;
        const words = firstSentence.trim().split(/\s+/);
        const sentenceWords = words.slice(0, Math.min(10, words.length));
        return {
          number: i + 1,
          sentence: sentenceWords.join(" ") + ".",
        };
      });
      // 13. Create sentence_completion_prompts (use different sentences from each paragraph)
      const sentenceCompletionPrompts = paragraphs.slice(0, 3).map((p, i) => {
        const sentences = p.text.split(/[.!?]+/).filter((s) => s.trim());
        // Use different sentence for each paragraph (i-th sentence if available)
        const targetSentence =
          sentences[Math.min(i, sentences.length - 1)] || sentences[0] || "";
        const words = targetSentence.trim().split(/\s+/);
        // Cut at roughly half the sentence length (minimum 3 words, maximum 8 words)
        const cutPoint = Math.max(3, Math.min(8, Math.floor(words.length / 2)));
        const prompt = words.slice(0, cutPoint).join(" ");
        return {
          number: i + 1,
          prompt: prompt,
        };
      });
      // 14. Get writing prompt (validate it's a real question)
      let writingPrompt = "Write about what you learned from this article.";
      if (storyData[i].longAnswerQuestions.length > 0) {
        // Find a valid question (not just a single letter)
        const validLAQ = storyData[i].longAnswerQuestions.find(
          (q: any) => q.question.length > 5 && q.question.includes(" "),
        );
        if (validLAQ) {
          writingPrompt = validLAQ.question;
        } else {
          // Fallback: use first question even if it's short
          const firstQuestion = storyData[i].longAnswerQuestions[0].question;
          if (firstQuestion.length > 1) {
            writingPrompt = firstQuestion;
          }
        }
      }

      // 15. Build Workbook JSON
      workbookData.push({
        lesson_number: `Chapter ${storyData[i].chapterNumber}`,
        lesson_title: storyData[i].title || "",
        level_name: `Level ${storyData[i].story.raLevel || 0}`,
        cefr_level: `CEFR ${storyData[i].story.cefrLevel || ""}`,
        article_type: storyData[i].story.type || "",
        genre: storyData[i].story.genre || "",
        vocabulary: vocab,
        article_image_url: `https://storage.googleapis.com/primary-app-storage/images/story/${storyData[i].id}.png`,
        article_caption: storyData[i].summary || "Article Illustration",
        article_url: `https://primary.reading-advantage.com/student/stories/${storyData[i].story.id}/${storyData[i].chapterNumber}`,
        article_paragraphs: paragraphs,
        comprehension_questions: compQuestions,
        short_answer_question: shortAnswerQuestion,
        sentence_starters: sentenceStarters,
        vocab_match: vocabMatchShuffled,
        vocab_fill: vocabFill,
        vocab_word_bank: vocab.map((v) => v.word),
        sentence_order_questions: sentenceOrderQuestions,
        sentence_completion_prompts: sentenceCompletionPrompts,
        writing_prompt: writingPrompt,
        mc_answers: mcAnswers,
        vocab_match_answer_string: vocabMatchAnswerString,
        vocab_fill_answer_string: vocabFillAnswerString,
        sentence_order_answers: sentenceOrderAnswers,
        translation_paragraphs: translationParagraphs,
      });
    }

    return workbookData;
  } catch (error) {
    throw new Error("Failed to generate export workbook");
  }
};
