// prisma/seed.ts
import { PrismaClient, ActivityType } from "@prisma/client";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import { LEVELS_XP } from "../lib/utils";

const prisma = new PrismaClient();

const CEFR_LEVELS = [
  "A0-",
  "A1-",
  "A1",
  "A1+",
  "A2-",
  "A2",
  "A2+",
  "B1-",
  "B1",
  "B1+",
];
const GENRES = [
  "Fiction",
  "Non-fiction",
  "Science",
  "History",
  "Adventure",
  "Mystery",
];
const SUB_GENRES = [
  "Fantasy",
  "Biography",
  "Technology",
  "World War",
  "Detective",
  "Exploration",
];

// Helper function to get level and CEFR level from XP
function getLevelAndCefrFromXP(xp: number) {
  const levelData = LEVELS_XP.find(
    (level) => xp >= level.min && xp <= level.max,
  );

  if (levelData) {
    return {
      level: levelData.raLevel,
      cefrLevel: levelData.cefrLevel,
    };
  }

  // If XP exceeds max, return highest level
  if (xp > LEVELS_XP[LEVELS_XP.length - 1].max) {
    return {
      level: LEVELS_XP[LEVELS_XP.length - 1].raLevel,
      cefrLevel: LEVELS_XP[LEVELS_XP.length - 1].cefrLevel,
    };
  }

  // Default to lowest level
  return {
    level: LEVELS_XP[0].raLevel,
    cefrLevel: LEVELS_XP[0].cefrLevel,
  };
}

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clean existing data (optional - remove if you want to keep existing data)
  console.log("🧹 Cleaning existing data...");
  await prisma.cardReview.deleteMany();
  await prisma.flashcardCard.deleteMany();
  await prisma.flashcardDeck.deleteMany();
  await prisma.assignmentStudent.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.userLessonProgress.deleteMany();
  await prisma.articleActivityLog.deleteMany();
  await prisma.sentencsAndWordsForFlashcard.deleteMany();
  await prisma.multipleChoiceQuestion.deleteMany();
  await prisma.shortAnswerQuestion.deleteMany();
  await prisma.longAnswerQuestion.deleteMany();
  await prisma.article.deleteMany();
  await prisma.classroomStudent.deleteMany();
  await prisma.classroomTeachers.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.xPLogs.deleteMany();
  await prisma.userActivity.deleteMany();
  await prisma.schoolAdmins.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.license.deleteMany();
  await prisma.school.deleteMany();
  await prisma.role.deleteMany();

  // 1. Create Roles
  console.log("👥 Creating roles...");
  const userRole = await prisma.role.create({
    data: { name: "user" },
  });
  const studentRole = await prisma.role.create({
    data: { name: "student" },
  });
  const teacherRole = await prisma.role.create({
    data: { name: "teacher" },
  });
  const adminRole = await prisma.role.create({
    data: { name: "admin" },
  });
  const systemRole = await prisma.role.create({
    data: { name: "system" },
  });

  console.log("✅ Roles created");

  // 2. Create Schools
  console.log("🏫 Creating schools...");
  const schools = await Promise.all([
    prisma.school.create({
      data: {
        name: "Bangkok International School",
        contactName: "John Smith",
        contactEmail: "john@bis.ac.th",
      },
    }),
    prisma.school.create({
      data: {
        name: "Chiang Mai Primary School",
        contactName: "Sarah Johnson",
        contactEmail: "sarah@cmps.ac.th",
      },
    }),
    prisma.school.create({
      data: {
        name: "Phuket Learning Center",
        contactName: "Michael Brown",
        contactEmail: "michael@plc.ac.th",
      },
    }),
  ]);

  console.log(`✅ Created ${schools.length} schools`);

  // 3. Create Licenses
  console.log("📜 Creating licenses...");
  const licenses = await Promise.all(
    schools.map((school, index) =>
      prisma.license.create({
        data: {
          key: `LICENSE-${faker.string.alphanumeric(10).toUpperCase()}`,
          name: `${school.name} License`,
          description: `License for ${school.name}`,
          subscription:
            index === 0 ? "ENTERPRISE" : index === 1 ? "PREMIUM" : "BASIC",
          maxUsers: index === 0 ? 1000 : index === 1 ? 500 : 100,
          startDate: new Date(),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          status: "active",
          schoolId: school.id,
        },
      }),
    ),
  );

  console.log(`✅ Created ${licenses.length} licenses`);

  // 4. Create System Admin
  console.log("🔐 Creating system admin...");
  const hashedPassword = await bcrypt.hash("asdfasdf", 10);

  const systemAdminXp = 180000; // High XP for system admin
  const systemAdminLevelData = getLevelAndCefrFromXP(systemAdminXp);

  const systemAdmin = await prisma.user.create({
    data: {
      name: "System Administrator",
      email: "admin@primaryadvantage.com",
      password: hashedPassword,
      cefrLevel: systemAdminLevelData.cefrLevel,
      level: systemAdminLevelData.level,
      xp: systemAdminXp,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: systemAdmin.id,
      roleId: systemRole.id,
    },
  });

  console.log("✅ System admin created");

  // 5. Create Teachers, Admins, and Students for each school
  const allTeachers: any[] = [];
  const allStudents: any[] = [];

  for (const school of schools) {
    console.log(`👨‍🏫 Creating users for ${school.name}...`);

    // Create School Admin
    const schoolAdminXp = faker.number.int({ min: 95000, max: 160000 }); // B1 to B2 range
    const schoolAdminLevelData = getLevelAndCefrFromXP(schoolAdminXp);

    const schoolAdmin = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        password: hashedPassword,
        cefrLevel: schoolAdminLevelData.cefrLevel,
        level: schoolAdminLevelData.level,
        xp: schoolAdminXp,
        schoolId: school.id,
      },
    });

    await prisma.userRole.create({
      data: { userId: schoolAdmin.id, roleId: adminRole.id },
    });

    await prisma.schoolAdmins.create({
      data: {
        schoolId: school.id,
        userId: schoolAdmin.id,
      },
    });

    // Create Teachers (5 per school)
    const teachers = await Promise.all(
      Array.from({ length: 5 }).map(async () => {
        const teacherXp = faker.number.int({ min: 68000, max: 142000 }); // A2+ to B2- range
        const teacherLevelData = getLevelAndCefrFromXP(teacherXp);

        const teacher = await prisma.user.create({
          data: {
            name: faker.person.fullName(),
            email: faker.internet.email().toLowerCase(),
            password: hashedPassword,
            cefrLevel: teacherLevelData.cefrLevel,
            level: teacherLevelData.level,
            xp: teacherXp,
            schoolId: school.id,
          },
        });

        await prisma.userRole.create({
          data: { userId: teacher.id, roleId: teacherRole.id },
        });

        return teacher;
      }),
    );

    allTeachers.push(...teachers);

    // Create Students (20 per school)
    const students = await Promise.all(
      Array.from({ length: 20 }).map(async () => {
        const studentXp = faker.number.int({ min: 0, max: 67000 }); // A0- to A2 range
        const studentLevelData = getLevelAndCefrFromXP(studentXp);

        const student = await prisma.user.create({
          data: {
            name: faker.person.fullName(),
            email: faker.internet.email().toLowerCase(),
            password: hashedPassword,
            cefrLevel: studentLevelData.cefrLevel,
            level: studentLevelData.level,
            xp: studentXp,
            schoolId: school.id,
          },
        });

        await prisma.userRole.create({
          data: { userId: student.id, roleId: studentRole.id },
        });

        return student;
      }),
    );

    allStudents.push(...students);
    console.log(`✅ Created users for ${school.name}`);
  }

  // 6. Create Classrooms
  console.log("🎓 Creating classrooms...");
  const classrooms = [];

  for (const school of schools) {
    const schoolTeachers = allTeachers.filter((t) => t.schoolId === school.id);
    const schoolStudents = allStudents.filter((s) => s.schoolId === school.id);

    // Create 3 classrooms per school
    for (let i = 0; i < 3; i++) {
      const classroom = await prisma.classroom.create({
        data: {
          name: `Grade ${i + 3} - Class ${String.fromCharCode(65 + i)}`,
          classCode: faker.string.alphanumeric(6).toUpperCase(),
          grade: `${i + 3}`,
          passwordStudents: "student123",
          schoolId: school.id,
        },
      });

      // Assign 1-2 teachers to classroom
      const numTeachers = faker.number.int({ min: 1, max: 2 });
      const selectedTeachers = faker.helpers.arrayElements(
        schoolTeachers,
        numTeachers,
      );

      for (const teacher of selectedTeachers) {
        await prisma.classroomTeachers.create({
          data: {
            classroomId: classroom.id,
            userId: teacher.id,
          },
        });
      }

      // Assign 5-8 students to classroom
      const numStudents = faker.number.int({ min: 5, max: 8 });
      const selectedStudents = faker.helpers.arrayElements(
        schoolStudents,
        numStudents,
      );

      for (const student of selectedStudents) {
        await prisma.classroomStudent.create({
          data: {
            classroomId: classroom.id,
            studentId: student.id,
          },
        });
      }

      classrooms.push(classroom);
    }
  }

  console.log(`✅ Created ${classrooms.length} classrooms`);

  // 7. Create Articles with Questions
  console.log("📚 Creating articles...");
  const articles = await Promise.all(
    Array.from({ length: 30 }).map(async () => {
      const cefrLevel = faker.helpers.arrayElement(CEFR_LEVELS);
      const genre = faker.helpers.arrayElement(GENRES);
      const subGenre = faker.helpers.arrayElement(SUB_GENRES);

      const article = await prisma.article.create({
        data: {
          type: faker.helpers.arrayElement(["story", "article", "news"]),
          genre,
          subGenre,
          title: faker.lorem.sentence(),
          summary: faker.lorem.paragraph(),
          passage: faker.lorem.paragraphs(5),
          imageDescription: faker.lorem.sentence(),
          cefrLevel,
          raLevel: faker.number.int({ min: 1, max: 10 }),
          rating: faker.number.float({ min: 3, max: 5, fractionDigits: 1 }),
          isApproved: true,
          isPublished: true,
          isDraft: false,
          words: JSON.stringify(
            Array.from({ length: 10 }).map(() => ({
              word: faker.word.noun(),
              definition: faker.lorem.sentence(),
              translation: {
                th: faker.word.noun(),
                vi: faker.word.noun(),
              },
            })),
          ),
          sentences: JSON.stringify(
            Array.from({ length: 5 }).map(() => ({
              text: faker.lorem.sentence(),
              translation: {
                th: faker.lorem.sentence(),
                vi: faker.lorem.sentence(),
              },
            })),
          ),
        },
      });

      // Create Multiple Choice Questions
      await Promise.all(
        Array.from({ length: 3 }).map(() =>
          prisma.multipleChoiceQuestion.create({
            data: {
              question: faker.lorem.sentence() + "?",
              options: Array.from({ length: 4 }).map(() =>
                faker.lorem.words(3),
              ),
              answer: faker.lorem.words(3),
              textualEvidence: faker.lorem.sentence(),
              articleId: article.id,
            },
          }),
        ),
      );

      // Create Short Answer Questions
      await Promise.all(
        Array.from({ length: 2 }).map(() =>
          prisma.shortAnswerQuestion.create({
            data: {
              question: faker.lorem.sentence() + "?",
              answer: faker.lorem.sentence(),
              articleId: article.id,
            },
          }),
        ),
      );

      // Create Long Answer Question
      await prisma.longAnswerQuestion.create({
        data: {
          question: faker.lorem.sentence() + "?",
          articleId: article.id,
        },
      });

      return article;
    }),
  );

  console.log(`✅ Created ${articles.length} articles with questions`);

  // 8. Create User Activities and XP Logs with diverse times and types
  console.log("📊 Creating user activities with diverse times and types...");

  // Activity types with their typical XP ranges
  const activityTypes: Array<{
    type: ActivityType;
    xpRange: [number, number];
    timerRange: [number, number];
  }> = [
    {
      type: ActivityType.ARTICLE_READ,
      xpRange: [20, 50],
      timerRange: [300, 1800],
    },
    {
      type: ActivityType.ARTICLE_RATING,
      xpRange: [5, 10],
      timerRange: [10, 30],
    },
    {
      type: ActivityType.MC_QUESTION,
      xpRange: [10, 20],
      timerRange: [60, 300],
    },
    {
      type: ActivityType.SA_QUESTION,
      xpRange: [15, 30],
      timerRange: [120, 600],
    },
    {
      type: ActivityType.LA_QUESTION,
      xpRange: [20, 40],
      timerRange: [300, 900],
    },
    {
      type: ActivityType.SENTENCE_FLASHCARDS,
      xpRange: [15, 25],
      timerRange: [180, 600],
    },
    {
      type: ActivityType.VOCABULARY_FLASHCARDS,
      xpRange: [15, 25],
      timerRange: [180, 600],
    },
    {
      type: ActivityType.SENTENCE_MATCHING,
      xpRange: [10, 20],
      timerRange: [120, 480],
    },
    {
      type: ActivityType.SENTENCE_ORDERING,
      xpRange: [10, 20],
      timerRange: [120, 480],
    },
    {
      type: ActivityType.SENTENCE_WORD_ORDERING,
      xpRange: [12, 22],
      timerRange: [150, 500],
    },
    {
      type: ActivityType.SENTENCE_CLOZE_TEST,
      xpRange: [12, 22],
      timerRange: [150, 500],
    },
    {
      type: ActivityType.VOCABULARY_MATCHING,
      xpRange: [10, 20],
      timerRange: [120, 480],
    },
  ];

  // Generate activities for each student over the past 90 days
  const now = new Date();
  const daysToGenerate = 90;

  for (const student of allStudents) {
    // Each student gets 10-50 activities spread over 90 days
    const numActivities = faker.number.int({ min: 10, max: 50 });

    // Select random articles for this student
    const studentArticles = faker.helpers.arrayElements(
      articles,
      faker.number.int({ min: 5, max: 15 }),
    );

    // Create article activity logs first
    for (const article of studentArticles) {
      const daysAgo = faker.number.int({ min: 1, max: daysToGenerate });
      const activityDate = new Date(now);
      activityDate.setDate(activityDate.getDate() - daysAgo);

      // Random time of day (6am to 10pm)
      const hours = faker.number.int({ min: 6, max: 22 });
      const minutes = faker.number.int({ min: 0, max: 59 });
      const seconds = faker.number.int({ min: 0, max: 59 });
      activityDate.setHours(hours, minutes, seconds);

      await prisma.articleActivityLog.create({
        data: {
          userId: student.id,
          articleId: article.id,
          isRead: faker.datatype.boolean({ probability: 0.8 }),
          isMultipleChoiceQuestionCompleted: faker.datatype.boolean({
            probability: 0.6,
          }),
          isShortAnswerQuestionCompleted: faker.datatype.boolean({
            probability: 0.4,
          }),
          isLongAnswerQuestionCompleted: faker.datatype.boolean({
            probability: 0.3,
          }),
          isRated: faker.datatype.boolean({ probability: 0.5 }),
          isSentenceAndWordsSaved: faker.datatype.boolean({ probability: 0.5 }),
          isSentenceMatchingCompleted: faker.datatype.boolean({
            probability: 0.4,
          }),
          isSentenceOrderingCompleted: faker.datatype.boolean({
            probability: 0.4,
          }),
          isSentenceWordOrderingCompleted: faker.datatype.boolean({
            probability: 0.3,
          }),
          isSentenceClozeTestCompleted: faker.datatype.boolean({
            probability: 0.3,
          }),
          createdAt: activityDate,
          updatedAt: activityDate,
        },
      });
    }

    // Generate diverse activities over time
    for (let i = 0; i < numActivities; i++) {
      // Random day in the past 90 days
      const daysAgo = faker.number.int({ min: 0, max: daysToGenerate });
      const activityDate = new Date(now);
      activityDate.setDate(activityDate.getDate() - daysAgo);

      // Random time of day (6am to 11pm)
      const hours = faker.number.int({ min: 6, max: 23 });
      const minutes = faker.number.int({ min: 0, max: 59 });
      const seconds = faker.number.int({ min: 0, max: 59 });
      activityDate.setHours(hours, minutes, seconds);

      // Select random activity type
      const activityConfig = faker.helpers.arrayElement(activityTypes);
      const isCompleted = faker.datatype.boolean({ probability: 0.85 });

      // Random article for this activity
      const article = faker.helpers.arrayElement(studentArticles);

      // Create user activity with timestamp
      const activity = await prisma.userActivity.create({
        data: {
          userId: student.id,
          activityType: activityConfig.type as string as ActivityType,
          targetId: article.id,
          timer: faker.number.int({
            min: activityConfig.timerRange[0],
            max: activityConfig.timerRange[1],
          }),
          completed: isCompleted,
          createdAt: activityDate,
          updatedAt: activityDate,
        },
      });

      // Create XP log only if activity is completed
      if (isCompleted) {
        const xpEarned = faker.number.int({
          min: activityConfig.xpRange[0],
          max: activityConfig.xpRange[1],
        });

        await prisma.xPLogs.create({
          data: {
            userId: student.id,
            xpEarned,
            activityType: activityConfig.type as string as ActivityType,
            activityId: activity.id,
            createdAt: activityDate,
            updatedAt: activityDate,
          },
        });
      }

      // Add some delay pattern - more activities during certain times
      // Weekdays tend to have more activities
      const dayOfWeek = activityDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (!isWeekend && faker.datatype.boolean({ probability: 0.3 })) {
        // Add bonus activity during weekdays
        const bonusActivity = faker.helpers.arrayElement(activityTypes);
        const bonusDate = new Date(activityDate);
        bonusDate.setHours(
          bonusDate.getHours() + faker.number.int({ min: 1, max: 4 }),
        );

        const bonusActivityCompleted = faker.datatype.boolean({
          probability: 0.8,
        });

        const bonusUserActivity = await prisma.userActivity.create({
          data: {
            userId: student.id,
            activityType: bonusActivity.type,
            targetId: article.id,
            timer: faker.number.int({
              min: bonusActivity.timerRange[0],
              max: bonusActivity.timerRange[1],
            }),
            completed: bonusActivityCompleted,
            createdAt: bonusDate,
            updatedAt: bonusDate,
          },
        });

        if (bonusActivityCompleted) {
          const bonusXp = faker.number.int({
            min: bonusActivity.xpRange[0],
            max: bonusActivity.xpRange[1],
          });

          await prisma.xPLogs.create({
            data: {
              userId: student.id,
              xpEarned: bonusXp,
              activityType: bonusActivity.type,
              activityId: bonusUserActivity.id,
              createdAt: bonusDate,
              updatedAt: bonusDate,
            },
          });
        }
      }
    }
  }

  console.log("✅ Created diverse user activities and XP logs across 90 days");

  // Update lastActiveAt for all students based on their latest activity
  console.log("⏰ Updating lastActiveAt for users...");
  for (const student of allStudents) {
    const latestActivity = await prisma.userActivity.findFirst({
      where: { userId: student.id },
      orderBy: { createdAt: "desc" },
    });

    if (latestActivity) {
      await prisma.user.update({
        where: { id: student.id },
        data: { lastActiveAt: latestActivity.createdAt },
      });
    }
  }

  // Update lastActiveAt for teachers (random recent date)
  for (const teacher of allTeachers) {
    const daysAgo = faker.number.int({ min: 0, max: 7 });
    const lastActive = new Date(now);
    lastActive.setDate(lastActive.getDate() - daysAgo);
    lastActive.setHours(
      faker.number.int({ min: 8, max: 18 }),
      faker.number.int({ min: 0, max: 59 }),
      faker.number.int({ min: 0, max: 59 }),
    );

    await prisma.user.update({
      where: { id: teacher.id },
      data: { lastActiveAt: lastActive },
    });
  }

  // Update lastActiveAt for school admins
  const schoolAdmins = await prisma.user.findMany({
    where: {
      roles: {
        some: {
          role: {
            name: "admin",
          },
        },
      },
    },
  });

  for (const admin of schoolAdmins) {
    const daysAgo = faker.number.int({ min: 0, max: 5 });
    const lastActive = new Date(now);
    lastActive.setDate(lastActive.getDate() - daysAgo);
    lastActive.setHours(
      faker.number.int({ min: 8, max: 18 }),
      faker.number.int({ min: 0, max: 59 }),
      faker.number.int({ min: 0, max: 59 }),
    );

    await prisma.user.update({
      where: { id: admin.id },
      data: { lastActiveAt: lastActive },
    });
  }

  // Update lastActiveAt for system admin
  await prisma.user.update({
    where: { id: systemAdmin.id },
    data: { lastActiveAt: new Date() },
  });

  console.log("✅ Updated lastActiveAt for all users");

  // 9. Create Flashcard Decks and Cards
  console.log("🎴 Creating flashcards...");

  for (const student of allStudents.slice(0, 20)) {
    // Create vocabulary deck
    const vocabDeck = await prisma.flashcardDeck.create({
      data: {
        userId: student.id,
        name: "My Vocabulary",
        type: "VOCABULARY",
        description: "My vocabulary collection",
      },
    });

    // Create vocabulary cards
    await Promise.all(
      Array.from({ length: 20 }).map(() =>
        prisma.flashcardCard.create({
          data: {
            deckId: vocabDeck.id,
            type: "VOCABULARY",
            word: faker.word.noun(),
            definition: JSON.stringify({
              en: faker.lorem.sentence(),
              th: faker.lorem.sentence(),
            }),
            articleId: faker.helpers.arrayElement(articles).id,
            due: faker.date.future(),
            stability: faker.number.float({ min: 0, max: 10 }),
            difficulty: faker.number.float({ min: 0, max: 10 }),
            state: faker.helpers.arrayElement(["NEW", "LEARNING", "REVIEW"]),
          },
        }),
      ),
    );

    // Create sentence deck
    const sentenceDeck = await prisma.flashcardDeck.create({
      data: {
        userId: student.id,
        name: "My Sentences",
        type: "SENTENCE",
        description: "My sentence collection",
      },
    });

    // Create sentence cards
    await Promise.all(
      Array.from({ length: 15 }).map(() =>
        prisma.flashcardCard.create({
          data: {
            deckId: sentenceDeck.id,
            type: "SENTENCE",
            sentence: faker.lorem.sentence(),
            translation: JSON.stringify({
              th: faker.lorem.sentence(),
              vi: faker.lorem.sentence(),
            }),
            articleId: faker.helpers.arrayElement(articles).id,
            due: faker.date.future(),
            stability: faker.number.float({ min: 0, max: 10 }),
            difficulty: faker.number.float({ min: 0, max: 10 }),
            state: faker.helpers.arrayElement(["NEW", "LEARNING", "REVIEW"]),
          },
        }),
      ),
    );
  }

  console.log("✅ Created flashcard decks and cards");

  // 10. Create Assignments
  console.log("📝 Creating assignments...");

  for (const classroom of classrooms) {
    const classroomTeachers = await prisma.classroomTeachers.findMany({
      where: { classroomId: classroom.id },
      include: { user: true },
    });

    const classroomStudents = await prisma.classroomStudent.findMany({
      where: { classroomId: classroom.id },
    });

    if (classroomTeachers.length > 0 && classroomStudents.length > 0) {
      const teacher = classroomTeachers[0].user;
      const assignmentArticles = faker.helpers.arrayElements(articles, 3);

      for (const article of assignmentArticles) {
        const assignment = await prisma.assignment.create({
          data: {
            name: `Read: ${article.title}`,
            description: `Complete the reading assignment for ${article.title}`,
            classroomId: classroom.id,
            articleId: article.id,
            teacherId: teacher.id,
            teacherName: teacher.name || "Teacher",
            dueDate: faker.date.future(),
          },
        });

        // Assign to students
        for (const classroomStudent of classroomStudents) {
          const status = faker.helpers.arrayElement([
            "NOT_STARTED",
            "IN_PROGRESS",
            "COMPLETED",
          ]);

          await prisma.assignmentStudent.create({
            data: {
              assignmentId: assignment.id,
              studentId: classroomStudent.studentId,
              score:
                status === "COMPLETED"
                  ? faker.number.int({ min: 0, max: 100 })
                  : null,
              status,
              startedAt: status !== "NOT_STARTED" ? faker.date.past() : null,
              completedAt: status === "COMPLETED" ? faker.date.recent() : null,
            },
          });

          // Create progress if started
          if (status !== "NOT_STARTED") {
            await prisma.userLessonProgress.create({
              data: {
                userId: classroomStudent.studentId,
                articleId: article.id,
                assignmentId: assignment.id,
                score:
                  status === "COMPLETED"
                    ? faker.number.int({ min: 0, max: 100 })
                    : null,
                progress:
                  status === "COMPLETED"
                    ? 100
                    : faker.number.int({ min: 10, max: 90 }),
                timeSpent: faker.number.int({ min: 300, max: 3600 }),
                isCompleted: status === "COMPLETED",
              },
            });
          }
        }
      }
    }
  }

  console.log("✅ Created assignments");

  // Summary
  const totalActivities = await prisma.userActivity.count();
  const totalXPLogs = await prisma.xPLogs.count();
  const totalFlashcards = await prisma.flashcardCard.count();
  const totalAssignments = await prisma.assignment.count();

  console.log("\n🎉 Database seeding completed!");
  console.log("=".repeat(50));
  console.log(`📊 Summary:`);
  console.log(`  - Roles: 5`);
  console.log(`  - Schools: ${schools.length}`);
  console.log(`  - Licenses: ${licenses.length}`);
  console.log(`  - Teachers: ${allTeachers.length}`);
  console.log(`  - Students: ${allStudents.length}`);
  console.log(`  - Classrooms: ${classrooms.length}`);
  console.log(`  - Articles: ${articles.length}`);
  console.log(`  - User Activities: ${totalActivities} (12 diverse types)`);
  console.log(`  - XP Logs: ${totalXPLogs}`);
  console.log(`  - Flashcard Cards: ${totalFlashcards}`);
  console.log(`  - Assignments: ${totalAssignments}`);
  console.log(
    `  - Total Users: ${allTeachers.length + allStudents.length + schools.length + 1}`,
  );
  console.log("=".repeat(50));
  console.log(`⏰ Time Range:`);
  console.log(`  - Activities spread across 90 days`);
  console.log(`  - Daily activities: 6 AM - 11 PM`);
  console.log(`  - More activities on weekdays`);
  console.log(`  - lastActiveAt set based on latest user activity`);
  console.log("=".repeat(50));
  console.log(`📈 XP & Level System:`);
  console.log(`  - XP ranges from LEVELS_XP (lib/utils.ts)`);
  console.log(`  - Students: 0-67,000 XP (A0- to A2)`);
  console.log(`  - Teachers: 68,000-142,000 XP (A2+ to B2-)`);
  console.log(`  - Admins: 95,000-160,000 XP (B1 to B2)`);
  console.log(`  - System Admin: 180,000 XP (B2+)`);
  console.log("=".repeat(50));
  console.log("\n🔑 Login credentials:");
  console.log(`  System Admin: admin@primaryadvantage.com`);
  console.log(`  Password (all users): asdfasdf`);
  console.log("=".repeat(50));
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
