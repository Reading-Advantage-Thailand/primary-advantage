"use client";
import React from "react";
import { Button } from "../ui/button";
import { generateSecureCode } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { createClassroomCode } from "@/actions/classroom";
import { CopyButton } from "../ui/copy-button";

export default function ClassRoster() {
  const [classroomCode, setClassroomCode] = React.useState<string>("");
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [isPanding, startTransition] = React.useTransition();
  const loginLink = `http://localhost:3000/auth/signin?classroom_code=${classroomCode}`;

  const handleGenarateCode = () => {
    startTransition(async () => {
      const result = await createClassroomCode("cmawoh7kh0001ti9765m2qr7c");
      if (result.success) {
        setClassroomCode(result.code as string);
        setIsOpen(true);
      }
    });
  };
  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button disabled={isPanding} onClick={() => handleGenarateCode()}>
            Create Classroom Code
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Classroom Code Genarate</DialogTitle>
          </DialogHeader>
          <div>This Classroom Code: {classroomCode}</div>
          <div>This Code have expired 1 day</div>
          <CopyButton value={loginLink} />
        </DialogContent>
      </Dialog>
    </>
  );
}
