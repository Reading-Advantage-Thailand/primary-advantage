import { ArticleBaseCefrLevel, ArticleType } from "@/types/enum";
import {
  generateArticles,
  getArticlesWithParams,
  getArticleById,
  getQuestionsByArticleId,
  getAllFlashcards,
  deleteFlashcardById,
  getCustomArticle,
  deleteArticleByIdModel,
  createdArticleCustom,
  checkExistingArticle,
  updateAprovedCustomArticle,
} from "../models/articleModel";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { generateArticle } from "../utils/genaretors/article-generator";
import { evaluateRating } from "../utils/genaretors/evaluate-rating-generator";
import { generateMCQuestion } from "../utils/genaretors/mc-question-generator";
import { generateLAQuestion } from "../utils/genaretors/la-question-generator";
import { generateSAQuestion } from "../utils/genaretors/sa-question-generator";
import {
  saveArticleContent,
  generateQuestions,
  saveArticleAsDraftModel,
} from "../models/articleModel";
import { generateArticleNew } from "../utils/genaretors/new-generator";
import { WorkbookJSON } from "@/utils/workbook-data-mapper";
import { prisma } from "@/lib/prisma";

export const generateAllArticleNew = async (amountPerGenre: number) => {
  const types: ArticleType[] = [ArticleType.FICTION];
  const levels: ArticleBaseCefrLevel[] = [
    ArticleBaseCefrLevel.A0,
    ArticleBaseCefrLevel.A1,
    ArticleBaseCefrLevel.A2,
    ArticleBaseCefrLevel.B1,
    ArticleBaseCefrLevel.B2,
  ];

  const totalArticles = types.length * levels.length * amountPerGenre;
  const articles: any[] = [];
  let completedArticles = 0;

  try {
    console.log(`Starting generation of ${amountPerGenre} articles...`);
    for (let i = 0; i < amountPerGenre; i++) {
      console.log(`Generating article number ${i + 1}`);
      await generateArticleNew(ArticleBaseCefrLevel.A0);
    }
    console.log(`Successfully generated ${amountPerGenre} articles`);
  } catch (error) {
    console.error("Error in generateAllArticleNew:", error);
    throw new Error(`Failed to generate all articles: ${error}`);
  }
};

export const generateAllArticle = async (amountPerGenre: number) => {
  const types: ArticleType[] = [ArticleType.FICTION, ArticleType.NONFICTION];
  const levels: ArticleBaseCefrLevel[] = [
    ArticleBaseCefrLevel.A1,
    ArticleBaseCefrLevel.A2,
    ArticleBaseCefrLevel.B1,
    ArticleBaseCefrLevel.B2,
  ];

  const totalArticles = types.length * levels.length * amountPerGenre;
  const articles: any[] = [];
  let completedArticles = 0;

  console.log(`Starting generation of ${totalArticles} articles...`);

  try {
    for (let i = 0; i < amountPerGenre; i++) {
      for (const type of types) {
        for (const level of levels) {
          try {
            await generateArticles({ type, level });
            completedArticles++;
            console.log(
              `Progress: ${completedArticles}/${totalArticles} articles generated (Type: ${type}, Level: ${level})`,
            );
          } catch (error: any) {
            console.error(
              `Failed to generate article (Type: ${type}, Level: ${level}):`,
              error,
            );
            throw new Error(`Failed to generate article: ${error.message}`);
          }
        }
      }
    }

    console.log(`Successfully generated ${completedArticles} articles`);
    return articles;
  } catch (error: any) {
    console.error("Error in generateAllArticle:", error);
    throw new Error(`Failed to generate all articles: ${error.message}`);
  }
};

export const fetchArticles = async (req: URLSearchParams) => {
  const title = req.get("title") ?? undefined;
  const type = req.get("type") ?? undefined;
  const genre = req.get("genre") ?? undefined;
  const subgenre = req.get("subgenre") ?? undefined;
  const cefrLevel = req.get("cefrLevel") ?? undefined;
  const limit = parseInt(req.get("limit") || "10", 10);
  const offset = parseInt(req.get("offset") || "0", 10);

  return getArticlesWithParams({
    title,
    type,
    genre,
    subgenre,
    cefrLevel,
    limit,
    offset,
  });
};

export const fetchArticleById = async (req: URLSearchParams) => {
  const articleId = req.get("articleId") ?? undefined;

  if (!articleId) {
    throw new Error("Article ID is required");
  }

  return getArticleById(articleId);
};

// export const fetchQuestionFeedback = async (req: {
//   data: {
//     articleId: string;
//     question: string;
//     answer: string;
//     suggestedResponse?: string;
//     preferredLanguage: string;
//   };
//   activityType: ActivityType;
// }) => {
//   return getQuestionFeedback(req);
// };

