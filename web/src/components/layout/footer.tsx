"use client";

import { Footer16 } from "@/components/foot";

export function Footer() {
  return (
    <Footer16
      copyright={`© ${new Date().getFullYear()} Astra. All rights reserved.`}
    />
  );
}
