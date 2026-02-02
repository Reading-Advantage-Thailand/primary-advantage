import { prisma } from "@/lib/prisma";
import { GenerateStoryResponse } from "../utils/genaretors/story-generator";
import { cleanGenre, convertCefrLevel, getRandomItems } from "@/lib/utils";
import {
  StoryFilters,
  StoryListItem,
  StoryListResponse,
  RaLevelRange,
  StoryDetail,
  StoryCharacter,
  StoryChapterDetail,
  ChapterFlashcards,
  SentenceFlashcard,
  WordFlashcard,
  ChapterActivityStatus,
} from "@/types/story";
import { ActivityType, Prisma } from "@prisma/client";
import { AuthenticatedUser } from "../utils/middleware";
import { deleteStoryFiles } from "@/utils/storage";

export const saveStoryToDB = async (
  story: GenerateStoryResponse,
  genre: string,
  cefrLevel: string,
  rating: number,
) => {
  try {
    // Placeholder logic for story content generation
    const newStory = await prisma.story.create({
      data: {
        topic: story.topic,
        title: story.title,
        genre: cleanGenre(genre),
        summary: story.summary,
        translatedSummary: story.translatedSummary,
        raLevel: convertCefrLevel(cefrLevel),
        imageDescription: story.imageDesc,
        cefrLevel: cefrLevel,
        rating: rating,
        characters: story.characters,
        storyChapters: {
          create: story.chapters.map((chapter, index) => ({
            title: chapter.title,
            imageDescription: chapter.imageDesc,
            summary: chapter.summary,
            translatedSummary: chapter.translatedSummary,
            passage: chapter.passage,
            sentences: chapter.sentences,
            chapterNumber: chapter.chapterNumber,
            multipleChoiceQuestions: {
              create: chapter.multipleChoiceQuestions.map((mcq) => ({
                question: mcq.question,
                options: mcq.options,
                answer: mcq.answer,
              })),
            },
            shortAnswerQuestions: {
              create: chapter.shortAnswerQuestions.map((saq) => ({
                question: saq.question,
                answer: saq.answer,
              })),
            },
            longAnswerQuestions: {
              create: chapter.longAnswerQuestions.map((laq) => ({
                question: laq.question,
              })),
            },
            sentencsAndWordsForFlashcards: {
              create: {
                sentence: chapter.sentencesFlashcard,
                words: chapter.wordlist,
              },
            },
          })),
        },
      },
      include: {
        storyChapters: {
          include: {
            sentencsAndWordsForFlashcards: true,
          },
          orderBy: {
            chapterNumber: "asc",
          },
        },
      },
    });

    // Build imagesDesc array: first is main story, rest are chapters
    const imagesDesc = [
      {
        id: newStory.id,
        description: newStory.imageDescription,
      },
      ...newStory.storyChapters.map((chapter) => ({
        id: chapter.id,
        description: chapter.imageDescription,
      })),
    ];

    // Build chapters data
    const chapters = newStory.storyChapters.map((chapter) => ({
      id: chapter.id,
      passage: chapter.passage,
      sentences: chapter.sentences,
      chapterNumber: chapter.chapterNumber,
      sentencsAndWordsForFlashcards: chapter.sentencsAndWordsForFlashcards[0],
    }));

    return {
      character: story.characters,
      imagesDesc,
      storyId: newStory.id,
      chapters,
    };
  } catch (error) {
    console.error("Error generating story content:", error);
    throw error;
  }
};

export const getStorieSelectionModel = async () => {
  try {
    // Placeholder for fetching storie selection logic
  } catch (error) {
    console.error("Error in getStorieSelection:", error);
    throw error;
  }
};

/**
 * Get paginated stories with filtering and search
 * @param filters - Filter options (search, genre, cefrLevel, raLevel, type, isPublished)
 * @param page - Page number (1-indexed)
 * @param limit - Number of stories per page
 * @param sortBy - Field to sort by
 * @param sortOrder - Sort direction (asc/desc)
 * @param raLevelRange - Optional raLevel restriction for students
 */
