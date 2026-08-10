export const TOTAL_LESSON_TASKS = 14;

/**
 * Progress is stored as a percentage for compatibility with the existing
 * UserLessonProgress table. Keep the conversion in one place so rounded
 * percentages restore the same task that was saved.
 */
export function getLessonProgressForTask(task: number): number {
  const normalizedTask = Math.min(
    TOTAL_LESSON_TASKS,
    Math.max(1, Math.round(task)),
  );

  if (normalizedTask === 1) {
    return 0;
  }

  return Math.round((normalizedTask / TOTAL_LESSON_TASKS) * 100);
}

export function getLessonTaskFromProgress(progress: number): number {
  if (!Number.isFinite(progress) || progress <= 0) {
    return 1;
  }

  // A non-zero progress record means the lesson has already started. The
  // old start flow saved 7% while moving the UI to task 2, so keep that data
  // compatible by never restoring a started lesson to task 1.
  return Math.min(
    TOTAL_LESSON_TASKS,
    Math.max(
      2,
      Math.round((Math.min(progress, 100) / 100) * TOTAL_LESSON_TASKS),
    ),
  );
}
