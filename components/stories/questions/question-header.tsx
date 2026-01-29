"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import React from "react";

type Props = {
  children: React.ReactNode;
  heading: string;
  description: string;
  buttonLabel: string;
  className?: string;
  disabled?: boolean;
  userId?: string;
  articleId?: string;
  isCompleted?: boolean; // เพิ่ม prop นี้เพื่อแสดง children โดยตรงถ้าเคยทำแล้ว
};

type ActivityType = {
  [key: string]: string;
};

export default function QuestionHeader({
  children,
  heading,
  description,
  buttonLabel,
  disabled = true,
  isCompleted = false,
}: Props) {
  const [isButtonClicked, setIsButtonClicked] = React.useState<boolean>(false);
  async function onButtonClick() {
    setIsButtonClicked(true);
  }

  // ถ้าเคยทำแล้ว หรือกดปุ่มแล้ว ให้แสดง children
  if (isButtonClicked || isCompleted) {
    return <>{children}</>;
  }

  return (
    <>
      <CardHeader>
        <CardTitle className="text-3xl font-bold md:text-3xl">
          {heading}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onButtonClick} disabled={disabled}>
          {buttonLabel}
        </Button>
      </CardContent>
    </>
  );
}