export const getStoriesModel = async (
  filters: StoryFilters = {},
  page: number = 1,
  limit: number = 10,
  sortBy: "createdAt" | "title" | "rating" | "raLevel" = "createdAt",
  sortOrder: "asc" | "desc" = "desc",
  raLevelRange?: RaLevelRange,
): Promise<StoryListResponse> => {
  try {
    // Build where clause
    const where: Prisma.StoryWhereInput = {};

    // Search filter (title or topic)
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { topic: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Genre filter
    if (filters.genre) {
      where.genre = { equals: filters.genre, mode: "insensitive" };
    }

    // CEFR Level filter
    if (filters.cefrLevel) {
      where.cefrLevel = filters.cefrLevel;
    }

    // RA Level filter (exact match if provided in filters)
    if (filters.raLevel !== undefined) {
      where.raLevel = filters.raLevel;
    }

    // Type filter
    if (filters.type) {
      where.type = filters.type;
    }

    // Published filter
    if (filters.isPublished !== undefined) {
      where.isPublished = filters.isPublished;
    }

    // Student raLevel restriction (±1 from student's level)
    if (raLevelRange) {
      where.raLevel = {
        gte: raLevelRange.minRaLevel,
        lte: raLevelRange.maxRaLevel,
      };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build orderBy
    const orderBy: Prisma.StoryOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute queries in parallel
    const [stories, totalStories] = await Promise.all([
      prisma.story.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          title: true,
          topic: true,
          summary: true,
          translatedSummary: true,
          imageDescription: true,
          genre: true,
          subGenre: true,
          cefrLevel: true,
          raLevel: true,
          rating: true,
          isPublished: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              storyChapters: true,
            },
          },
        },
      }),
      prisma.story.count({ where }),
    ]);

    // Transform response
    const storyList: StoryListItem[] = stories.map((story) => ({
      id: story.id,
      title: story.title,
      topic: story.topic,
      summary: story.summary,
      translatedSummary: story.translatedSummary as Record<
        string,
        string
      > | null,
      imageDescription: story.imageDescription,
      genre: story.genre,
      subGenre: story.subGenre,
      cefrLevel: story.cefrLevel,
      raLevel: story.raLevel,
      rating: story.rating,
      isPublished: story.isPublished,
      createdAt: story.createdAt,
      updatedAt: story.updatedAt,
      chaptersCount: story._count.storyChapters,
    }));

    const totalPages = Math.ceil(totalStories / limit);

    return {
      stories: storyList,
      pagination: {
        page,
        limit,
        totalStories,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  } catch (error) {
    console.error("Error in getStoriesModel:", error);
    throw error;
  }
};

/**
 * Get available genres for filtering
 */
export const getStoriesGenresModel = async (): Promise<string[]> => {
  try {
    const genres = await prisma.story.findMany({
      where: {
        genre: { not: null },
        isPublished: true,
      },
      select: {
        genre: true,
      },
      distinct: ["genre"],
    });

    return genres
      .map((g) => g.genre)
      .filter((genre): genre is string => genre !== null);
  } catch (error) {
    console.error("Error in getStoriesGenresModel:", error);
    throw error;
  }
};

/**
 * Get a single story by ID with chapters
 */
