import z from "zod";

export const signInSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .min(1, "Email is required")
    .email("Invalid email"),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required")
    .min(8, "Password must be more than 8 characters")
    .max(32, "Password must be less than 32 characters"),
  type: z.enum(["student", "other"]).optional(),
});

export const signUpSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z
      .string({ required_error: "Email is required" })
      .min(1, "Email is required")
      .email("Invalid email"),
    password: z
      .string({ required_error: "Password is required" })
      .min(1, "Password is required")
      .min(8, "Password must be more than 8 characters")
      .max(32, "Password must be less than 32 characters"),
    confirmPassword: z
      .string({ required_error: "Confirm password is required" })
      .min(1, "Confirm password is required")
      .min(8, "Confirm password must be more than 8 characters")
      .max(32, "Confirm password must be less than 32 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const classCodeSchema = z.object({
  classroomCode: z
    .string({ required_error: "Classroom code is required" })
    .min(1, "Classroom code is required"),
});

export const MCQuestionSchema = z.object({
  questions: z.array(
    z.object({
      question_number: z.number(),
      question: z.string().describe("The question"),
      answer: z.string().describe("The correct answer"),
      options: z
        .array(z.string())
        .length(4)
        .describe(
          "Exactly 4 options including 1 correct answer. An incorrect but plausible answer that is approximately the same length as the correct answer.",
        ),
      textual_evidence: z
        .string()
        .describe(
          "A quote from the reading passage providing textual evidence for the correct answer",
        ),
    }),
  ),
});

export const LAQuestionSchema = z.object({
  question: z.string(),
});

export const SAQuestionSchema = z.object({
  questions: z
    .array(
      z.object({
        question_number: z.number(),
        question: z.string(),
        answer: z.string(),
      }),
    )
    .length(5),
});

export const VocabularySchema = z.array(
  z.object({
    vocabulary: z
      .string()
      .describe("A difficult vocabulary word, phrase, or idiom."),
    definition: z.object({
      en: z
        .string()
        .describe(
          "The English definition of the vocabulary in simple language.",
        ),
      th: z.string().describe("The Thai translation of the vocabulary."),
      cn: z
        .string()
        .describe("The Simplified Chinese translation of the vocabulary."),
      tw: z
        .string()
        .describe("The Traditional Chinese translation of the vocabulary."),
      vi: z.string().describe("The Vietnamese translation of the vocabulary."),
    }),
  }),
);

export const laqFeedbackInputSchema = z.object({
  preferredLanguage: z.string(),
  targetCEFRLevel: z.enum(["A0", "A1", "A2", "B1", "B2", "C1", "C2"]),
  readingPassage: z.string(),
  writingPrompt: z.string(),
  studentResponse: z.string(),
});

export const laqFeedbackOutputSchema = z.object({
  feedback: z.object({
    score: z.object({
      vocabularyUse: z.number().int().min(1).max(5),
      grammarAccuracy: z.number().int().min(1).max(5),
      clarityAndCoherence: z.number().int().min(1).max(5),
      complexityAndStructure: z.number().int().min(1).max(5),
      contentAndDevelopment: z.number().int().min(1).max(5),
    }),
    overallImpression: z.string(),
    detailedFeedback: z.object({
      vocabularyUse: z.object({
        strengths: z.string(),
        areasForImprovement: z.string(),
        examples: z.string(),
        suggestions: z.string(),
      }),
      grammarAccuracy: z.object({
        strengths: z.string(),
        areasForImprovement: z.string(),
        examples: z.string(),
        suggestions: z.string(),
      }),
      clarityAndCoherence: z.object({
        strengths: z.string(),
        areasForImprovement: z.string(),
        examples: z.string(),
        suggestions: z.string(),
      }),
      complexityAndStructure: z.object({
        strengths: z.string(),
        areasForImprovement: z.string(),
        examples: z.string(),
        suggestions: z.string(),
      }),
      contentAndDevelopment: z.object({
        strengths: z.string(),
        areasForImprovement: z.string(),
        examples: z.string(),
        suggestions: z.string(),
      }),
    }),
    exampleRevisions: z.array(z.string()).min(2).max(3),
    nextSteps: z.array(z.string()).min(2).max(3),
  }),
});

export const saqFeedbackInputSchema = z.object({
  preferredLanguage: z.string(),
  targetCEFRLevel: z.enum(["A0", "A1", "A2", "B1", "B2", "C1", "C2"]),
  article: z.string(),
  question: z.string(),
  suggestedResponse: z.string(),
  studentResponse: z.string(),
});

export const saqFeedbackOutputSchema = z.object({
  feedback: z.string().describe("A single sentence feedback in student's L1"),
  score: z.number().int().min(1).max(5),
});

export const articleGeneratorSchema = z.object({
  brainstorming: z
    .string()
    .describe(
      "Brainstorm various ideas for the article or passage in short phrases.",
    ),
  planning: z
    .string()
    .describe(
      "Planning for the passage: a strategy for incorporating vocabulary and grammar features suited to the specified CEFR level, including sentence structures, common phrases, and appropriate linguistic complexity. For nonfiction, focus on a logical organization of ideas and clear transitions; for fiction, consider narrative techniques, character development, and descriptive language. Provide a bullet-point outline covering the structure, key content points, and any specific stylistic or thematic elements to include.",
    ),
  title: z
    .string()
    .describe(
      "An interesting title for the article written at the same CEFR level",
    ),
  passage: z
    .string()
    .describe(
      "The reading passage written to the supplied specifications for both CEFR and type.",
    ),
  summary: z
    .string()
    .describe(
      "A one-sentence summary of the article written at the same CEFR level",
    ),
  imageDesc: z
    .string()
    .describe(
      "A detailed description of an image to go along with the passage",
    ),
  translatedSummary: z.object({
    th: z.string().describe("The Thai translation of the vocabulary."),
    cn: z
      .string()
      .describe("The Simplified Chinese translation of the vocabulary."),
    tw: z
      .string()
      .describe("The Traditional Chinese translation of the vocabulary."),
    vi: z.string().describe("The Vietnamese translation of the vocabulary."),
  }),
});
