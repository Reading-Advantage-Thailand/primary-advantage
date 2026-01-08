-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('XP_TOTAL', 'XP_DAILY', 'XP_WEEKLY', 'ARTICLES_READ', 'READING_TIME', 'VOCABULARY', 'STREAK', 'CEFR_LEVEL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GoalPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RecurringPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "learning_goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "goal_type" "GoalType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target_value" DOUBLE PRECISION NOT NULL,
    "current_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "target_date" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" "GoalPriority" NOT NULL DEFAULT 'MEDIUM',
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_period" "RecurringPeriod",
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_milestones" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target_value" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL,
    "achieved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_progress_logs" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "previous_value" DOUBLE PRECISION NOT NULL,
    "new_value" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "activity_id" TEXT,
    "activity_type" "ActivityType",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_progress_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_notifications" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "is_noticed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learning_goals_user_id_status_idx" ON "learning_goals"("user_id", "status");

-- CreateIndex
CREATE INDEX "learning_goals_target_date_idx" ON "learning_goals"("target_date");

-- CreateIndex
CREATE INDEX "goal_milestones_goal_id_idx" ON "goal_milestones"("goal_id");

-- CreateIndex
CREATE INDEX "goal_progress_logs_goal_id_created_at_idx" ON "goal_progress_logs"("goal_id", "created_at");

-- CreateIndex
CREATE INDEX "assignment_notifications_student_id_is_noticed_idx" ON "assignment_notifications"("student_id", "is_noticed");

-- CreateIndex
CREATE INDEX "assignment_notifications_teacher_id_idx" ON "assignment_notifications"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_notifications_assignment_id_student_id_teacher_i_key" ON "assignment_notifications"("assignment_id", "student_id", "teacher_id");

-- AddForeignKey
ALTER TABLE "learning_goals" ADD CONSTRAINT "learning_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_milestones" ADD CONSTRAINT "goal_milestones_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "learning_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_progress_logs" ADD CONSTRAINT "goal_progress_logs_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "learning_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_notifications" ADD CONSTRAINT "assignment_notifications_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_notifications" ADD CONSTRAINT "assignment_notifications_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_notifications" ADD CONSTRAINT "assignment_notifications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
