/**
 * Type-safe constants for every AI task key in the registry.
 * Keep in sync with prisma/seed/aiProviderRegistry.ts.
 */

export const TASK_KEYS = {
  ARTICLE_GENERATE: "article.generate",
  ARTICLE_CONTENT: "article.content",
  STORY_GENERATE: "story.generate",
  STORY_EVALUATE: "story.evaluate",
  STORY_TOPIC: "story.topic",
  IMAGE_SCENE_PROMPT: "image.scene-prompt",
  IMAGE_GENERATE: "image.generate",
  TRANSLATION_SENTENCE: "translation.sentence",
  TRANSLATION_SUMMARY: "translation.summary",
  EVALUATION_RATING: "evaluation.rating",
  QA_FEEDBACK: "qa.feedback",
  CHATBOT_STREAM: "chatbot.stream",
  INSIGHTS_GENERATE: "insights.generate",
  TOPIC_GENERATE: "topic.generate",
  WORDLIST_GENERATE: "wordlist.generate",
  QUESTION_GENERATE: "question.generate",
  FLASHCARD_CONTENT: "flashcard.content",
} as const;

export type TaskKey = (typeof TASK_KEYS)[keyof typeof TASK_KEYS];
