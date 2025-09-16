// interface BatchGenerateParams {
//   type: ArticleType;
//   level: ArticleBaseCefrLevel;
//   amount: number;
// }

// interface GenerationJob {
//   id: string;
//   type: ArticleType;
//   level: ArticleBaseCefrLevel;
//   genre: string;
//   subgenre: string;
//   topic: string;
//   status: "pending" | "processing" | "completed" | "failed";
// }

// // Generate multiple topics at once to reduce AI calls
// async function generateBatchTopics(
//   type: ArticleType,
//   genres: Array<{ genre: string; subgenre: string }>,
//   amount: number,
// ): Promise<string[]> {
//   const topicPrompt = `Generate ${amount} diverse reading passage topics for ${type} articles covering these genres: ${genres.map((g) => `${g.genre}/${g.subgenre}`).join(", ")}. Return as JSON array of topic strings.`;

//   const { object } = await generateObject({
//     model: google(googleModel),
//     schema: z.object({
//       topics: z.array(z.string()),
//     }),
//     prompt: topicPrompt,
//   });

//   return object.topics;
// }

// // Process articles in parallel batches
// export const generateArticlesBatch = async ({
//   type,
//   level,
//   amount,
// }: BatchGenerateParams): Promise<void> => {
//   const BATCH_SIZE = 3; // Process 3 articles simultaneously
//   const CONCURRENT_LIMIT = 2; // Limit concurrent AI calls

//   try {
//     // 1. Pre-generate all genres and topics in batch
//     const genres = await Promise.all(
//       Array(amount)
//         .fill(null)
//         .map(() => randomSelectGenre({ type })),
//     );

//     const topics = await generateBatchTopics(type, genres, amount);

//     // 2. Create generation jobs
//     const jobs: GenerationJob[] = topics.map((topic, index) => ({
//       id: `${type}-${level}-${Date.now()}-${index}`,
//       type,
//       level,
//       genre: genres[index].genre,
//       subgenre: genres[index].subgenre,
//       topic,
//       status: "pending",
//     }));

//     // 3. Process jobs in batches
//     for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
//       const batch = jobs.slice(i, i + BATCH_SIZE);

//       await Promise.allSettled(batch.map((job) => processArticleJob(job)));

//       // Brief pause between batches to avoid rate limits
//       if (i + BATCH_SIZE < jobs.length) {
//         await new Promise((resolve) => setTimeout(resolve, 1000));
//       }
//     }

//     console.log(
//       `Completed batch generation: ${amount} articles for ${type}/${level}`,
//     );
//   } catch (error) {
//     console.error("Batch generation failed:", error);
//     throw error;
//   }
// };

// async function processArticleJob(job: GenerationJob): Promise<void> {
//   try {
//     job.status = "processing";

//     // Generate core content first (lightweight operations)
//     const content = await generateContentOptimized(job);

//     // Save to database immediately
//     const articleId = await saveArticleCore(content, job);

//     // Queue heavy operations (image, audio) for background processing
//     queueBackgroundTasks(articleId, content);

//     job.status = "completed";
//   } catch (error) {
//     job.status = "failed";
//     console.error(`Job ${job.id} failed:`, error);
//     throw error;
//   }
// }

// // Combine multiple AI calls into single optimized call
// async function generateContentOptimized(
//   job: GenerationJob,
// ): Promise<GeneratedContent> {
//   // Use a single AI call to generate article + initial questions
//   const combinedSchema = z.object({
//     article: articleGeneratorSchema,
//     questions: z.object({
//       multipleChoice: z
//         .array(
//           z.object({
//             question: z.string(),
//             options: z.array(z.string()),
//             answer: z.string(),
//           }),
//         )
//         .min(5)
//         .max(8),
//       shortAnswer: z
//         .array(
//           z.object({
//             question: z.string(),
//             answer: z.string(),
//           }),
//         )
//         .min(3)
//         .max(5),
//       longAnswer: z.object({
//         question: z.string(),
//       }),
//     }),
//   });

