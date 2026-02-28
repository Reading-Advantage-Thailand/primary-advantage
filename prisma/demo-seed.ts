import { prisma } from "@/lib/prisma";
import {
  DEMO_ACCOUNTS,
  DEMO_CLASSROOMS,
  DEMO_LICENSE_KEY,
  DEMO_SCHOOL_INFO,
} from "@/configs/demo-account-seed";
import { ActivityType } from "@prisma/client";
import { auth } from "@/lib/auth";

export const resetDemoDateSeed = async () => {
  try {
    // Placeholder for resetting demo data seed
    console.log("Resetting demo data seed...");

    // Delete existing demo users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            ...DEMO_ACCOUNTS.students.map((s) => s.email),
            DEMO_ACCOUNTS.teachers.email,
            DEMO_ACCOUNTS.admin.email,
          ],
        },
      },
    });

    let school = await prisma.school.findFirst({
      where: { name: DEMO_SCHOOL_INFO.name },
      select: { id: true },
    });

    if (!school) {
      school = await prisma.school.create({
        data: {
          name: DEMO_SCHOOL_INFO.name,
          contactName: DEMO_SCHOOL_INFO.contactName,
          contactEmail: DEMO_SCHOOL_INFO.contactEmail,
        },
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.license.upsert({
        where: { key: DEMO_LICENSE_KEY },
        update: {
          startDate: new Date(),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
        create: {
          key: DEMO_LICENSE_KEY,
          name: `${DEMO_SCHOOL_INFO.name} License`,
          subscription: "ENTERPRISE",
          maxUsers: 100,
          startDate: new Date(),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          status: "active",
          schoolId: school.id,
        },
      });

      const classroom = await tx.classroom.upsert({
        where: { classCode: DEMO_CLASSROOMS.classCode },
        update: {},
        create: {
          name: DEMO_CLASSROOMS.name,
          classCode: DEMO_CLASSROOMS.classCode,
          passwordStudents: DEMO_CLASSROOMS.passwordStudents,
          schoolId: school.id,
        },
      });

      const [roleStudent, roleTeacher, roleAdmin] = await Promise.all([
        tx.role.findFirst({
          where: { name: "student" },
          select: { id: true },
        }),
        tx.role.findFirst({
          where: { name: "teacher" },
          select: { id: true },
        }),
        tx.role.findFirst({
          where: { name: "admin" },
          select: { id: true },
        }),
      ]);

      if (!roleStudent || !roleTeacher || !roleAdmin) {
        throw new Error("Required roles are missing in the database.");
      }

      const teacher = await auth.api.createUser({
        body: {
          email: DEMO_ACCOUNTS.teachers.email,
          password: DEMO_ACCOUNTS.teachers.password,
          name: DEMO_ACCOUNTS.teachers.name,
          data: {
            role: "teacher",
            schoolId: school.id,
            roleId: roleTeacher.id,
          },
        },
      });

      const admin = await auth.api.createUser({
        body: {
          email: DEMO_ACCOUNTS.admin.email,
          password: DEMO_ACCOUNTS.admin.password,
          name: DEMO_ACCOUNTS.admin.name,
          data: {
            role: "admin",
            schoolId: school.id,
            roleId: roleAdmin.id,
          },
        },
      });

      const allStudents: any[] = [];

      for (const studentData of DEMO_ACCOUNTS.students) {
        const student = await tx.user.upsert({
          where: { email: studentData.email },
          update: {
            email: studentData.email,
            name: studentData.name,
          },
          create: {
            email: studentData.email,
            name: studentData.name,
            xp: studentData.xp,
            cefrLevel: studentData.cefrLevel,
            level: studentData.raLevel,
            schoolId: school.id,
            role: "student",
            roleId: roleStudent?.id!,
          },
        });
        allStudents.push(student);
      }

      await Promise.all([
        await tx.classroomTeachers.create({
          data: {
            classroomId: classroom.id,
            userId: teacher.user.id,
          },
        }),
        await tx.schoolAdmins.create({
          data: {
            schoolId: school.id,
            userId: admin.user.id,
          },
        }),
      ]);

      const deck: any[] = [];

      for (const student of allStudents) {
        await tx.classroomStudent.create({
          data: {
            classroomId: classroom.id,
            studentId: student.id,
          },
        });
        const deckSentence = await tx.flashcardDeck.create({
          data: {
            userId: student.id,
            type: "SENTENCE",
          },
        });
        const deckVocabulary = await tx.flashcardDeck.create({
          data: {
            userId: student.id,
            type: "VOCABULARY",
          },
        });

        deck.push({
          studentId: student.id,
          deckSentenceId: deckSentence.id,
          deckVocabularyId: deckVocabulary.id,
        });
      }

      // flashcard sets, assignments, etc. can be added here similarly
      const aticles = await tx.article.findMany({
        select: { id: true, sentencsAndWordsForFlashcard: true },
        take: 3,
      });

      for (const d of deck) {
        for (const article of aticles) {
          const flashcardData = article
            .sentencsAndWordsForFlashcard[0] as Record<string, any> | null;
          const sentences = (flashcardData?.sentence as any[] | null) ?? [];
          const words = (flashcardData?.words as any[] | null) ?? [];

          for (const [index, sentence] of sentences.entries()) {
            const startTime = sentence.timeSeconds ?? 0;
            const nextSentence = sentences[index + 1];
            const endTime = nextSentence?.timeSeconds ?? startTime + 10;

            await tx.flashcardCard.create({
              data: {
                articleId: article.id,
                deckId: d.deckSentenceId,
                type: "SENTENCE",
                sentence: sentence.sentence,
                translation: sentence.translation,
                audioUrl: flashcardData?.audioSentencesUrl,
                startTime,
                endTime,
              },
            });
          }

          for (const [index, word] of words.entries()) {
            const startTime = word.timeSeconds ?? 0;
            const nextWord = words[index + 1];
            const endTime = nextWord?.timeSeconds ?? startTime + 10;

            await tx.flashcardCard.create({
              data: {
                articleId: article.id,
                deckId: d.deckVocabularyId,
                type: "VOCABULARY",
                word: word.vocabulary,
                definition: word.definition,
                audioUrl: flashcardData?.wordsUrl,
                startTime,
                endTime,
              },
            });
          }
        }
      }

      // lesson activities and other related demo data
      for (const student of allStudents) {
        const readCount = Math.floor(Math.random() * 10) + 1;
        for (let i = 0; i < readCount; i++) {
          const count = await tx.article.count();
          const article = await tx.article.findFirst({
            select: { id: true },
            skip: Math.floor(Math.random() * count),
          });
          if (!article) continue;
          const step = Math.floor(Math.random() * 14) + 1;
          const progress = Math.round((step / 14) * 100);

          await tx.userLessonProgress.create({
            data: {
              userId: student.id,
              articleId: article.id,
              isCompleted: progress === 100,
              timeSpent: Math.floor(Math.random() * 2700) + 100,
              progress,
            },
          });
        }
      }

      // activity logs can also be seeded here if needed
      for (let dayOffSet = 0; dayOffSet < 7; dayOffSet++) {
        const date = new Date();
        date.setDate(date.getDate() - dayOffSet);
        date.setHours(
          Math.floor(Math.random() * 12) + 8,
          Math.floor(Math.random() * 60),
          0,
          0,
        );
        for (const student of allStudents) {
          const activitiesCount = Math.floor(Math.random() * 5) + 1;
          const xpGainedPerActivity = Math.floor(Math.random() * 20) + 10;

          for (let i = 0; i < activitiesCount; i++) {
            const count = await tx.article.count();
            const article = await tx.article.findFirst({
              select: { id: true },
              skip: Math.floor(Math.random() * count),
            });
            if (!article) continue;
            const activityTypes = [
              ActivityType.ARTICLE_READ,
              ActivityType.LA_QUESTION,
              ActivityType.MC_QUESTION,
              ActivityType.SA_QUESTION,
              ActivityType.SENTENCE_FLASHCARDS,
              ActivityType.VOCABULARY_FLASHCARDS,
            ];

            const activityType =
              activityTypes[Math.floor(Math.random() * activityTypes.length)];

            if (activityType === ActivityType.ARTICLE_READ) {
              await tx.articleActivityLog.create({
                data: {
                  userId: student.id,
                  articleId: article.id,
                  isRead: true,
                },
              });
            }

            await tx.userActivity.create({
              data: {
                userId: student.id,
                timer: Math.floor(Math.random() * 300) + 60,
                activityType,
                targetId: article.id,
                completed: true,
                createdAt: new Date(date.getTime() + i * 60000),
                xpLogs: {
                  create: {
                    userId: student.id,
                    activityType,
                    xpEarned: xpGainedPerActivity,
                  },
                },
              },
            });
          }
        }
      }
    });
    // Implement the logic to reset demo data in the database
    console.log("Demo data seed reset successfully.");
    return { success: true };
  } catch (error) {
    console.error("Error resetting demo data seed:", error);
    return { success: false, error };
  }
};
