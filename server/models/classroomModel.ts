import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { addDays } from "date-fns";
import { currentUser } from "@/lib/session";

export const createClassCode = async (
  classrooomId: string,
  classCode: string
) => {
  try {
    const expiresAt = addDays(new Date(), 1);

    const classroom = await prisma.classroom.findUnique({
      where: { id: classrooomId },
      select: { id: true, name: true },
    });

    if (!classroom) {
      return NextResponse.json(
        { error: "Classroom not found" },
        { status: 404 }
      );
    }

    if (classroom) {
      // Update the existing classroom's expiration date
      return await prisma.classroom.update({
        where: { id: classrooomId },
        data: { classCode, codeExpiresAt: expiresAt },
      });
    }
  } catch (error) {
    throw new Error("Failed to generate or update classroom code");
  }
};

export const createClassroom = async (classroomName: string) => {
  try {
    const userId = await currentUser();
    return await prisma.classroom.create({
      data: { name: classroomName, teacherId: userId?.id as string },
    });
  } catch (error) {
    throw new Error("Failed to create classroom");
  }
};

export const updateStudentClassroom = async () => {
  try {
    // const result = await prisma.classroomStudent.create({
    //   data: {
    //     studentId: "cmay4pbkc0000tiwx5ii3jsp2",
    //     classroomId: "cmawoh7kh0001ti9765m2qr7c",
    //   },
    // });
    // console.log(result);
  } catch (error) {
    throw new Error("error updateStudentClassroom");
  }
};

export const getClassroomStudentForLogin = async (code: string) => {
  try {
    //check code
    const checkCode = await prisma.classroom.findUnique({
      where: {
        classCode: code,
      },
      select: { id: true, classCode: true, codeExpiresAt: true },
    });

    if (!checkCode) {
      return NextResponse.json(
        { error: "Invalid Classroom Code" },
        { status: 404 }
      );
    }

    if (checkCode.codeExpiresAt && new Date() > checkCode.codeExpiresAt) {
      return NextResponse.json(
        { error: "Classroom code has expired" },
        { status: 410 } // 410 Gone = valid but expired
      );
    }

    const studentInClass = await prisma.classroomStudent.findMany({
      where: {
        classroomId: checkCode?.id,
      },
      include: {
        student: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return NextResponse.json({ students: studentInClass }, { status: 200 });
  } catch (error) {
    throw new Error("error getClassroomStudentForLogin");
  }
};