export const getStoryByIdModel = async (
  storyId: string,
  raLevelRange?: RaLevelRange,
): Promise<StoryDetail | null> => {
  try {
    const where: Prisma.StoryWhereInput = {
      id: storyId,
    };

    // Apply raLevel restriction for students
    if (raLevelRange) {
      where.raLevel = {
        gte: raLevelRange.minRaLevel,
        lte: raLevelRange.maxRaLevel,
      };
    }

    const story = await prisma.story.findFirst({
      where,
      include: {
        storyChapters: {
          orderBy: { chapterNumber: "asc" },
          select: {
            id: true,
            chapterNumber: true,
            title: true,
            summary: true,
            translatedSummary: true,
            imageDescription: true,
          },
        },
      },
    });

    if (!story) {
      return null;
    }

    return {
      id: story.id,
      title: story.title,
      topic: story.topic,
      summary: story.summary,
      translatedSummary: story.translatedSummary as Record<
        string,
        string
      > | null,
      imageDescription: story.imageDescription,
      characters: story.characters as StoryCharacter[] | null,
      type: story.type,
      genre: story.genre,
      subGenre: story.subGenre,
      cefrLevel: story.cefrLevel,
      raLevel: story.raLevel,
      rating: story.rating,
      isPublished: story.isPublished,
      createdAt: story.createdAt,
      updatedAt: story.updatedAt,
      chapters: story.storyChapters.map((chapter) => ({
        id: chapter.id,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        summary: chapter.summary,
        translatedSummary: chapter.translatedSummary as Record<
          string,
          string
        > | null,
        imageDescription: chapter.imageDescription,
      })),
    };
  } catch (error) {
    console.error("Error in getStoryByIdModel:", error);
    throw error;
  }
};

/**
 * Get a chapter by story ID and chapter number
 */
export const getChapterByNumberModel = async (
  storyId: string,
  chapterNumber: number,
  user: AuthenticatedUser,
): Promise<StoryChapterDetail | null> => {
  try {
    // First check if the story exists and is accessible (raLevel check)
    const storyWhere: Prisma.StoryWhereInput = {
      id: storyId,
    };

    const story = await prisma.story.findFirst({
      where: storyWhere,
      select: {
        id: true,
        title: true,
        genre: true,
        cefrLevel: true,
        raLevel: true,
        _count: {
          select: {
            storyChapters: true,
          },
        },
      },
    });

    if (!story) {
      return null;
    }

    // Get the chapter with all related data
    const chapter = await prisma.storyChapter.findFirst({
      where: {
        storyId,
        chapterNumber,
      },
      include: {
        multipleChoiceQuestions: {
          select: {
            id: true,
            question: true,
            options: true,
            answer: true,
            textualEvidence: true,
            storyChapterId: true,
          },
        },
        shortAnswerQuestions: {
          select: {
            id: true,
            question: true,
            answer: true,
            storyChapterId: true,
          },
        },
        longAnswerQuestions: {
          select: {
            id: true,
            storyChapterId: true,
            question: true,
          },
        },
        sentencsAndWordsForFlashcards: {
          select: {
            sentence: true,
            audioSentencesUrl: true,
            words: true,
            wordsUrl: true,
          },
        },
      },
    });

    if (!chapter) {
      return null;
    }

    // Process flashcards
    let flashcards: ChapterFlashcards | null = null;
    if (chapter.sentencsAndWordsForFlashcards.length > 0) {
      const flashcardData = chapter.sentencsAndWordsForFlashcards[0];

      flashcards = {
        sentences: flashcardData.sentence as SentenceFlashcard[] | null,
        audioSentenceUrl: flashcardData.audioSentencesUrl || undefined,
        words: flashcardData.words as WordFlashcard[] | null,
        wordsUrl: flashcardData.wordsUrl || undefined,
      };
    }

    // Fetch user activity for this chapter
    const userActivities = await prisma.userActivity.findMany({
      where: {
        userId: user.id,
        targetId: chapter.id,
        activityType: {
          in: [
            ActivityType.STORIES_MC_QUESTION,
            ActivityType.STORIES_SA_QUESTION,
            ActivityType.STORIES_LA_QUESTION,
          ],
        },
      },
      select: {
        activityType: true,
        completed: true,
        details: true,
        timer: true,
      },
    });

    // Build activity status
    const mcActivity = userActivities.find(
      (a) => a.activityType === ActivityType.STORIES_MC_QUESTION,
    );
    const saActivity = userActivities.find(
      (a) => a.activityType === ActivityType.STORIES_SA_QUESTION,
    );
    const laActivity = userActivities.find(
      (a) => a.activityType === ActivityType.STORIES_LA_QUESTION,
    );

    // Extract SA details
    const saDetails = saActivity?.details as {
      score?: number;
      responses?: Array<{ answer?: string; feedback?: string }>;
    };
    const saResponse = saDetails?.responses?.[0];

    // Extract LA details
    const laDetails = laActivity?.details as {
      score?: number;
      responses?: Array<{ answer?: string; feedback?: any }>;
    };
    const laResponse = laDetails?.responses?.[0];

    const activity: ChapterActivityStatus = {
      isMultipleChoiceCompleted: mcActivity?.completed ?? false,
      isShortAnswerCompleted: saActivity?.completed ?? false,
      isLongAnswerCompleted: laActivity?.completed ?? false,
      mcScore: (mcActivity?.details as { score?: number })?.score ?? null,
      mcTimer: mcActivity?.timer ?? null,
      saScore: saDetails?.score ?? null,
      saTimer: saActivity?.timer ?? null,
      saFeedback: saResponse?.feedback ?? null,
      saAnswer: saResponse?.answer ?? null,
      laScore: laDetails?.score ?? null,
      laTimer: laActivity?.timer ?? null,
      laFeedback: laResponse?.feedback ?? null,
      laAnswer: laResponse?.answer ?? null,
    };

    return {
      id: chapter.id,
      storyId: chapter.storyId,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      summary: chapter.summary,
      translatedSummary: chapter.translatedSummary as Record<
        string,
        string
      > | null,
      imageDescription: chapter.imageDescription,
      passage: chapter.passage,
      sentences: chapter.sentences as unknown[] | null,
      translatedSentences: chapter.translatedSentences as unknown[] | null,
      audioSentencesUrl: chapter.audioSentencesUrl,
      createdAt: chapter.createdAt,
      updatedAt: chapter.updatedAt,
      multipleChoiceQuestions: getRandomItems(
        chapter.multipleChoiceQuestions,
        5,
      ),
      shortAnswerQuestions: getRandomItems(chapter.shortAnswerQuestions, 1),
      longAnswerQuestions: getRandomItems(chapter.longAnswerQuestions, 1),
      flashcards,
      story: {
        id: story.id,
        title: story.title,
        genre: story.genre,
        cefrLevel: story.cefrLevel,
        raLevel: story.raLevel,
        totalChapters: story._count.storyChapters,
      },
      activity,
    };
  } catch (error) {
    console.error("Error in getChapterByNumberModel:", error);
    throw error;
  }
};

