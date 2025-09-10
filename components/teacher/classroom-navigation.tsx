"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  Users,
  UserPlus,
  BarChart3,
  Settings,
  ArrowLeft,
  GraduationCap,
  Copy,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface ClassroomNavigationProps {
  classroom: {
    id: string;
    name: string;
    grade?: string;
    classCode?: string;
    passwordStudents?: string;
    studentCount: number;
  };
  showBackButton?: boolean;
}

export default function ClassroomNavigation({
  classroom,
  showBackButton = true,
}: ClassroomNavigationProps) {
  const router = useRouter();
  const params = useParams();
  const [showPassword, setShowPassword] = useState(false);

  const navigationItems = [
    {
      label: "Class Roster",
      icon: Users,
      href: `/teacher/class-roster/${classroom.id}`,
      current: true,
    },
    // {
    //   label: "Enrollment",
    //   icon: UserPlus,
    //   href: `/teacher/class-roster/${classroom.id}/enrollment`,
    // },
    {
      label: "Reports",
      icon: BarChart3,
      href: `/teacher/reports?classroomId=${classroom.id}`,
    },
    {
      label: "Settings",
      icon: Settings,
      href: `/teacher/my-classes?edit=${classroom.id}`,
    },
  ];

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const handleBackToClassrooms = () => {
    router.push("/teacher/class-roster");
  };

  const handleCopyCode = async () => {
    if (!classroom.classCode) return;

    try {
      await navigator.clipboard.writeText(classroom.classCode);
      toast.success("Class code copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy class code:", error);
      toast.error("Failed to copy class code");
    }
  };

  const handleCopyPassword = async () => {
    if (!classroom.passwordStudents) return;

    try {
      await navigator.clipboard.writeText(classroom.passwordStudents);
      toast.success("Password copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy password:", error);
      toast.error("Failed to copy password");
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getPasswordDisplay = () => {
    if (!classroom.passwordStudents) {
      return "No password";
    }
    return showPassword ? classroom.passwordStudents : "••••••••";
  };

  return (
    <Card className="border-b">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        {/* Left side - Classroom info */}
        <div className="flex items-center gap-4">
          {showBackButton && (
            <Button
              onClick={handleBackToClassrooms}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 sm:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <GraduationCap className="h-5 w-5 text-blue-600" />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold sm:text-xl">
                {classroom.name}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{classroom.studentCount} students</span>
                {classroom.grade && (
                  <>
                    <span>•</span>
                    <span>Grade {classroom.grade}</span>
                  </>
                )}
                {classroom.classCode && (
                  <Badge
                    onClick={handleCopyCode}
                    variant="outline"
                    className="ml-2 cursor-pointer text-xs"
                  >
                    Class Code: {classroom.classCode}
                  </Badge>
                )}
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="ml-2 text-xs">
                    Password: {getPasswordDisplay()}
                  </Badge>
                  {classroom.passwordStudents && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="size-6 p-0"
                        onClick={togglePasswordVisibility}
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="size-3" />
                        ) : (
                          <Eye className="size-3" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="size-6 p-0"
                        onClick={handleCopyPassword}
                        title="Copy password"
                      >
                        <Copy className="size-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Navigation menu */}
        <div className="flex items-center gap-2">
          {/* Desktop navigation */}
          <div className="hidden space-x-1 sm:flex">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.href}
                  onClick={() => handleNavigation(item.href)}
                  variant={item.current ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden lg:block">{item.label}</span>
                </Button>
              );
            })}
          </div>

          {/* Mobile dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 sm:hidden">
                <Users className="h-4 w-4" />
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {navigationItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <React.Fragment key={item.href}>
                    <DropdownMenuItem
                      onClick={() => handleNavigation(item.href)}
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </DropdownMenuItem>
                    {index === 1 && <DropdownMenuSeparator />}
                  </React.Fragment>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleBackToClassrooms}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Classrooms
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Desktop back button */}
          {showBackButton && (
            <Button
              onClick={handleBackToClassrooms}
              variant="outline"
              size="sm"
              className="hidden gap-2 sm:flex"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden lg:block">Back</span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
