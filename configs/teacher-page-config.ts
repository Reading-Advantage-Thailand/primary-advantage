import { PageConfig } from "@/types";

export const teacherPageConfig: PageConfig = {
  mainNav: [
    {
      title: "home",
      href: "/",
      icon: "HomeIcon",
    },
    {
      title: "about",
      href: "/about",
      icon: "InfoIcon",
    },
    {
      title: "contact",
      href: "/contact",
      icon: "MailIcon",
    },
    {
      title: "authors",
      href: "/authors",
      icon: "UsersIcon",
    },
  ],
  sidebarNav: [
    {
      title: "teacherdashboard",
      href: "/teacher/dashboard",
      // icon: "class",
    },
    // {
    //   title: "myClasses",
    //   href: "/teacher/my-classes",
    //   icon: "class",
    // },
    // {
    //   title: "myStudents",
    //   href: "/teacher/my-students",
    //   icon: "student",
    // },
    // {
    //   title: "classRoster",
    //   href: "/teacher/class-roster",
    //   // icon: "roster",
    // },
    // {
    //   title: "reports",
    //   href: "/teacher/reports",
    //   icon: "report",
    // },
    // {
    //   title: "passages",
    //   href: "/teacher/passages",
    //   icon: "article",
    // },
    // {
    //   title: "google classroom",
    //   href: "/teacher/classroom",
    //   icon: "class",
    // },
    // {
    //   title: "assignments",
    //   href: "/teacher/assignments",
    //   icon: "assignments",
    // },
  ],
};
