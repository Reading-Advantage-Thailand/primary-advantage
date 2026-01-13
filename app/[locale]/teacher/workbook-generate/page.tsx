"use client";

import { useState } from "react";
// import Handlebars from "handlebars";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileText,
  FileJson,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export default function WorkbookGeneratorPage() {
  const [templateContent, setTemplateContent] = useState<string | null>(null);
  const [jsonContent, setJsonContent] = useState<string | null>(null);
  const [templateFileName, setTemplateFileName] = useState<string>("");
  const [jsonFileName, setJsonFileName] = useState<string>("");
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });

  const t = useTranslations("Components");

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "template" | "json",
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (type === "template") {
      setTemplateFileName(file.name);
    } else {
      setJsonFileName(file.name);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (type === "template") {
        setTemplateContent(content);
      } else {
        setJsonContent(content);
      }
    };
    reader.readAsText(file);
  };

  const handleGenerate = () => {
    if (!templateContent || !jsonContent) {
      setStatus({
        type: "error",
        message: t("workbookGeneratorPage.messages.uploadBothFiles"),
      });
      return;
    }

    try {
      const data = JSON.parse(jsonContent);
      //   const template = Handlebars.compile(templateContent);
      //   const resultHtml = template(data);

      const newWindow = window.open("", "_blank");
      if (!newWindow) {
        setStatus({
          type: "error",
          message: t("workbookGeneratorPage.messages.popupBlocked"),
        });
        return;
      }

      //   newWindow.document.write(resultHtml);
      newWindow.document.close();

      setStatus({
        type: "success",
        message: t("workbookGeneratorPage.messages.successGenerated"),
      });
    } catch (error: any) {
      console.error("Generation Error:", error);
      setStatus({
        type: "error",
        message: `${t("workbookGeneratorPage.messages.errorGenerating")} ${
          error.message
        }`,
      });
    }
  };

  return (
    <div className="container mx-auto space-y-6 pb-6">
      {/* Page Header */}
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 p-3 shadow-lg">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              {t("workbookGeneratorPage.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("workbookGeneratorPage.description")}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="overflow-hidden border-2 p-0 shadow-xl">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50 pt-6 dark:from-blue-950 dark:to-purple-950">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <CardTitle>{t("workbookGeneratorPage.cardTitle")}</CardTitle>
            </div>
            <CardDescription>
              {t("workbookGeneratorPage.cardDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 py-6">
            {/* Step 1: Template */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300 }}
              className={`rounded-xl border-2 border-dashed p-6 transition-all duration-300 ${
                templateContent
                  ? "border-green-500 bg-green-50 shadow-md dark:bg-green-950/20"
                  : "border-gray-300 hover:border-blue-400 hover:shadow-md"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex w-full items-center gap-4 sm:w-auto">
                  <div
                    className={`rounded-full p-3 shadow-sm transition-colors ${
                      templateContent
                        ? "bg-green-100 dark:bg-green-900"
                        : "bg-white dark:bg-gray-800"
                    }`}
                  >
                    {templateContent ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <FileText className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 sm:hidden">
                    <Label
                      htmlFor="template-upload"
                      className="flex cursor-pointer items-center gap-2 text-lg font-semibold"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                        1
                      </span>
                      {t("workbookGeneratorPage.step1.title")}
                    </Label>
                  </div>
                </div>

                <div className="hidden flex-1 sm:block">
                  <Label
                    htmlFor="template-upload"
                    className="flex cursor-pointer items-center gap-2 text-lg font-semibold"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                      1
                    </span>
                    {t("workbookGeneratorPage.step1.title")}
                  </Label>
                  <div className="text-muted-foreground mt-1 text-sm">
                    {templateFileName ||
                      t("workbookGeneratorPage.step1.placeholder")}
                  </div>
                </div>

                <div className="text-muted-foreground -mt-2 mb-2 ml-14 text-sm sm:hidden">
                  {templateFileName ||
                    t("workbookGeneratorPage.step1.placeholder")}
                </div>

                <Input
                  id="template-upload"
                  type="file"
                  accept=".html"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "template")}
                />
                <Button
                  variant="outline"
                  className="w-full hover:bg-blue-50 sm:w-auto dark:hover:bg-blue-950"
                  onClick={() =>
                    document.getElementById("template-upload")?.click()
                  }
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t("workbookGeneratorPage.selectButton")}
                </Button>
              </div>
            </motion.div>

            {/* Step 2: Data */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300 }}
              className={`rounded-xl border-2 border-dashed p-6 transition-all duration-300 ${
                jsonContent
                  ? "border-green-500 bg-green-50 shadow-md dark:bg-green-950/20"
                  : "border-gray-300 hover:border-purple-400 hover:shadow-md"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex w-full items-center gap-4 sm:w-auto">
                  <div
                    className={`rounded-full p-3 shadow-sm transition-colors ${
                      jsonContent
                        ? "bg-green-100 dark:bg-green-900"
                        : "bg-white dark:bg-gray-800"
                    }`}
                  >
                    {jsonContent ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <FileJson className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 sm:hidden">
                    <Label
                      htmlFor="json-upload"
                      className="flex cursor-pointer items-center gap-2 text-lg font-semibold"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-sm font-bold text-white">
                        2
                      </span>
                      {t("workbookGeneratorPage.step2.title")}
                    </Label>
                  </div>
                </div>

                <div className="hidden flex-1 sm:block">
                  <Label
                    htmlFor="json-upload"
                    className="flex cursor-pointer items-center gap-2 text-lg font-semibold"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-sm font-bold text-white">
                      2
                    </span>
                    {t("workbookGeneratorPage.step2.title")}
                  </Label>
                  <div className="text-muted-foreground mt-1 text-sm">
                    {jsonFileName ||
                      t("workbookGeneratorPage.step2.placeholder")}
                  </div>
                </div>

                <div className="text-muted-foreground -mt-2 mb-2 ml-14 text-sm sm:hidden">
                  {jsonFileName || t("workbookGeneratorPage.step2.placeholder")}
                </div>

                <Input
                  id="json-upload"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "json")}
                />
                <Button
                  variant="outline"
                  className="w-full hover:bg-purple-50 sm:w-auto dark:hover:bg-purple-950"
                  onClick={() =>
                    document.getElementById("json-upload")?.click()
                  }
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t("workbookGeneratorPage.selectButton")}
                </Button>
              </div>
            </motion.div>

            {/* Action */}
            <motion.div
              whileHover={{ scale: templateContent && jsonContent ? 1.02 : 1 }}
              whileTap={{ scale: templateContent && jsonContent ? 0.98 : 1 }}
            >
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-6 text-lg shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl"
                size="lg"
                disabled={!templateContent || !jsonContent}
                onClick={handleGenerate}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                {t("workbookGeneratorPage.generateButton")}
              </Button>
            </motion.div>

            {/* Status */}
            {status.message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Alert
                  variant={status.type === "error" ? "destructive" : "default"}
                  className={`${
                    status.type === "success"
                      ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950/20"
                      : ""
                  }`}
                >
                  {status.type === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {status.type === "success"
                      ? t("workbookGeneratorPage.messages.success")
                      : t("workbookGeneratorPage.messages.error")}
                  </AlertTitle>
                  <AlertDescription>{status.message}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:border-blue-800 dark:from-blue-950/20 dark:to-purple-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-blue-600" />
              {t("workbookGeneratorPage.howToUse.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                1
              </div>
              <p>
                <strong className="text-foreground">
                  {t("workbookGeneratorPage.howToUse.step1Title")}
                </strong>{" "}
                {t("workbookGeneratorPage.howToUse.step1Description")}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white">
                2
              </div>
              <p>
                <strong className="text-foreground">
                  {t("workbookGeneratorPage.howToUse.step2Title")}
                </strong>{" "}
                {t("workbookGeneratorPage.howToUse.step2Description")}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
                3
              </div>
              <p>
                <strong className="text-foreground">
                  {t("workbookGeneratorPage.howToUse.step3Title")}
                </strong>{" "}
                {t("workbookGeneratorPage.howToUse.step3Description")}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
