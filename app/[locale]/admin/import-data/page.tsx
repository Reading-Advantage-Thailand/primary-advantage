"use client";

import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  Eye,
  Users,
  BookOpen,
  GraduationCap,
  Info,
} from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { parse } from "csv/sync";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { ClassroomConflictModal } from "@/components/admin/classroom-conflict-modal";

type School = { id: string; name: string };

interface ConflictItem {
  name: string;
  existingId: string;
  existingMeta?: Record<string, unknown>;
}

interface ConflictSummary {
  newClassroomsToCreate: string[];
  parsedRows: number;
}

interface CreatedClassroom {
  name: string;
  id: string;
  wasSuffixed: boolean;
  originalName?: string;
}

export default function ImportDataPage() {
  const t = useTranslations("ImportData");
  const tAdmin = useTranslations("importAdmin");
  const { data: session } = authClient.useSession();
  const isSystemAdmin = session?.user?.role === "system";

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("students");
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // System admin: school selector state
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");

  // Conflict modal state
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [pendingConflicts, setPendingConflicts] = useState<ConflictItem[]>([]);
  const [pendingConflictSummary, setPendingConflictSummary] =
    useState<ConflictSummary>({ newClassroomsToCreate: [], parsedRows: 0 });
  // Holds the FormData for re-submission after conflict resolution
  const pendingFormDataRef = useRef<FormData | null>(null);

  useEffect(() => {
    if (!isSystemAdmin) return;
    fetch("/api/schools")
      .then((res) => res.json())
      .then((data: Array<{ id: string; name: string }>) => {
        if (Array.isArray(data)) {
          setSchools(data.map((s) => ({ id: s.id, name: s.name })));
        }
      })
      .catch(() => {
        // non-fatal; dropdown will be empty
      });
  }, [isSystemAdmin]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setUploadError("");
    setUploadResult(null);

    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setUploadError(t("errors.onlyCsv"));
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setUploadError(
        t("errors.sizeExceeded", {
          size: (file.size / 1024 / 1024).toFixed(2),
        }),
      );
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const csvData = parse(text, {
          columns: true,
          skip_empty_lines: true,
        });
        setPreviewData(csvData);
      } catch (error) {
        console.error("CSV parsing error:", error);
        setUploadError(t("errors.parseError"));
      }
    };

    reader.onerror = (e) => {
      console.error("File reading error:", e);
      setUploadError(t("errors.readError"));
    };

    reader.readAsText(file);
  };

  /**
   * Core fetch helper. Sends FormData to /api/upload/classes.
   * Returns the raw Response so callers can branch on status.
   */
  const postImport = (formData: FormData): Promise<Response> => {
    return fetch("/api/upload/classes", {
      method: "POST",
      body: formData,
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (isSystemAdmin && !selectedSchoolId) return;

    setIsUploading(true);
    setUploadError("");
    setUploadResult(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (isSystemAdmin && selectedSchoolId) {
        formData.append("schoolId", selectedSchoolId);
      }

      // Simulate progress while uploading
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 2000);

      const response = await postImport(formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (response.status === 409 && result.canResolve) {
        // Conflict — open modal; stash FormData for re-submission
        pendingFormDataRef.current = formData;
        setPendingConflicts(result.conflicts ?? []);
        setPendingConflictSummary(
          result.summary ?? { newClassroomsToCreate: [], parsedRows: 0 },
        );
        setConflictModalOpen(true);
        setUploadProgress(0);
        return;
      }

      if (!response.ok) {
        throw new Error(result.details || t("errors.uploadFailed"));
      }

      setUploadResult(result);

      // Reset progress after showing success
      setTimeout(() => {
        setUploadProgress(0);
      }, 2000);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : t("errors.uploadFailed"),
      );
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConflictConfirm = async (
    choices: Record<string, "existing" | "new">,
  ) => {
    setConflictModalOpen(false);

    const formData = pendingFormDataRef.current;
    if (!formData) return;

    // Append choices to the same FormData and re-POST
    formData.append("choices", JSON.stringify(choices));

    setIsUploading(true);
    setUploadError("");
    setUploadResult(null);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 2000);

      const response = await postImport(formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (response.status === 409 && result.canResolve) {
        // Defensive: server returned another 409 — re-open modal with updated conflicts
        pendingFormDataRef.current = formData;
        setPendingConflicts(result.conflicts ?? []);
        setPendingConflictSummary(
          result.summary ?? { newClassroomsToCreate: [], parsedRows: 0 },
        );
        setConflictModalOpen(true);
        setUploadProgress(0);
        return;
      }

      if (!response.ok) {
        throw new Error(result.details || t("errors.uploadFailed"));
      }

      setUploadResult(result);

      setTimeout(() => {
        setUploadProgress(0);
      }, 2000);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : t("errors.uploadFailed"),
      );
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
      pendingFormDataRef.current = null;
    }
  };

  const handleConflictCancel = () => {
    setConflictModalOpen(false);
    // Leave existing error/idle state; do NOT clear the file selection
  };

  const downloadTemplate = (type: string) => {
    const format = formatExamples[type as keyof typeof formatExamples];
    if (!format) return;

    // Create CSV content
    const headers = format.headers.join(",");
    const exampleRows = format.example
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const csvContent = `${headers}\n${exampleRows}`;

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `${type}_template.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(url);
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setUploadError("");
    setUploadProgress(0);
    setPreviewData([]);
    setSelectedSchoolId("");
    setConflictModalOpen(false);
    setPendingConflicts([]);
    pendingFormDataRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatExamples = {
    students: {
      title: t("format.students.title"),
      description: t("format.students.description"),
      headers: [
        t("format.headers.name"),
        t("format.headers.email"),
        t("format.headers.classroomName"),
        t("format.headers.role"),
      ],
      example: [
        ["John Doe", "john.doe@email.com", "Classroom 1", "student"],
        ["Jane Smith", "jane.smith@email.com", "Classroom 2", "student"],
        ["Bob Johnson", "bob.johnson@email.com", "Classroom 3", "student"],
      ],
      requirements: [
        t("format.students.req1"),
        t("format.students.req2"),
        t("format.students.req3"),
      ],
    },
    teachers: {
      title: t("format.teachers.title"),
      description: t("format.teachers.description"),
      headers: [
        t("format.headers.name"),
        t("format.headers.email"),
        t("format.headers.classroomName"),
        t("format.headers.role"),
      ],
      example: [
        ["Alice Wilson", "alice.wilson@school.edu", "Classroom 1", "teacher"],
        ["David Brown", "david.brown@school.edu", "Classroom 2", "teacher"],
        ["Sarah Davis", "sarah.davis@school.edu", "", "admin"],
      ],
      requirements: [
        t("format.teachers.req1"),
        t("format.teachers.req2"),
        t("format.teachers.req3"),
      ],
    },
    classes: {
      title: t("format.classes.title"),
      description: t("format.classes.description"),
      headers: [t("format.headers.classroomName")],
      example: [["M1"], ["M2"], ["M3"]],
      requirements: [t("format.classes.req1"), t("format.classes.req2")],
    },
  };

  const currentFormat =
    formatExamples[activeTab as keyof typeof formatExamples];

  return (
    <div className="space-y-6">
      <Header heading={t("header.heading")} text={t("header.text")} />
      <Separator />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Section */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                {t("upload.cardTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSystemAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="school-select">{tAdmin("targetSchool")}</Label>
                  <Select
                    value={selectedSchoolId}
                    onValueChange={setSelectedSchoolId}
                  >
                    <SelectTrigger id="school-select" className="w-full">
                      <SelectValue placeholder={tAdmin("selectSchoolPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    {tAdmin("targetSchoolHint")}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="file-upload">{t("upload.selectFile")}</Label>
                  <span className="text-muted-foreground text-sm">
                    {t("upload.maxSize")}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {t("upload.browse")}
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  {t("upload.supportedFormat")}
                </p>
              </div>

              {selectedFile && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>{t("upload.fileSelected.title")}</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-1">
                      <p>
                        <strong>{t("upload.fileSelected.name")}:</strong>{" "}
                        {selectedFile.name}
                      </p>
                      <p>
                        <strong>{t("upload.fileSelected.size")}:</strong>{" "}
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                      <p>
                        <strong>{t("upload.fileSelected.type")}:</strong>{" "}
                        {selectedFile.type}
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {uploadError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("upload.failedTitle")}</AlertTitle>
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}

              {uploadResult && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>{t("upload.successTitle")}</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-1">
                      {/* Envelope fields — present on students/teachers path; absent on classes path */}
                      {uploadResult.originalName && (
                        <p>
                          <strong>{t("upload.success.file")}:</strong>{" "}
                          {uploadResult.originalName}
                        </p>
                      )}
                      {typeof uploadResult.size === "number" && (
                        <p>
                          <strong>{t("upload.success.size")}:</strong>{" "}
                          {(uploadResult.size / 1024).toFixed(2)} KB
                        </p>
                      )}
                      {uploadResult.fileName && (
                        <p>
                          <strong>{t("upload.success.savedAs")}:</strong>{" "}
                          {uploadResult.fileName}
                        </p>
                      )}
                      <p className="text-muted-foreground text-sm">
                        {t("upload.success.nextSteps")}
                      </p>
                      {/* Show classrooms that were created with a suffix (classes path) */}
                      {Array.isArray(uploadResult.createdClassrooms) &&
                        uploadResult.createdClassrooms.some(
                          (c: CreatedClassroom) => c.wasSuffixed,
                        ) && (
                          <ul className="mt-2 space-y-0.5 border-t pt-2">
                            {(
                              uploadResult.createdClassrooms as CreatedClassroom[]
                            )
                              .filter((c) => c.wasSuffixed)
                              .map((c) => (
                                <li
                                  key={c.id}
                                  className="text-muted-foreground flex items-center gap-1.5 text-xs"
                                >
                                  <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-500" />
                                  {tAdmin("result.suffixedCreated", {
                                    newName: c.name,
                                    originalName: c.originalName ?? c.name,
                                  })}
                                </li>
                              ))}
                          </ul>
                        )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {isUploading && (
                <div className="space-y-2">
                  <Label>{t("upload.progressLabel")}</Label>
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-muted-foreground text-sm">
                    {t("upload.progressPercent", { percent: uploadProgress })}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={
                    !selectedFile ||
                    isUploading ||
                    (isSystemAdmin && !selectedSchoolId)
                  }
                  className="flex-1"
                  title={
                    isSystemAdmin && !selectedSchoolId
                      ? tAdmin("selectSchoolFirst")
                      : undefined
                  }
                >
                  {isUploading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      {t("upload.uploading")}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {t("upload.importButton")}
                    </>
                  )}
                </Button>

                {(selectedFile || uploadResult) && (
                  <Button variant="outline" onClick={resetUpload}>
                    {t("upload.clear")}
                  </Button>
                )}

                {previewData.length > 0 && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Eye className="mr-2 h-4 w-4" />
                        {t("preview.button")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>{t("preview.title")}</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="h-96">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("preview.columns.name")}</TableHead>
                              <TableHead>
                                {t("preview.columns.email")}
                              </TableHead>
                              <TableHead>{t("preview.columns.role")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewData.map((row, index) => (
                              <TableRow key={index}>
                                <TableCell>{row.name}</TableCell>
                                <TableCell>{row.email}</TableCell>
                                <TableCell>{row.role}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Format Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                {t("formatGuide.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger
                    value="students"
                    className="flex items-center gap-2"
                  >
                    <GraduationCap className="h-4 w-4" />
                    {t("formatGuide.tabs.students")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="teachers"
                    className="flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    {t("formatGuide.tabs.teachers")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="classes"
                    className="flex items-center gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    {t("formatGuide.tabs.classes")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {currentFormat.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {currentFormat.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("formatGuide.requiredHeaders")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {currentFormat.headers.map((header, index) => (
                        <Badge key={index} variant="secondary">
                          {header}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("formatGuide.exampleData")}</Label>
                    <ScrollArea className="h-48 rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {currentFormat.headers.map((header, index) => (
                              <TableHead
                                key={index}
                                className="whitespace-nowrap"
                              >
                                {header}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentFormat.example.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              {row.map((cell, cellIndex) => (
                                <TableCell
                                  key={cellIndex}
                                  className="whitespace-nowrap"
                                >
                                  {cell}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>

                  {currentFormat.requirements.length > 0 && (
                    <div className="space-y-2">
                      <Label>{t("formatGuide.requirements")}</Label>
                      <ul className="space-y-1">
                        {currentFormat.requirements.map((req, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-sm"
                          >
                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-500" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => downloadTemplate(activeTab)}
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {t("formatGuide.downloadTemplate", { type: activeTab })}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Tips Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("tips.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                  <div className="space-y-1">
                    <p className="font-medium">{t("tips.fileSize.title")}</p>
                    <p className="text-muted-foreground text-sm">
                      {t("tips.fileSize.desc")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                  <div className="space-y-1">
                    <p className="font-medium">{t("tips.encoding.title")}</p>
                    <p className="text-muted-foreground text-sm">
                      {t("tips.encoding.desc")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                  <div className="space-y-1">
                    <p className="font-medium">{t("tips.duplicates.title")}</p>
                    <p className="text-muted-foreground text-sm">
                      {t("tips.duplicates.desc")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                  <div className="space-y-1">
                    <p className="font-medium">{t("tips.validate.title")}</p>
                    <p className="text-muted-foreground text-sm">
                      {t("tips.validate.desc")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                  <div className="space-y-1">
                    <p className="font-medium">{t("tips.backup.title")}</p>
                    <p className="text-muted-foreground text-sm">
                      {t("tips.backup.desc")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("issues.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
                  <div className="space-y-1">
                    <p className="font-medium">
                      {t("issues.wrongFormat.title")}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {t("issues.wrongFormat.desc")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
                  <div className="space-y-1">
                    <p className="font-medium">
                      {t("issues.missingHeaders.title")}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {t("issues.missingHeaders.desc")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
                  <div className="space-y-1">
                    <p className="font-medium">
                      {t("issues.invalidEmail.title")}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {t("issues.invalidEmail.desc")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Classroom conflict resolution modal */}
      <ClassroomConflictModal
        open={conflictModalOpen}
        conflicts={pendingConflicts}
        summary={pendingConflictSummary}
        onCancel={handleConflictCancel}
        onConfirm={handleConflictConfirm}
      />
    </div>
  );
}
