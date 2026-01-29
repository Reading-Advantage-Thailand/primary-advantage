// Story Types for API responses and query parameters

export interface StoryListItem {
  id: string;
  title: string;
  topic: string;
  summary: string;
  translatedSummary: Record<string, string> | null;
  imageDescription: string;
  genre: string | null;
  subGenre: string | null;
  cefrLevel: string | null;
  raLevel: number | null;
  rating: number | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  chaptersCount: number;
}

export interface StoryFilters {
  search?: string;
  genre?: string;
  cefrLevel?: string;
  raLevel?: number;
  type?: string;
  isPublished?: boolean;
}

export interface StoriesQueryParams extends StoryFilters {
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "title" | "rating" | "raLevel";
  sortOrder?: "asc" | "desc";
}

export interface StoryListResponse {
  stories: StoryListItem[];
  pagination: {
    page: number;
    limit: number;
    totalStories: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface StoriesApiError {
  error: string;
  message?: string;
}

// For student raLevel restriction
export interface RaLevelRange {
  minRaLevel: number;
  maxRaLevel: number;
}

// Story Detail Types
export interface StoryCharacter {
  name: string;
  description: string;
  background?: string;
}

export interface StoryChapterSummary {
  id: string;
  chapterNumber: number;
  title: string;
  summary: string;
  translatedSummary: Record<string, string> | null;
  imageDescription: string;
}

export interface StoryDetail {
  id: string;
  title: string;
  topic: string;
  summary: string;
  translatedSummary: Record<string, string> | null;
  imageDescription: string;
  characters: StoryCharacter[] | null;
  type: string | null;
  genre: string | null;
  subGenre: string | null;
  cefrLevel: string | null;
  raLevel: number | null;
  rating: number | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  chapters: StoryChapterSummary[];
}

export interface StoryDetailResponse {
  story: StoryDetail;
}

// Story Chapter Detail Types
export interface MultipleChoiceQuestion {
  id: string;
  question: string;
  options: string[];
  answer: string;
  textualEvidence: string | null;
  articleId?: string;
  storyChapterId?: string | null;
}

export interface ShortAnswerQuestion {
  id: string;
  question: string;
  answer: string;
  articleId?: string;
  storyChapterId?: string | null;
}

export interface LongAnswerQuestion {
  id: string;
  question: string;
  articleId?: string;
  storyChapterId?: string | null;
}

export interface SentenceFlashcard {
  sentence: string;
  translation?: Record<string, string> | null;
  timeSeconds?: number;
}

export interface WordFlashcard {
  vocabulary: string;
  definition?: Record<string, string> | null;
  timeSeconds?: number;
}

export interface ChapterFlashcards {
  sentences: SentenceFlashcard[] | null;
  audioSentenceUrl?: string;
  words: WordFlashcard[] | null;
  wordsUrl?: string;
}

export interface ChapterActivityStatus {
  isMultipleChoiceCompleted: boolean;
  isShortAnswerCompleted: boolean;
  isLongAnswerCompleted: boolean;
  mcScore?: number | null;
  mcTimer?: number | null;
  saScore?: number | null;
  saTimer?: number | null;
  saFeedback?: string | null;
  saAnswer?: string | null;
  laScore?: number | null;
  laTimer?: number | null;
  laFeedback?: any | null;
  laAnswer?: string | null;
}

export interface StoryChapterDetail {
  id: string;
  storyId: string;
  chapterNumber: number;
  title: string;
  summary: string;
  translatedSummary: Record<string, string> | null;
  imageDescription: string;
  passage: string;
  sentences: unknown[] | null;
  translatedSentences: unknown[] | null;
  audioSentencesUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  multipleChoiceQuestions: MultipleChoiceQuestion[];
  shortAnswerQuestions: ShortAnswerQuestion[];
  longAnswerQuestions: LongAnswerQuestion[];
  flashcards: ChapterFlashcards | null;
  story: {
    id: string;
    title: string;
    genre: string | null;
    cefrLevel: string | null;
    raLevel: number | null;
    totalChapters: number;
  };
  activity: ChapterActivityStatus;
}

export interface ChapterDetailResponse {
  chapter: StoryChapterDetail;
}
