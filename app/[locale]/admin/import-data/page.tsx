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
import React, { useState, useRef } from "react";
import { parse } from "csv/sync";

export default function ImportDataPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("students");
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setUploadError("");
    setUploadResult(null);

    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setUploadError("Only CSV files are allowed");
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setUploadError(
        `File size exceeds 5MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
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
        setUploadError(
          "Failed to parse CSV file. Please check the file format.",
        );
      }
    };

    reader.onerror = (e) => {
      console.error("File reading error:", e);
      setUploadError("Failed to read the file");
    };

    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError("");
    setUploadResult(null);
    setUploadProgress(0);

    try {
      // Create FormData to send file
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Simulate progress while uploading
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 2000);

      // Upload file to API
      const response = await fetch("/api/upload/classes ", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setUploadResult(result);

      // Reset progress after showing success
      setTimeout(() => {
        setUploadProgress(0);
      }, 2000);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatExamples = {
    students: {
      title: "Students Data Format",
      description:
        "Import student information including personal details and class assignments",
      headers: ["name", "email", "classroom_name", "role"],
      example: [
        ["John Doe", "john.doe@email.com", "Classroom 1", "STUDENT"],
        ["Jane Smith", "jane.smith@email.com", "Classroom 2", "STUDENT"],
        ["Bob Johnson", "bob.johnson@email.com", "Classroom 3", "STUDENT"],
      ],
      requirements: [
        "Email must be unique and valid format",
        "Role should be Student",
      ],
    },
    teachers: {
      title: "Teachers & Admins Data Format",
      description: "Import teacher information and their assigned subjects",
      headers: ["name", "email", "classroom_name", "role"],
      example: [
        ["Alice Wilson", "alice.wilson@school.edu", "Classroom 1", "Teacher"],
        ["David Brown", "david.brown@school.edu", "Classroom 2", "Teacher"],
        ["Sarah Davis", "sarah.davis@school.edu", "", "Admin"],
      ],
      requirements: [
        "Email must be unique and valid format",
        "Role should be Teacher or Admin",
      ],
    },
    classes: {
      title: "Classes Data Format",
      description: "Import class schedules and room assignments",
      headers: ["name"],
      example: [["M1"], ["M2"], ["M3"]],
      requirements: [],
    },
  };

  const currentFormat =
    formatExamples[activeTab as keyof typeof formatExamples];

  return (
    <div className="space-y-6">
      <Header
        heading="Import Data"
        text="Import CSV files to bulk add students, teachers, and classes to your system"
      />
      <Separator />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Section */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload CSV File
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="file-upload">Select CSV File</Label>
                  <span className="text-muted-foreground text-sm">
                    Max size: 5MB
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
                    Browse
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  Supported format: CSV files only, maximum size 5MB
                </p>
              </div>

              {selectedFile && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>File Selected</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-1">
                      <p>
                        <strong>Name:</strong> {selectedFile.name}
                      </p>
                      <p>
                        <strong>Size:</strong>{" "}
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                      <p>
                        <strong>Type:</strong> {selectedFile.type}
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {uploadError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Upload Failed</AlertTitle>
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}

              {uploadResult && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Upload Successful</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-1">
                      <p>
                        <strong>File:</strong> {uploadResult.originalName}
                      </p>
                      <p>
                        <strong>Size:</strong>{" "}
                        {(uploadResult.size / 1024).toFixed(2)} KB
                      </p>
                      <p>
                        <strong>Saved as:</strong> {uploadResult.fileName}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        File is now ready for processing. You can proceed with
                        the next steps.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {isUploading && (
                <div className="space-y-2">
                  <Label>Upload Progress</Label>
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-muted-foreground text-sm">
                    {uploadProgress}% complete
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="flex-1"
                >
                  {isUploading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import Data
                    </>
                  )}
                </Button>

                {(selectedFile || uploadResult) && (
                  <Button variant="outline" onClick={resetUpload}>
                    Clear
                  </Button>
                )}

                {previewData.length > 0 && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Data Preview</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="h-96">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
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
                CSV Format Guide
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
                    Students
                  </TabsTrigger>
                  <TabsTrigger
                    value="teachers"
                    className="flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Teachers & Admins
                  </TabsTrigger>
                  <TabsTrigger
                    value="classes"
                    className="flex items-center gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    Classes
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
                    <Label>Required Headers (in this exact order):</Label>
                    <div className="flex flex-wrap gap-2">
                      {currentFormat.headers.map((header, index) => (
                        <Badge key={index} variant="secondary">
                          {header}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Example Data:</Label>
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
                      <Label>Requirements:</Label>
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
                    Download {currentFormat.title.split(" ")[0]} Template
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
              <CardTitle>Import Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                  <div className="space-y-1">
                    <p className="font-medium">File Size Limit</p>
                    <p className="text-muted-foreground text-sm">
                      Maximum file size is 5MB. Larger files should be split
                      into smaller chunks
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                  <div className="space-y-1">
                    <p className="font-medium">Use UTF-8 Encoding</p>
                    <p className="text-muted-foreground text-sm">
                      Save your CSV with UTF-8 encoding to support special
                      characters
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                  <div className="space-y-1">
                    <p className="font-medium">Check for Duplicates</p>
                    <p className="text-muted-foreground text-sm">
                      Ensure emails and IDs are unique before importing
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                  <div className="space-y-1">
                    <p className="font-medium">Validate Data First</p>
                    <p className="text-muted-foreground text-sm">
                      Use the preview feature to check your data before
                      importing
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                  <div className="space-y-1">
                    <p className="font-medium">Backup First</p>
                    <p className="text-muted-foreground text-sm">
                      Always backup your existing data before large imports
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Common Issues</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
                  <div className="space-y-1">
                    <p className="font-medium">Wrong File Format</p>
                    <p className="text-muted-foreground text-sm">
                      Only CSV files are accepted. Convert Excel files to CSV
                      first
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
                  <div className="space-y-1">
                    <p className="font-medium">Missing Headers</p>
                    <p className="text-muted-foreground text-sm">
                      First row must contain exact header names as shown
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
                  <div className="space-y-1">
                    <p className="font-medium">Invalid Email Format</p>
                    <p className="text-muted-foreground text-sm">
                      Check all email addresses are properly formatted
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
