/**
 * Human-friendly labels for AI task keys.
 * Keys are the stable API/DB identifiers; labels are display-only.
 */

export const TASK_LABELS: Record<string, string> = {
  "article.generate": "Article Generation",
  "article.content": "Article Content Extraction",
  "evaluation.rating": "Content Evaluation (Article)",
  "image.scene-prompt": "Image Scene Prompt (Article)",
  "question.generate": "Question Generation (Custom Article)",
  "story.generate": "Story Generation",
  "story.topic": "Story Topic",
  "story.evaluate": "Story Evaluation",
  "image.generate": "Image Generation (Article + Story)",
  "translation.sentence": "Sentence Translation (Article + Story)",
  "wordlist.generate": "Wordlist Generation (Article + Story)",
  "flashcard.content": "Flashcard Content (Validation)",
  "translation.summary": "Summary Translation",
  "qa.feedback": "Q&A Feedback (Article + Story)",
  "chatbot.stream": "Lesson Chatbot",
  "insights.generate": "Insights / Analytics",
  "topic.generate": "Topic Generation (Legacy — unused)",
};

export function taskLabel(key: string): string {
  return TASK_LABELS[key] ?? key; // fall back to raw key if unmapped
}

// ---------------------------------------------------------------------------
// Category grouping
// ---------------------------------------------------------------------------

export const TASK_CATEGORIES: { label: string; taskKeys: string[] }[] = [
  {
    label: "Article",
    taskKeys: [
      "article.generate",
      "article.content",
      "evaluation.rating",
      "image.scene-prompt",
      "question.generate",
    ],
  },
  {
    label: "Story",
    taskKeys: ["story.generate", "story.topic", "story.evaluate"],
  },
  {
    label: "Other",
    taskKeys: [
      "image.generate",
      "translation.sentence",
      "wordlist.generate",
      "flashcard.content",
      "translation.summary",
      "qa.feedback",
      "chatbot.stream",
      "insights.generate",
      "topic.generate",
    ],
  },
];

// ---------------------------------------------------------------------------
// Legacy tasks (dead code — visible but not editable)
// ---------------------------------------------------------------------------

export const LEGACY_TASK_KEYS = new Set(["topic.generate"]);

export function isLegacyTask(key: string): boolean {
  return LEGACY_TASK_KEYS.has(key);
}

/** Build an index: taskKey → position within its category's taskKeys array. */
const CATEGORY_KEY_RANK: Record<string, { categoryIndex: number; keyIndex: number }> =
  Object.fromEntries(
    TASK_CATEGORIES.flatMap(({ taskKeys }, categoryIndex) =>
      taskKeys.map((key, keyIndex) => [key, { categoryIndex, keyIndex }]),
    ),
  );

export interface TaskGroup<T> {
  label: string;
  tasks: T[];
}

/**
 * Bucket an array of tasks (which must have a `taskKey: string` field) into
 * ordered category groups. Tasks not matched by any category go into a
 * trailing "Other" group so no row is dropped.
 */
export function groupTasksByCategory<T extends { taskKey: string }>(
  tasks: T[],
): TaskGroup<T>[] {
  // Build one bucket per category, plus one for unknowns.
  const buckets: Map<string, T[]> = new Map(
    TASK_CATEGORIES.map(({ label }) => [label, []]),
  );
  const other: T[] = [];

  for (const task of tasks) {
    const rank = CATEGORY_KEY_RANK[task.taskKey];
    if (rank !== undefined) {
      buckets.get(TASK_CATEGORIES[rank.categoryIndex].label)!.push(task);
    } else {
      other.push(task);
    }
  }

  // Sort each bucket by the declared order within its category.
  for (const [, bucket] of buckets) {
    bucket.sort(
      (a, b) =>
        (CATEGORY_KEY_RANK[a.taskKey]?.keyIndex ?? 999) -
        (CATEGORY_KEY_RANK[b.taskKey]?.keyIndex ?? 999),
    );
  }

  const groups: TaskGroup<T>[] = TASK_CATEGORIES.map(({ label }) => ({
    label,
    tasks: buckets.get(label)!,
  })).filter((g) => g.tasks.length > 0); // omit empty categories

  if (other.length > 0) {
    groups.push({ label: "Other", tasks: other });
  }

  return groups;
}
