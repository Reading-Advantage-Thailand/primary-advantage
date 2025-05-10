export type SiteConfig = {
  name: string;
  description: string;
  url: string;
  ogImage: string;
  link: {
    github: string;
  };
};

export type MainNavItem = NavItem;

export type NavItem = {
  title: "home" | "about" | "contact" | "authors";
  href: string;
  disabled?: boolean;
};

export type IndexPageConfig = {
  mainNav: MainNavItem[];
};

export type StudentPageConfig = {
  mainNav: MainNavItem[];
  sidebarNav: sidebarNav[];
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
  icon?: keyof typeof Icons;
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
  imageDescription: string;
  passage: string;
  createdAt: Date;
  rating: number;
  timepoints: Prisma.JsonValue | TimePoint[];
  type: string;
  title: string;
  cefrLevel: string;
  raLevel: number;
  subGenre: string;
  genre: string;
  id: string;
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
  options: string[];
  answer: string;
  articleId: string;
  textualEvidence?: string;
}

export interface SAQuestion {
  id: string;
  question: string;
  answer: string;
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
