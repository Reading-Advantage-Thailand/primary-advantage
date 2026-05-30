/**
 * Human-friendly labels for AI task keys.
 * Keys are the stable API/DB identifiers; labels are display-only.
 */

export const TASK_LABELS: Record<string, string> = {
  "article.generate": "Article Generation",
  "article.content": "Article Content Extraction",
  "story.generate": "Story Generation",
  "story.evaluate": "Story Evaluation",
  "story.topic": "Story Topic",
  "image.scene-prompt": "Image Scene Prompt",
  "image.generate": "Image Generation",
  "translation.sentence": "Sentence Translation",
  "translation.summary": "Summary Translation",
  "evaluation.rating": "Content Evaluation",
  "qa.feedback": "Q&A Feedback",
  "chatbot.stream": "Lesson Chatbot",
  "insights.generate": "Insights Generation",
  "topic.generate": "Topic Generation",
  "wordlist.generate": "Wordlist Generation",
  "question.generate": "Question Generation",
  "flashcard.content": "Flashcard Content",
};

export function taskLabel(key: string): string {
  return TASK_LABELS[key] ?? key; // fall back to raw key if unmapped
}