// export const fetchQuestionsByArticleId = async (req: URLSearchParams) => {
//   const articleId = req.get("articleId") ?? undefined;

//   if (!articleId) {
//     throw new Error("Article ID is required");
//   }

//   return getQuestionsByArticleId(articleId);
// };

export const deleteArticleById = async (articleId: string) => {
  return deleteArticleByIdModel(articleId);
};

export const fetchAllFlashcards = async (req: URLSearchParams) => {
  try {
    const userId = await currentUser();

    if (!userId) {
      throw new Error("User not found");
    }

    return getAllFlashcards(userId.id);
  } catch (error) {
    console.error("Error in fetchAllFlashcards:", error);
    throw new Error("Failed to fetch all flashcards");
  }
};

export const deleteFlashcardByIdAction = async (flashcardId: string) => {
  try {
    if (!flashcardId) {
      return { success: false, error: "Flashcard ID is required" };
    }

    await deleteFlashcardById(flashcardId);
    return { success: true, message: "Flashcard deleted successfully" };
  } catch (error) {
    console.error("Error in deleteFlashcardByIdAction:", error);
    return { success: false, error: "Failed to delete flashcard" };
  }
};

export const generateCustomArticle = async (req: NextRequest) => {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { type, genre, subgenre, topic, cefrLevel } = await req.json();

    const article = await generateArticle({
      type,
      cefrLevel,
      genre,
      subgenre,
      topic,
    });

    const evaluatedArticle = await evaluateRating({
      passage: article.passage,
      cefrLevel,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Custom article generated successfully",
        data: { ...article, ...evaluatedArticle, topic },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in generateCustomArticle:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate custom article" },
      { status: 500 },
    );
  }
};

export const saveArticleAndPublish = async (req: NextRequest) => {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestBody = await req.json();
    // Handle both { article } and { data } formats from frontend
    const article = requestBody.article || requestBody.data;

    // const existingArticle = await checkExistingArticle(data.id);

    if (!article.id) {
      await createdArticleCustom(article);
    } else {
      await updateAprovedCustomArticle(article.id);
    }

    return NextResponse.json(
      { success: true, message: "Article saved and published successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in saveArticleCustomGenerate:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save article" },
      { status: 500 },
    );
  }
};

export const saveArticleAsDraft = async (req: NextRequest) => {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { article, type, genre, subgenre } = await req.json();

    await saveArticleAsDraftModel(article, type, genre, subgenre);

    return NextResponse.json(
      { success: true, message: "Article saved as draft successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in saveArticleAsDraft:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save article as draft" },
      { status: 500 },
    );
  }
};

export const fetchCustomArticleController = async (req: NextRequest) => {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customArticles = await getCustomArticle(user.id as string);

    return NextResponse.json({ articles: customArticles }, { status: 200 });
  } catch (error) {
    console.error("Error in fetchCustomArticleController:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch custom article" },
      { status: 500 },
    );
  }
};