export const deleteStoryByIdModel = async (storyId: string) => {
  try {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true, storyChapters: { select: { id: true } } },
    });

    if (!story) {
      throw new Error("Story not found");
    }

    const allIdsToDelete = [
      story.id,
      ...story.storyChapters.map((chapter) => chapter.id),
    ];

    const deleteResults = await Promise.all(
      allIdsToDelete.map((id) => deleteStoryFiles(id)),
    );

    if (deleteResults.some((res) => res.failed.length > 0)) {
      console.warn(
        "Some files failed to delete:",
        deleteResults.map((res) => res.failed).flat(),
      );
    }

    await prisma.story.delete({
      where: { id: storyId },
    });
  } catch (error) {
    console.error("Error in deleteStoryByIdModel:", error);
    throw error;
  }
};

export const getExportStoryWorkbookModel = async (storyId: string) => {
  try {
    // Placeholder for export story workbook logic
    const chapter = await prisma.storyChapter.findMany({
      where: { storyId },
      select: {
        id: true,
        chapterNumber: true,
        title: true,
        summary: true,
        passage: true,
        sentences: true,
        translatedSentences: true,
        multipleChoiceQuestions: true,
        shortAnswerQuestions: true,
        longAnswerQuestions: true,
        sentencsAndWordsForFlashcards: {
          select: {
            sentence: true,
            words: true,
          },
        },
        story: {
          select: {
            id: true,
            title: true,
            type: true,
            genre: true,
            cefrLevel: true,
            raLevel: true,
          },
        },
      },
      orderBy: { chapterNumber: "asc" },
    });

    return chapter;
  } catch (error) {
    console.error("Error in getExportStoryWorkbookModel:", error);
    throw error;
  }
};
