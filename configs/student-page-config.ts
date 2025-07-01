import { PageConfig, SidebarNavItem } from "@/types";

export const studentPageConfig: PageConfig = {
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
      title: "read",
      href: "/student/read",
      icon: "BookIcon",
    },
    // {
    //   title: "stories",
    //   href: "/student/stories",
    //   icon: "storyBook",
    // },
    {
      id: "onborda-sentences",
      title: "sentences",
      href: "/student/sentences",
      icon: "AlbumIcon",
    },
    {
      id: "onborda-vocabulary",
      title: "vocabulary",
      href: "/student/vocabulary",
      icon: "BookIcon",
    },
    // {
    //   id: "onborda-reports",
    //   title: "reports",
    //   href: "/student/reports",
    //   icon: "dashboard",
    // },
    // {
    //   id: "onborda-history",
    //   title: "history",
    //   href: "/student/history",
    //   icon: "record",
    // },
  ],
};
