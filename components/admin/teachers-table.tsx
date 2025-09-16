"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Pencil,
  Trash2,
  Mail,
  User,
  Calendar,
  GraduationCap,
  Search,
  Loader2,
  School,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  TeacherData,
  TeachersResponse,
  CreateTeacherRequest,
  UpdateTeacherRequest,
} from "@/types/index.d";

// Updated Teacher interface to match API response
interface Teacher extends Omit<TeacherData, "createdAt"> {
  createdAt: Date;
  assignedClassrooms?: Array<{
    id: string;
    name: string;
  }>;
}

interface Classroom {
  id: string;
  name: string;
  grade: string | null;
  studentCount: number;
}

export function TeachersTable() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [statistics, setStatistics] = useState({
    totalTeachers: 0,
    totalStudents: 0,
    totalClasses: 0,
    averageStudentsPerTeacher: 0,
    activeTeachers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isClassroomsLoading, setIsClassroomsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "Teacher" as "Teacher" | "Admin",
    cefrLevel: "A1",
    assignedClassroomIds: [] as string[],
    password: "",
  });
  const [showPasswordField, setShowPasswordField] = useState(false);

  // Fetch teachers data from API
  const fetchTeachers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/teachers");

      if (!response.ok) {
        throw new Error("Failed to fetch teachers");
      }

      const data: TeachersResponse = await response.json();

      // Convert API data to component format
      const teachersWithDates = data.teachers.map((teacher) => ({
        ...teacher,
        createdAt: new Date(teacher.createdAt),
      }));

      setTeachers(teachersWithDates);
      setStatistics(data.statistics);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error("Failed to load teachers data");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available classrooms for assignment
  const fetchClassrooms = async () => {
    try {
      setIsClassroomsLoading(true);
      console.log("🔍 Fetching classrooms...");
      const response = await fetch("/api/classrooms");

      console.log("🔍 Classrooms response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("🔍 Classrooms fetch error:", errorText);
        throw new Error(
          `Failed to fetch classrooms: ${response.status} ${errorText}`,
        );
      }

      const data = await response.json();
      console.log("🔍 Classrooms data received:", data);

      // Handle both possible response formats
      const classroomsArray = Array.isArray(data)
        ? data
        : data.classrooms || [];
      console.log("🔍 Setting classrooms:", classroomsArray);
      setClassrooms(classroomsArray);
    } catch (error) {
      console.error("🔍 Error fetching classrooms:", error);
      toast.error(
        `Failed to load classrooms: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsClassroomsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchTeachers();
    fetchClassrooms();
  }, []);

  // Filter teachers based on search term
  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleAddTeacher = async () => {
    try {
      const requestData: CreateTeacherRequest & {
        classroomIds?: string[];
        password?: string;
      } = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        cefrLevel: formData.cefrLevel,
        classroomIds: formData.assignedClassroomIds,
        ...(formData.password && { password: formData.password }),
      };

      console.log("🔍 Creating teacher with data:", requestData);

      const response = await fetch("/api/teachers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      console.log("🔍 Create teacher response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("🔍 Create teacher error:", errorData);
        throw new Error(errorData.error || "Failed to create teacher");
      }

      const result = await response.json();
      console.log("🔍 Teacher created successfully:", result);

      toast.success("Teacher created successfully");

      setIsAddDialogOpen(false);
      resetForm();
      fetchTeachers(); // Refresh the list
    } catch (error: any) {
      console.error("🔍 Error creating teacher:", error);
      toast.error(error.message || "Failed to create teacher");
    }
  };

  const handleEditTeacher = async () => {
    if (!selectedTeacher) return;

    try {
      const requestData: UpdateTeacherRequest & {
        classroomIds?: string[];
        password?: string;
      } = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        cefrLevel: formData.cefrLevel,
        classroomIds: formData.assignedClassroomIds,
        ...(formData.password && { password: formData.password }),
      };

      console.log("🔍 Updating teacher with data:", requestData);
      console.log("🔍 Selected teacher ID:", selectedTeacher.id);

      const response = await fetch(`/api/teachers/${selectedTeacher.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      console.log("🔍 Update teacher response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("🔍 Update teacher error:", errorData);
        throw new Error(errorData.error || "Failed to update teacher");
      }

      const result = await response.json();
      console.log("🔍 Teacher updated successfully:", result);

      toast.success("Teacher updated successfully");

      setIsEditDialogOpen(false);
      resetForm();
      setSelectedTeacher(null);
      fetchTeachers(); // Refresh the list
    } catch (error: any) {
      console.error("🔍 Error updating teacher:", error);
      toast.error(error.message || "Failed to update teacher");
    }
  };

  const handleDeleteTeacher = async () => {
    if (!selectedTeacher) return;

    try {
      const response = await fetch(`/api/teachers/${selectedTeacher.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete teacher");
      }

      toast.success("Teacher deleted successfully");

      setIsDeleteDialogOpen(false);
      setSelectedTeacher(null);
      fetchTeachers(); // Refresh the list
    } catch (error: any) {
      console.error("Error deleting teacher:", error);
      toast.error(error.message || "Failed to delete teacher");
    }
  };

  const openEditDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setFormData({
      name: teacher.name || "",
      email: teacher.email || "",
      role: teacher.role as "Teacher" | "Admin",
      cefrLevel: teacher.cefrLevel || "A1",
      assignedClassroomIds: teacher.assignedClassrooms?.map((c) => c.id) || [],
      password: "",
    });
    setShowPasswordField(false);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      role: "Teacher",
      cefrLevel: "A1",
      assignedClassroomIds: [],
      password: "",
    });
    setShowPasswordField(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "destructive";
      case "TEACHER":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
        <Input
          placeholder="Search teachers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Teachers
            </CardTitle>
            <User className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : statistics.totalTeachers}
            </div>
            <p className="text-muted-foreground text-xs">
              Active in the system
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <GraduationCap className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : statistics.totalStudents}
            </div>
            <p className="text-muted-foreground text-xs">Across all teachers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <Calendar className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : statistics.totalClasses}
            </div>
            <p className="text-muted-foreground text-xs">Active classes</p>
          </CardContent>
        </Card>
      </div>

      {/* Teachers Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Teachers List</CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Teacher
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Teacher</DialogTitle>
                <DialogDescription>
                  Create a new teacher account. They will receive login
                  credentials via email.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="add-name">Full Name</Label>
                  <Input
                    id="add-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter full name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="add-email">Email Address</Label>
                  <Input
                    id="add-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="Enter email address"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="add-role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: "Teacher" | "Admin") =>
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Teacher">Teacher</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="add-cefr">CEFR Level</Label>
                  <Select
                    value={formData.cefrLevel}
                    onValueChange={(value) =>
                      setFormData({ ...formData, cefrLevel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select CEFR level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A1">A1 - Beginner</SelectItem>
                      <SelectItem value="A2">A2 - Elementary</SelectItem>
                      <SelectItem value="B1">B1 - Intermediate</SelectItem>
                      <SelectItem value="B2">
                        B2 - Upper Intermediate
                      </SelectItem>
                      <SelectItem value="C1">C1 - Advanced</SelectItem>
                      <SelectItem value="C2">C2 - Proficient</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="add-password">Password (Optional)</Label>
                  <Input
                    id="add-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Leave empty for auto-generated password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Assign Classrooms</Label>
                  <div className="rounded-lg border p-3">
                    {isClassroomsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground text-sm">
                          Loading classrooms...
                        </span>
                      </div>
                    ) : classrooms.length === 0 ? (
                      <p className="text-muted-foreground py-4 text-center text-sm">
                        No classrooms available
                      </p>
                    ) : (
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {classrooms.map((classroom) => (
                            <div
                              key={classroom.id}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`add-classroom-${classroom.id}`}
                                checked={formData.assignedClassroomIds.includes(
                                  classroom.id,
                                )}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setFormData({
                                      ...formData,
                                      assignedClassroomIds: [
                                        ...formData.assignedClassroomIds,
                                        classroom.id,
                                      ],
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      assignedClassroomIds:
                                        formData.assignedClassroomIds.filter(
                                          (id) => id !== classroom.id,
                                        ),
                                    });
                                  }
                                }}
                              />
                              <Label
                                htmlFor={`add-classroom-${classroom.id}`}
                                className="flex cursor-pointer items-center gap-2 text-sm font-normal"
                              >
                                <School className="h-3 w-3" />
                                {classroom.name}
                                {classroom.grade && (
                                  <Badge variant="outline" className="text-xs">
                                    {classroom.grade}
                                  </Badge>
                                )}
                                <span className="text-muted-foreground">
                                  ({classroom.studentCount} students)
                                </span>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddTeacher}
                  disabled={!formData.name || !formData.email}
                >
                  Add Teacher
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>CEFR Level</TableHead>
                <TableHead>Assigned Classrooms</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      {isLoading ? (
                        <>
                          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                          <p className="text-muted-foreground">
                            Loading teachers...
                          </p>
                        </>
                      ) : (
                        <>
                          <User className="text-muted-foreground h-8 w-8" />
                          <p className="text-muted-foreground">
                            {searchTerm
                              ? "No teachers found matching your search"
                              : "No teachers found"}
                          </p>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={teacher.image || undefined}
                            alt={teacher.name || "Teacher"}
                          />
                          <AvatarFallback>
                            {getInitials(teacher.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{teacher.name || "N/A"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="text-muted-foreground h-4 w-4" />
                        {teacher.email || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(teacher.role)}>
                        {teacher.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {teacher.cefrLevel || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {teacher.assignedClassrooms &&
                        teacher.assignedClassrooms.length > 0 ? (
                          teacher.assignedClassrooms.map((classroom) => (
                            <Badge
                              key={classroom.id}
                              variant="secondary"
                              className="text-xs"
                            >
                              <School className="mr-1 h-3 w-3" />
                              {classroom.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No classrooms assigned
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{teacher.totalStudents}</TableCell>
                    <TableCell>{teacher.totalClasses}</TableCell>
                    <TableCell>
                      {teacher.createdAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(teacher)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(teacher)}
                        >
                          <Trash2 className="text-destructive h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
            <DialogDescription>
              Update teacher information and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter full name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter email address"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "Teacher" | "Admin") =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Teacher">Teacher</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-cefr">CEFR Level</Label>
              <Select
                value={formData.cefrLevel}
                onValueChange={(value) =>
                  setFormData({ ...formData, cefrLevel: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select CEFR level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A1">A1 - Beginner</SelectItem>
                  <SelectItem value="A2">A2 - Elementary</SelectItem>
                  <SelectItem value="B1">B1 - Intermediate</SelectItem>
                  <SelectItem value="B2">B2 - Upper Intermediate</SelectItem>
                  <SelectItem value="C1">C1 - Advanced</SelectItem>
                  <SelectItem value="C2">C2 - Proficient</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Reset Password</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasswordField(!showPasswordField)}
                >
                  {showPasswordField ? "Cancel" : "Set New Password"}
                </Button>
              </div>
              {showPasswordField && (
                <Input
                  id="edit-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Enter new password"
                />
              )}
            </div>
            <div className="grid gap-2">
              <Label>Assign Classrooms</Label>
              <div className="rounded-lg border p-3">
                {isClassroomsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span className="text-muted-foreground text-sm">
                      Loading classrooms...
                    </span>
                  </div>
                ) : classrooms.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    No classrooms available
                  </p>
                ) : (
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {classrooms.map((classroom) => (
                        <div
                          key={classroom.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`edit-classroom-${classroom.id}`}
                            checked={formData.assignedClassroomIds.includes(
                              classroom.id,
                            )}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  assignedClassroomIds: [
                                    ...formData.assignedClassroomIds,
                                    classroom.id,
                                  ],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  assignedClassroomIds:
                                    formData.assignedClassroomIds.filter(
                                      (id) => id !== classroom.id,
                                    ),
                                });
                              }
                            }}
                          />
                          <Label
                            htmlFor={`edit-classroom-${classroom.id}`}
                            className="flex cursor-pointer items-center gap-2 text-sm font-normal"
                          >
                            <School className="h-3 w-3" />
                            {classroom.name}
                            {classroom.grade && (
                              <Badge variant="outline" className="text-xs">
                                {classroom.grade}
                              </Badge>
                            )}
                            <span className="text-muted-foreground">
                              ({classroom.studentCount} students)
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditTeacher}
              disabled={!formData.name || !formData.email}
            >
              Update Teacher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Teacher</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedTeacher?.name}? This
              action cannot be undone. All associated classes and student data
              will be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTeacher}>
              Delete Teacher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