//   const combinedPrompt = `
//   Create a complete ${job.type} article for ${job.level} level about "${job.topic}" in the ${job.genre}/${job.subgenre} genre.

//   Include:
//   1. Full article with title, passage, summary, translated summaries, and image description
//   2. 5-8 multiple choice questions
//   3. 3-5 short answer questions
//   4. 1 long answer question

//   Topic: ${job.topic}
//   Genre: ${job.genre}/${job.subgenre}
//   CEFR Level: ${job.level}
//   `;

//   const { object: combined } = await generateObject({
//     model: google(googleModel),
//     schema: combinedSchema,
//     prompt: combinedPrompt,
//     temperature: 0.8,
//   });

//   // Quick rating evaluation (optional - can be skipped for speed)
//   const rating = await evaluateRatingFast(combined.article.passage, job.level);

//   return {
//     article: {
//       ...combined.article,
//       rating: rating.rating,
//       cefrLevel: rating.cefrLevel,
//     },
//     mcq: { questions: combined.questions.multipleChoice },
//     saq: { questions: combined.questions.shortAnswer },
//     laq: combined.questions.longAnswer,
//   };
// }

// // Faster rating evaluation with smaller model
// async function evaluateRatingFast(
//   passage: string,
//   level: ArticleBaseCefrLevel,
// ): Promise<{ rating: number; cefrLevel: string }> {
//   const { object } = await generateObject({
//     model: google("gemini-1.5-flash"), // Use faster, cheaper model
//     schema: z.object({
//       rating: z.number().min(1).max(5),
//       cefrLevel: z.string(),
//     }),
//     prompt: `Rate this passage for ${level} level (1-5 scale) and confirm CEFR level: ${passage.substring(0, 500)}...`,
//     maxTokens: 100, // Limit tokens for speed
//   });

//   return object;
// }

// interface BackgroundTask {
//   type: "image" | "audio" | "wordlist" | "translation";
//   articleId: string;
//   data: any;
//   priority: number;
// }

// class BackgroundTaskQueue {
//   private queue: BackgroundTask[] = [];
//   private processing = false;
//   private readonly CONCURRENT_TASKS = 2;

//   addTask(task: BackgroundTask) {
//     this.queue.push(task);
//     this.queue.sort((a, b) => b.priority - a.priority);
//     this.processQueue();
//   }

//   private async processQueue() {
//     if (this.processing || this.queue.length === 0) return;

//     this.processing = true;

//     while (this.queue.length > 0) {
//       const batch = this.queue.splice(0, this.CONCURRENT_TASKS);

//       await Promise.allSettled(batch.map((task) => this.executeTask(task)));
//     }

//     this.processing = false;
//   }

//   private async executeTask(task: BackgroundTask) {
//     try {
//       switch (task.type) {
//         case "image":
//           await generateImage({
//             imageDesc: task.data.imageDesc,
//             articleId: task.articleId,
//           });
//           break;
//         case "audio":
//           await generateAudio({
//             passage: task.data.passage,
//             articleId: task.articleId,
//           });
//           break;
//         case "wordlist":
//           await generateWordLists(task.articleId);
//           break;
//       }
//     } catch (error) {
//       console.error(
//         `Background task ${task.type} failed for ${task.articleId}:`,
//         error,
//       );
//     }
//   }
// }

// const backgroundQueue = new BackgroundTaskQueue();

// export function queueBackgroundTasks(
//   articleId: string,
//   content: GeneratedContent,
// ) {
//   // Queue tasks with priorities (higher = more important)
//   backgroundQueue.addTask({
//     type: "image",
//     articleId,
//     data: { imageDesc: content.article.imageDesc },
//     priority: 3,
//   });

//   backgroundQueue.addTask({
//     type: "audio",
//     articleId,
//     data: { passage: content.article.passage },
//     priority: 2,
//   });

//   backgroundQueue.addTask({
//     type: "wordlist",
//     articleId,
//     data: {},
//     priority: 1,
//   });
// }

