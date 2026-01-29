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

export const generateStoryContentController = async (amountPerGen: number) => {
  try {
    const CEFRLevels = [
      ArticleBaseCefrLevel.A0,
      ArticleBaseCefrLevel.A1,
      ArticleBaseCefrLevel.A2,
      ArticleBaseCefrLevel.B1,
      ArticleBaseCefrLevel.B2,
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
                savedStory.storyId,
              );

              // 2. เตรียม Promise สำหรับทำ Audio ทุกบท (ใช้ .map จะไวกว่า for loop)
              const audioPromises = savedStory.chapters.map((chapter) => {
                generateChapterAudio({
                  passage: chapter.passage,
                  sentences: chapter.sentences as string[],
                  storyId: savedStory.storyId,
                  chapterNumber: chapter.chapterNumber,
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
