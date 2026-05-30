// prisma/seed/aiProviderRegistry.ts
// Idempotent seed for the AI provider registry (Phase 1).
// Run as part of `prisma db seed` or standalone via `bunx tsx prisma/seed/aiProviderRegistry.ts`.

import { AiCapability, AiProviderKind, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedAiProviderRegistry() {
  // ── 1. Providers ────────────────────────────────────────────────────────────

  const vertexProvider = await prisma.aiProvider.upsert({
    where: { name: "Vertex Default" },
    update: {},
    create: {
      name: "Vertex Default",
      kind: AiProviderKind.VERTEX,
      baseUrl: null,
      apiKeyRef: null, // Uses VERTEX_CLIENT_EMAIL / VERTEX_PRIVATE_KEY env vars
      enabled: true,
    },
  });

  const openaiProvider = await prisma.aiProvider.upsert({
    where: { name: "OpenAI Default" },
    update: {},
    create: {
      name: "OpenAI Default",
      kind: AiProviderKind.OPENAI,
      baseUrl: null,
      apiKeyRef: "env:OPENAI_API_KEY",
      enabled: true,
    },
  });

  // OpenRouter is pre-configured but non-functional until the Platform Owner
  // adds the "openrouter-api-key" secret to Google Secret Manager.
  await prisma.aiProvider.upsert({
    where: { name: "OpenRouter" },
    update: {},
    create: {
      name: "OpenRouter",
      kind: AiProviderKind.OPENAI_COMPATIBLE,
      baseUrl: "https://openrouter.ai/api/v1",
      apiKeyRef: "sm:openrouter-api-key",
      enabled: true,
    },
  });

  // ── 2. Task configs ──────────────────────────────────────────────────────────
  // Model IDs verified against generator source files in server/utils/genaretors/.
  // temperature and maxTokens are null — code-level settings remain in code
  // until explicitly overridden via the Admin UI.

  const taskConfigs: Array<{
    taskKey: string;
    providerId: string;
    modelId: string;
    capability: AiCapability;
  }> = [
    // article-generator.ts → google(googleModel)
    {
      taskKey: "article.generate",
      providerId: vertexProvider.id,
      modelId: "gemini-3-flash-preview",
      capability: AiCapability.TEXT,
    },
    // article-content-generator.ts → google(googleModelPro)
    {
      taskKey: "article.content",
      providerId: vertexProvider.id,
      modelId: "gemini-3.5-flash",
      capability: AiCapability.TEXT,
    },
    // story-generator.ts → google(googleModelPro) via `const aiModel = googleModelPro`
    {
      taskKey: "story.generate",
      providerId: vertexProvider.id,
      modelId: "gemini-3.5-flash",
      capability: AiCapability.TEXT,
    },
    // story-generator.ts evaluateStoryContent() — split from story.generate for independent temperature control
    {
      taskKey: "story.evaluate",
      providerId: vertexProvider.id,
      modelId: "gemini-3.5-flash",
      capability: AiCapability.TEXT,
    },
    // story-generator.ts generateStoryTopic() — split from story.generate for independent temperature control
    {
      taskKey: "story.topic",
      providerId: vertexProvider.id,
      modelId: "gemini-3.5-flash",
      capability: AiCapability.TEXT,
    },
    // image-generator.ts step 1 → google(googleModelLite) for scene-prompt text
    {
      taskKey: "image.scene-prompt",
      providerId: vertexProvider.id,
      modelId: "gemini-3.1-flash-lite",
      capability: AiCapability.TEXT,
    },
    // image-generator.ts step 2 → google(googleImage) for image generation
    // NOTE: code uses googleImage = "gemini-3.1-flash-image", NOT googleImageModel.
    // Seed table said "gemini-2.5-flash-image" (googleImageModel) — code is source of truth.
    // Discrepancy reported below.
    {
      taskKey: "image.generate",
      providerId: vertexProvider.id,
      modelId: "gemini-3.1-flash-image",
      capability: AiCapability.IMAGE,
    },
    // sentence-translator.ts → google(googleModelLite)
    {
      taskKey: "translation.sentence",
      providerId: vertexProvider.id,
      modelId: "gemini-3.1-flash-lite",
      capability: AiCapability.TEXT,
    },
    // summary-translator.ts → google(googleModelLite)
    {
      taskKey: "translation.summary",
      providerId: vertexProvider.id,
      modelId: "gemini-3.1-flash-lite",
      capability: AiCapability.TEXT,
    },
    // evaluate-rating-generator.ts → google(googleModelLite)
    {
      taskKey: "evaluation.rating",
      providerId: vertexProvider.id,
      modelId: "gemini-3.1-flash-lite",
      capability: AiCapability.TEXT,
    },
    // assistant.ts + storyAssistant.ts → google(googleModel)
    {
      taskKey: "qa.feedback",
      providerId: vertexProvider.id,
      modelId: "gemini-3-flash-preview",
      capability: AiCapability.TEXT,
    },
    // app/api/assistant/lesson-chatbot/route.ts → openai(openaiModel), streamText
    {
      taskKey: "chatbot.stream",
      providerId: openaiProvider.id,
      modelId: "gpt-4o-mini",
      capability: AiCapability.STREAMING,
    },
    // ai-generator.ts → openai(openaiModel)
    {
      taskKey: "insights.generate",
      providerId: openaiProvider.id,
      modelId: "gpt-4o-mini",
      capability: AiCapability.TEXT,
    },
    // topic-generator.ts → google(googleModel)
    {
      taskKey: "topic.generate",
      providerId: vertexProvider.id,
      modelId: "gemini-3-flash-preview",
      capability: AiCapability.TEXT,
    },
    // wordlist-generator.ts → google(googleModel)
    {
      taskKey: "wordlist.generate",
      providerId: vertexProvider.id,
      modelId: "gemini-3-flash-preview",
      capability: AiCapability.TEXT,
    },
    // question-generator.ts → google(googleModel)
    {
      taskKey: "question.generate",
      providerId: vertexProvider.id,
      modelId: "gemini-3-flash-preview",
      capability: AiCapability.TEXT,
    },
    // flashcard-content-generator.ts → google(googleModel)
    // NOTE: seed table said googleModelPro ("gemini-3.5-flash") — code uses googleModel.
    // Discrepancy reported below; code is source of truth.
    {
      taskKey: "flashcard.content",
      providerId: vertexProvider.id,
      modelId: "gemini-3-flash-preview",
      capability: AiCapability.TEXT,
    },
  ];

  for (const config of taskConfigs) {
    await prisma.aiTaskConfig.upsert({
      where: { taskKey: config.taskKey },
      update: {},
      create: {
        taskKey: config.taskKey,
        providerId: config.providerId,
        modelId: config.modelId,
        capability: config.capability,
        temperature: null,
      },
    });
  }

  console.log(
    `[aiProviderRegistry] seeded 3 providers and ${taskConfigs.length} task configs (including story.evaluate, story.topic)`,
  );
}

export { seedAiProviderRegistry };

// Allow running standalone: bunx tsx prisma/seed/aiProviderRegistry.ts
if (process.argv[1]?.endsWith("aiProviderRegistry.ts")) {
  seedAiProviderRegistry()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
