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
          "Exactly 4 options including 1 correct answer. An incorrect but plausible answer that is approximately the same length as the correct answer."
        ),
      textual_evidence: z
        .string()
        .describe(
          "A quote from the reading passage providing textual evidence for the correct answer"
        ),
    })
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
      })
    )
    .length(5),
});

export const VocabularySchema = z
  .object({
    word_list: z
      .array(
        z.object({
          vocabulary: z
            .string()
            .describe("A difficult vocabulary word, phrase, or idiom."),
          definition: z.object({
            en: z
              .string()
              .describe(
                "The English definition of the vocabulary in simple language."
              ),
            th: z.string().describe("The Thai translation of the vocabulary."),
            cn: z
              .string()
              .describe(
                "The Simplified Chinese translation of the vocabulary."
              ),
            tw: z
              .string()
              .describe(
                "The Traditional Chinese translation of the vocabulary."
              ),
            vi: z
              .string()
              .describe("The Vietnamese translation of the vocabulary."),
          }),
        })
      )
      .describe("A list of vocabulary objects with their translations."),
  })
  .required();
