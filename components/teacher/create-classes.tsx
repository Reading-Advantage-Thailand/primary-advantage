import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "../ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "../ui/label";
import { PlusIcon } from "lucide-react";
// import { useClassroomStore } from "@/store/classroom-store";

interface CreateNewClassProps {
  buttonText?: string;
  onClassCreated?: () => void;
}

export default function CreateNewClass({
  onClassCreated,
  buttonText,
}: CreateNewClassProps) {
  const [classroomName, setClassroomName] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [classCode, setClassCode] = useState<string>("");
  const [open, setOpen] = useState<boolean>(false);
  const router = useRouter();
  // const { fetchClassrooms } = useClassroomStore();
  // const t = useScopedI18n("components.myClasses.createNewClass");

  const handleCreateClass = async () => {
    try {
      if (!classCode || !classroomName || !grade) {
        toast.error("Attention", {
          description: "Please fill in all fields",
          richColors: true,
        });
        return;
      }

      const classroom = {
        classCode: classCode,
        classroomName: classroomName,
        description: "description",
        grade: grade,
      };

      const response = await fetch("/api/classroom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(classroom),
      });

      if (!response.ok) {
        throw new Error("Failed to create class");
      }

      toast.success("Success", {
        description: "Class created successfully",
        richColors: true,
      });

      setClassroomName("");
      setGrade("");
      setClassCode(generateRandomCode());
      setOpen(false);

      // Call the callback to refresh the parent component's data
      if (onClassCreated) {
        onClassCreated();
      }
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        description: "Failed to create class",
        richColors: true,
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const generateRandomCode = () => {
    return Math.random().toString(36).substring(2, 8);
  };

  useEffect(() => {
    setClassCode(generateRandomCode());
  }, []);

  return (
    <div className="max-w-sm">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <PlusIcon className="size-4" />
            &nbsp; {buttonText || "New Classroom"}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Class</DialogTitle>
          </DialogHeader>
          <DialogDescription>Create a new class</DialogDescription>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label>Class Name</Label>
              <Input
                type="text"
                className="col-span-3"
                placeholder="Class Name"
                value={classroomName}
                onChange={(e) => setClassroomName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label>Class Code</Label>
              <Input
                type="text"
                className="col-span-3 cursor-default"
                value={classCode}
                readOnly
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label>Grade</Label>
              <Select onValueChange={(value) => setGrade(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 3).map(
                    (grade: number, index: number) => (
                      <SelectItem key={index} value={String(grade)}>
                        Grade {grade}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleCreateClass()}>
              Create
            </Button>
            <Button onClick={handleClose}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
