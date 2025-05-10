export enum Role {
  USER = "user",
  STUDENT = "student",
  TEACHER = "teacher",
  ADMIN = "admin",
  SYSTEM = "system",
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
  ArticleRating = "article_rating",
  ArticleRead = "article_read",
  StoriesRating = "stories_rating",
  StoriesRead = "stories_read",
  ChapterRating = "chapter_rating",
  ChapterRead = "chapter_read",
  LevelTest = "level_test",
  MC_Question = "mc_question",
  SA_Question = "sa_question",
  LA_Question = "la_question",
  SentenceFlashcards = "sentence_flashcards",
  SentenceMatching = "sentence_matching",
  SentenceOrdering = "sentence_ordering",
  SentenceWordOrdering = "sentence_word_ordering",
  SentenceClozeTest = "sentence_cloze_test",
  VocabularyFlashcards = "vocabulary_flashcards",
  VocabularyMatching = "vocabulary_matching",
}

export enum ActivityStatus {
  InProgress = "in_progress",
  Completed = "completed",
}

export enum QuestionState {
  LOADING = 0,
  INCOMPLETE = 1,
  COMPLETED = 2,
}

export enum AnswerStatus {
  CORRECT = 0,
  INCORRECT = 1,
  UNANSWERED = 2,
}