export const generateExportWorkbook = async (articleId: string) => {
  try {
    // 1. Fetch Article with Relations
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: {
        multipleChoiceQuestions: true,
        shortAnswerQuestions: true,
        longAnswerQuestions: true,
        sentencsAndWordsForFlashcard: true,
      },
    });

    if (!article) {
      return NextResponse.json(
        { message: "Article or Chapter not found" },
        { status: 404 },
      );
    }

    // 2. Extract Vocabulary from Article Words (limit to 5)
    let vocab: WorkbookJSON["vocabulary"] = [];
    if (Array.isArray(article.sentencsAndWordsForFlashcard[0].words)) {
      vocab = (article?.sentencsAndWordsForFlashcard[0].words)
        .slice(0, 5)
        .map((w: any) => ({
          word: w.vocabulary,
          phonetic: "",
          definition: w.definition?.en || w.definition || "",
        }));
    }

    // console.log(article);

    // // 3. Check if translatedPassage exists, if not, call translate function
    let translatedPassage = article.translatedPassage;

    // // 4. Parse translatedPassage to align EN and TH arrays
    let enSentences: string[] = [];
    let thSentences: string[] = [];

    if (
      translatedPassage &&
      typeof translatedPassage === "object" &&
      !Array.isArray(translatedPassage)
    ) {
      const translations = translatedPassage as Record<string, string[]>;

      if (article.sentences && Array.isArray(article.sentences)) {
        enSentences = article.sentences.map((s: any) => s.sentence);
      }

      const targetLang = ["th", "cn", "zh-CN", "vi", "zh-TW", "tw"].find(
        (lang) => translations[lang] && translations[lang].length > 0,
      );

      if (targetLang && translations[targetLang]) {
        thSentences = translations[targetLang];
      }
    }

    // // 5. Create article_paragraphs by grouping sentences
    // // Group every 3-5 sentences into a paragraph
    const paragraphs: { number: number; text: string }[] = [];
    const sentencesPerParagraph = Math.ceil(enSentences.length / 3); // Aim for ~3 paragraphs

    for (let i = 0; i < enSentences.length; i += sentencesPerParagraph) {
      const paragraphSentences = enSentences.slice(
        i,
        i + sentencesPerParagraph,
      );
      paragraphs.push({
        number: paragraphs.length + 1,
        text: paragraphSentences.join(" "),
      });
    }

    // // If no translated sentences, fallback to splitting passage by \n\n
    if (paragraphs.length === 0 && article.passage) {
      const fallbackParagraphs = (article.passage as string).split("\n\n");
      fallbackParagraphs.forEach((p: string, i: number) => {
        paragraphs.push({
          number: i + 1,
          text: p,
        });
      });
    }

    // // 6. Create translation_paragraphs aligned with article_paragraphs
    const translationParagraphs: { label: string; text: string }[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const startIdx = i * sentencesPerParagraph;
      const endIdx = Math.min(
        startIdx + sentencesPerParagraph,
        thSentences.length,
      );
      const translatedSentences = thSentences.slice(startIdx, endIdx);

      translationParagraphs.push({
        label: `Paragraph ${i + 1}`,
        text: translatedSentences.join(" "),
      });
    }

    // // 7. Get 4 comprehension questions (limit to first 4 MCQs)
    const compQuestions = article.multipleChoiceQuestions
      .slice(0, 4)
      .map((q: any, i: number) => ({
        number: i + 1,
        question: q.question,
        options: q.options,
      }));

    // // 8. Get MC answers (from first 4 questions)
    const mcAnswers = article.multipleChoiceQuestions
      .slice(0, 4)
      .map((q: any, i: number) => {
        const answerIndex = q.options.findIndex(
          (opt: string) =>
            opt.toLowerCase().includes(q.answer.toLowerCase()) ||
            q.answer.toLowerCase().includes(opt.toLowerCase()),
        );
        const letter = String.fromCharCode(97 + Math.max(0, answerIndex)); // a, b, c, d
        return {
          number: i + 1,
          letter: letter,
          text: q.answer,
        };
      });

    // // 9. Get 1 short answer question with sentence starters
    let shortAnswerQuestion = "";
    let sentenceStarters: string[] = [
      "I think...",
      "The article says...",
      "In my opinion...",
    ];

    if (article.shortAnswerQuestions.length > 0) {
      // Find a valid question (not just a single letter)
      const validSAQ = article.shortAnswerQuestions.find(
        (q: any) => q.question.length > 5 && q.question.includes(" "),
      );

      if (validSAQ) {
        shortAnswerQuestion = validSAQ.question;

        // Extract first 2 words from answer for sentence starters
        const answerWords = validSAQ.answer.trim().split(/\s+/);
        if (answerWords.length >= 2) {
          const starter = `${answerWords[0]} ${answerWords[1]}...`;
          sentenceStarters = [starter, "I think...", "The article says..."];
        }
      } else {
        // Fallback: use first question even if it's short
        shortAnswerQuestion = article.shortAnswerQuestions[0].question;
      }
    }

    // 10. Create vocab_match (shuffled definitions)
    const vocabMatch = vocab.map((v, i) => ({
      number: i + 1,
      word: v.word,
      letter: String.fromCharCode(97 + i), // a, b, c, d, e
      definition: v.definition,
    }));

    // Shuffle definitions for the matching game
    const shuffledDefinitions = [...vocab.map((v) => v.definition)];
    for (let i = shuffledDefinitions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledDefinitions[i], shuffledDefinitions[j]] = [
        shuffledDefinitions[j],
        shuffledDefinitions[i],
      ];
    }

    const vocabMatchShuffled = vocabMatch.map((vm, i) => ({
      ...vm,
      definition: shuffledDefinitions[i],
    }));

    // Create answer string for vocab_match
    const vocabMatchAnswerString = vocabMatch
      .map((vm) => {
        const correctLetter = String.fromCharCode(
          97 + shuffledDefinitions.indexOf(vm.definition),
        );
        return `${vm.number}-${correctLetter}`;
      })
      .join(", ");

    // 11. Create vocab_fill (fill in the blank sentences)
    // Create contextual sentences using the vocabulary words
    const vocabFill = vocab.slice(0, 4).map((v, i) => {
      // Find sentences in the article that contain this word
      const allSentences = enSentences
        .join(" ")
        .split(/[.!?]+/)
        .filter((s) => s.trim());
      const sentenceWithWord = allSentences.find((s) =>
        s.toLowerCase().includes(v.word.toLowerCase()),
      );

      let sentence = "";
      if (sentenceWithWord) {
        // Replace the word with a blank
        sentence =
          sentenceWithWord
            .trim()
            .replace(
              new RegExp(`\\b${v.word}\\b`, "i"),
              '<span class="blank"></span>',
            ) + ".";
      } else {
        // Fallback: create a generic sentence
        sentence = `A ${v.word} is <span class="blank"></span>.`;
      }

      return {
        number: i + 1,
        sentence: sentence,
      };
    });

    const vocabFillAnswerString = vocab
      .slice(0, 4)
      .map((v, i) => `${i + 1}. ${v.word}`)
      .join(", ");

    // 12. Create sentence_order_questions (from first 2 paragraphs)
    const sentenceOrderQuestions = paragraphs.slice(0, 2).map((p) => {
      const sentences = p.text.split(/[.!?]+/).filter((s) => s.trim());
      const firstSentence = sentences[0] || p.text;
      const words = firstSentence.trim().split(/\s+/);

      // Take complete sentence (up to 10 words for simplicity)
      const sentenceWords = words.slice(0, Math.min(10, words.length));

      // Shuffle the words
      const shuffled = [...sentenceWords];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return { words: shuffled };
    });

    const sentenceOrderAnswers = paragraphs.slice(0, 2).map((p, i) => {
      const sentences = p.text.split(/[.!?]+/).filter((s) => s.trim());
      const firstSentence = sentences[0] || p.text;
      const words = firstSentence.trim().split(/\s+/);
      const sentenceWords = words.slice(0, Math.min(10, words.length));

      return {
        number: i + 1,
        sentence: sentenceWords.join(" ") + ".",
      };
    });

    // 13. Create sentence_completion_prompts (use different sentences from each paragraph)
    const sentenceCompletionPrompts = paragraphs.slice(0, 3).map((p, i) => {
      const sentences = p.text.split(/[.!?]+/).filter((s) => s.trim());
      // Use different sentence for each paragraph (i-th sentence if available)
      const targetSentence =
        sentences[Math.min(i, sentences.length - 1)] || sentences[0] || "";
      const words = targetSentence.trim().split(/\s+/);

      // Cut at roughly half the sentence length (minimum 3 words, maximum 8 words)
      const cutPoint = Math.max(3, Math.min(8, Math.floor(words.length / 2)));
      const prompt = words.slice(0, cutPoint).join(" ");

      return {
        number: i + 1,
        prompt: prompt,
      };
    });

    // 14. Get writing prompt (validate it's a real question)
    let writingPrompt = "Write about what you learned from this article.";

    if (article.longAnswerQuestions.length > 0) {
      // Find a valid question (not just a single letter)
      const validLAQ = article.longAnswerQuestions.find(
        (q: any) => q.question.length > 5 && q.question.includes(" "),
      );

      if (validLAQ) {
        writingPrompt = validLAQ.question;
      } else {
        // Fallback: use first question even if it's short
        const firstQuestion = article.longAnswerQuestions[0].question;
        if (firstQuestion.length > 1) {
          writingPrompt = firstQuestion;
        }
      }
    }

    // 15. Build Workbook JSON
    const workbookData: WorkbookJSON = {
      lesson_number: "Lesson 1",
      lesson_title: article.title || "",
      level_name: `Level ${article.raLevel || 0}`,
      cefr_level: `CEFR ${article.cefrLevel || ""}`,
      article_type: article.type || "",
      genre: article.genre || "",
      vocabulary: vocab,
      article_image_url: [
        `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/images/${article.id}_1.png`,
        `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/images/${article.id}_2.png`,
        `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/images/${article.id}_3.png`,
      ],
      article_caption: article.summary || "Article Illustration",
      article_url: `https://app.reading-advantage.com/th/student/read/${article.id}`,
      article_paragraphs: paragraphs,
      comprehension_questions: compQuestions,
      short_answer_question: shortAnswerQuestion,
      sentence_starters: sentenceStarters,
      vocab_match: vocabMatchShuffled,
      vocab_fill: vocabFill,
      vocab_word_bank: vocab.map((v) => v.word),
      sentence_order_questions: sentenceOrderQuestions,
      sentence_completion_prompts: sentenceCompletionPrompts,
      writing_prompt: writingPrompt,
      mc_answers: mcAnswers,
      vocab_match_answer_string: vocabMatchAnswerString,
      vocab_fill_answer_string: vocabFillAnswerString,
      sentence_order_answers: sentenceOrderAnswers,
      translation_paragraphs: translationParagraphs,
    };

    return workbookData;
  } catch (error) {
    throw new Error("Failed to generate export workbook");
  }
};
