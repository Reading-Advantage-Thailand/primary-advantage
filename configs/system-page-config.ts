import { PageConfig } from "@/types";

export const systemPageConfig: PageConfig = {
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
      title: "systemdashboard",
      href: "/system/dashboard",
      // icon: "class",
    },
    {
      title: "testing",
      href: "/system/test",
      // icon: "class",
    },
  ],
};
