import React from "react";
import Image from "next/image";
import { siteConfig } from "@/configs/site-config";
import Link from "next/link";
import { Icons } from "@/components/icons";

type Props = {
  children: React.ReactNode;
};

export default function AuthLayout({ children }: Props) {
  return (
    <>
      <div className="container py-6 md:py-16">
        <div className="lg:border-solid lg:border lg:rounded-lg bg-slate-50 dark:bg-background">
          <div className="relative h-[800px] flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
              <Image
                src="https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/article-images/3OdR9eoaNqmHfxV3KnHW.png"
                alt="Image"
                className="absolute inset-0 bg-zinc-900 h-full w-full object-cover opacity-50 bg-center bg-no-repeat rounded-s-xl"
                width={512}
                height={512}
              />
              <Link
                href="/"
                className="flex items-center space-x-2 drop-shadow-md"
              >
                {/* <Icons.logo /> */}
                <div className="relative z-20 flex items-center text-lg drop-shadow-lg font-bold">
                  {siteConfig.name}
                </div>
              </Link>
              <div className="relative z-20 mt-auto">
                <p className="text-lg drop-shadow-lg">
                  {siteConfig.description}
                </p>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center">
              <div className="w-full max-w-xs">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
