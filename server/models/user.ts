import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActivityType } from "@/types/enum";
import bcrypt from "bcrypt";

export const createUser = async (data: {
  name: string;
  email: string;
  password: string;
}) => {
  try {
    const existingUser = await getUserByEmail(data.email);

    if (existingUser) {
      return {
        error: "User already exists",
      };
    }

    const hashedPassword = bcrypt.hashSync(data.password, 10);

    await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
      },
    });
    return {
      success: "User created successfully",
    };
  } catch (error) {
    return {
      error: "Error creating user",
    };
  }
};

export const updateUserActivity = async (
  activityType: ActivityType,
  details: {
    responses?: string[];
    progress?: number[];
    timer: number;
  },
  targetId?: string,
  xpEarned?: number,
) => {
  try {
    const session = await auth();
    const userId = session?.user.id;

    if (!userId) {
      throw new Error("Plase login");
    }

    return await prisma.userActivity.create({
      data: {
        userId: userId,
        activityType,
        targetId: targetId,
        details,
        completed: true,
      },
    });
  } catch (error) {
    console.log(error);
  }
};

export const getUserByEmail = async (email: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    return user;
  } catch (error) {
    console.log(error);
  }
};
export const getUserById = async (id: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },
    });
    return user;
  } catch (error) {
    console.log(error);
  }
};
