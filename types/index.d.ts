import { Card as FSRSCard, State, Rating } from "ts-fsrs";

export type SiteConfig = {
  name: string;
  description: string;
  url: string;
  ogImage: string;
  link: {
    github: string;
  };
};

export type MainNavItem = {
  title: "home" | "about" | "contact" | "authors";
  href: string;
  disabled?: boolean;
  icon?: string;
};

export type PageConfig = {
  mainNav: MainNavItem[];
  sidebarNav?: sidebarNav[];
};

export type SidebarNavItem = {
  id?: string;
  title:
    | "read"
    | "stories"
    | "sentences"
    | "vocabulary"
    | "reports"
    | "history";
  disabled?: boolean;
  external?: boolean;
  icon?: string;
} & (
  | {
      href: string;
      items?: never;
    }
  | {
      href?: string;
      items: NavLink[];
    }
);

export interface ArticleShowcase {
  rating?: number;
  cefrLevel?: string;
  id: string;
  raLevel?: number;
  summary?: string;
  translatedSummary?: {
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  title: string;
  is_read?: boolean;
  is_completed?: boolean;
  is_approved?: boolean;
  type?: string;
  subGenre?: string;
  genre?: string;
  storyBible?: StoryBible;
}

export interface Article {
  summary: string;
  translatedSummary: {
    th: string;
    cn: string;
    tw: string;
    vi: string;
  } | null;
  translatedPassage: {
    th: string[];
    cn: string[];
    tw: string[];
    vi: string[];
  } | null;
  imageDescription: string;
  passage: string;
  createdAt: Date;
  rating: number;
  sentences?: SentenceTimepoint[];
  words?: WordListTimestamp[];
  type: string;
  title: string;
  cefrLevel: string;
  raLevel: number;
  subGenre: string;
  genre: string;
  id: string;
  audioUrl?: string;
  audioWordUrl?: string;
  read_count?: number;
  WordList?: WordList[];
  multipleChoiceQuestions?: MCQuestion[];
  shortAnswerQuestions?: SAQuestion[];
  longAnswerQuestions?: LAQuestion[];
}

export interface WordList {
  id: string;
  wordlist: string[];
  timepoints: Prisma.JsonValue | Timepoint[];
  articleId: string;
}

export interface MCQuestion {
  id: string;
  question: string;
  options?: string[];
  answer?: string;
  articleId: string;
  textualEvidence?: string;
}

export interface SAQuestion {
  id: string;
  question: string;
  answer?: string;
  articleId: string;
}
export interface LAQuestion {
  id: string;
  question: string;
  articleId: string;
}

interface TimePoint {
  timeSeconds: number;
  markName: string;
  index?: number;
  file?: string;
  sentences?: string;
}

export interface WordListTimestamp {
  vocabulary: string;
  definition: {
    en: string;
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  timeSeconds?: number;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface SentenceTimepoint {
  startTime: number;
  endTime: number;
  words: WordTimestamp[];
  sentence: string;
}

export interface QuestionResponse {
  questions: MCQuestion[] | SAQuestion | LAQuestion;
  result?: QuestionResult;
  questionStatus?: QuestionState | QuestionState.INCOMPLETE;
}

export interface QuestionResult {
  details: {
    question?: string;
    suggestedAnswer?: string;
    feedback?: string;
    yourAnswer?: string;
    score?: number;
    responses?: string[];
    timer?: number;
  };
  completed: boolean;
}

export interface SAQFeedbackResponse {
  score: number;
  feedback: string;
}

export interface LAQFeedbackResponse {
  score: number;
  feedback: LAQFeedback;
}

export interface LAQFeedback {
  detailedFeedback: {
    [key: string]: {
      areasForImprovement: string;
      examples: string;
      strengths: string;
      suggestions: string;
    };
  };
  score: {
    [key: string]: number;
  };
  overallImpression: string;
  exampleRevisions: string;
  nextSteps?: string[];
}

export interface FlashcardCard extends Omit<FSRSCard, "due" | "last_review"> {
  id: string;
  deckId: string;
  type: FlashcardType;
  articleId?: string;
  audioUrl?: string;
  startTime?: number;
  endTime?: number;

  // Content fields
  word?: string;
  definition?: MultiLanguageText;
  sentence?: string;
  translation?: MultiLanguageText;
  context?: string;

  // ts-fsrs fields (with proper types)
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview?: Date;

  createdAt: Date;
  updatedAt: Date;
  reviews?: CardReview[];
}

export interface MultiLanguageText {
  en?: string;
  th: string;
  cn: string;
  tw: string;
  vi: string;
}

export interface CardReview {
  id: string;
  cardId: string;
  rating: Rating; // ts-fsrs Rating enum (1-4)
  timeSpent?: number;
  reviewedAt: Date;
}

// Re-export ts-fsrs types for convenience
export { Rating, State as FSRSState } from "ts-fsrs";
