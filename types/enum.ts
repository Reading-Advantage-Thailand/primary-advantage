export enum Role {
  USER = "USER",
  STUDENT = "STUDENT",
  TEACHER = "TEACHER",
  ADMIN = "ADMIN",
  SYSTEM = "SYSTEM",
}

export enum ArticleType {
  FICTION = "fiction",
  NONFICTION = "nonfiction",
}

export enum ArticleBaseCefrLevel {
  A1 = "A1",
  A2 = "A2",
  B1 = "B1",
  B2 = "B2",
  C1 = "C1",
  C2 = "C2",
}

export enum ArticleCefrLevel {
  A1MINUS = "A1-",
  A1 = "A1",
  A1PLUS = "A1+",
  A2MINUS = "A2-",
  A2 = "A2",
  A2PLUS = "A2+",
  B1MINUS = "B1-",
  B1 = "B1",
  B1PLUS = "B1+",
  B2MINUS = "B2-",
  B2 = "B2",
  B2PLUS = "B2+",
  C1MINUS = "C1-",
  C1 = "C1",
  C1PLUS = "C1+",
  C2MINUS = "C2-",
  C2 = "C2",
  C2PLUS = "C2+",
}

export enum ActivityType {
  ARTICLE_RATING = "ARTICLE_RATING",
  ARTICLE_READ = "ARTICLE_READ",
  STORIES_RATING = "STORIES_RATING",
  STORIES_READ = "STORIES_READ",
  CHAPTER_RATING = "CHAPTER_RATING",
  CHAPTER_READ = "CHAPTER_READ",
  LEVEL_TEST = "LEVEL_TEST",
  MC_QUESTION = "MC_QUESTION",
  SA_QUESTION = "SA_QUESTION",
  LA_QUESTION = "LA_QUESTION",
  SENTENCE_FLASHCARDS = "SENTENCE_FLASHCARDS",
  SENTENCE_MATCHING = "SENTENCE_MATCHING",
  SENTENCE_ORDERING = "SENTENCE_ORDERING",
  SENTENCE_WORD_ORDERING = "SENTENCE_WORD_ORDERING",
  SENTENCE_CLOZE_TEST = "SENTENCE_CLOZE_TEST",
  VOCABULARY_FLASHCARDS = "VOCABULARY_FLASHCARDS",
  VOCABULARY_MATCHING = "VOCABULARY_MATCHING",
}

export enum ActivityStatus {
  InProgress = "in_progress",
  Completed = "completed",
}

export enum QuestionState {
  LOADING = 0,
  INCOMPLETE = 1,
  COMPLETED = 2,
  ERROR = 3,
}

export enum AnswerStatus {
  CORRECT = 0,
  INCORRECT = 1,
  UNANSWERED = 2,
}

export enum UserXpEarned {
  MCQuestion = 2,
  Article_Rating = 10,
  Chapter_Rating = 10,
  Vocabulary_Flashcards = 15,
  Vocabulary_Matching = 5,
  Sentence_Flashcards = 15,
  Sentence_Matching = 5,
  Sentence_Cloze_Test = 2,
  Sentence_Ordering = 5,
  Sentence_Word_Ordering = 5,
}

export enum FlashcardType {
  VOCABULARY = "VOCABULARY",
  SENTENCE = "SENTENCE",
}