// // Save core article data immediately, update with media later
// async function saveArticleCore(
//   content: GeneratedContent,
//   job: GenerationJob,
// ): Promise<string> {
//   const transaction = await prisma.$transaction(async (tx) => {
//     // Create article
//     const article = await tx.article.create({
//       data: {
//         title: content.article.title,
//         passage: content.article.passage,
//         summary: content.article.summary,
//         translatedSummary: content.article.translatedSummary,
//         imageDescription: content.article.imageDesc,
//         genre: cleanGenre(job.genre),
//         subGenre: cleanGenre(job.subgenre),
//         type: job.type,
//         rating: content.article.rating,
//         raLevel: convertCefrLevel(content.article.cefrLevel),
//         cefrLevel: content.article.cefrLevel,
//       },
//     });

//     // Create all questions in parallel
//     await Promise.all([
//       // Multiple choice questions
//       tx.multipleChoiceQuestion.createMany({
//         data: content.mcq.questions.map((q) => ({
//           question: q.question,
//           options: q.options,
//           answer: q.answer,
//           articleId: article.id,
//         })),
//       }),

//       // Short answer questions
//       tx.shortAnswerQuestion.createMany({
//         data: content.saq.questions.map((q) => ({
//           question: q.question,
//           answer: q.answer,
//           articleId: article.id,
//         })),
//       }),

//       // Long answer question
//       tx.longAnswerQuestion.create({
//         data: {
//           question: content.laq.question,
//           articleId: article.id,
//         },
//       }),
//     ]);

//     return article.id;
//   });

//   return transaction;
// }

// class TokenManager {
//   private tokenUsage = new Map<string, number>();
//   private readonly TOKEN_LIMITS = {
//     "gemini-1.5-pro": 32000,
//     "gemini-1.5-flash": 8000,
//   };

//   async executeWithTokenManagement<T>(
//     modelName: string,
//     operation: () => Promise<T>,
//     estimatedTokens: number,
//   ): Promise<T> {
//     const currentUsage = this.tokenUsage.get(modelName) || 0;
//     const limit = this.TOKEN_LIMITS[modelName] || 8000;

//     if (currentUsage + estimatedTokens > limit * 0.8) {
//       // Wait before making request to avoid limits
//       await new Promise((resolve) => setTimeout(resolve, 2000));
//       this.tokenUsage.set(modelName, 0);
//     }

//     const result = await operation();
//     this.tokenUsage.set(modelName, currentUsage + estimatedTokens);

//     return result;
//   }
// }

// const tokenManager = new TokenManager();

// export const generateAllArticleOptimized = async (amountPerGenre: number) => {
//   const types: ArticleType[] = [ArticleType.FICTION, ArticleType.NONFICTION];
//   const levels: ArticleBaseCefrLevel[] = [
//     ArticleBaseCefrLevel.A1,
//     ArticleBaseCefrLevel.A2,
//     ArticleBaseCefrLevel.B1,
//     ArticleBaseCefrLevel.B2,
//   ];

//   console.log(
//     `Starting optimized generation of ${types.length * levels.length * amountPerGenre} articles...`,
//   );

//   try {
//     // Process all combinations in parallel with controlled concurrency
//     const promises = [];

//     for (const type of types) {
//       for (const level of levels) {
//         promises.push(
//           generateArticlesBatch({ type, level, amount: amountPerGenre }),
//         );
//       }
//     }

//     // Execute with limited concurrency to avoid overwhelming the system
//     const BATCH_CONCURRENCY = 2;
//     for (let i = 0; i < promises.length; i += BATCH_CONCURRENCY) {
//       const batch = promises.slice(i, i + BATCH_CONCURRENCY);
//       await Promise.allSettled(batch);

//       // Brief pause between major batches
//       if (i + BATCH_CONCURRENCY < promises.length) {
//         await new Promise((resolve) => setTimeout(resolve, 3000));
//       }
//     }

//     console.log("Optimized article generation completed!");
//   } catch (error) {
//     console.error("Optimized generation failed:", error);
//     throw error;
//   }
// };
