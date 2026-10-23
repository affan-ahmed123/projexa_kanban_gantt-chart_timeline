import type { Metadata } from "next";
import type { ReactElement } from "react";
import { application } from "@/constants/application";
import type { RootLayoutProps } from "@/types";
import "./globals.css";

export const metadata: Metadata = {
  title: application.name,
  description: application.description
};

const RootLayout = ({ children }: RootLayoutProps): ReactElement => (
  <html lang="en" suppressHydrationWarning>
    <head>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})()`
        }}
      />
    </head>
    <body>{children}</body>
  </html>
);

export default RootLayout;
