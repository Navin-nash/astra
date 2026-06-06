"use client";

import * as React from "react";
import { GithubLogo, XLogo } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import { RippleButton } from "@/components/ui/ripple-button";

export function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <Image src="/name.svg" alt="Astra" width={96} height={32} className="h-7 w-auto" style={{ width: "auto" }} loading="eager" />
          </div>

          {/* Links */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {[
              { label: "Privacy", href: "#" },
              { label: "Terms", href: "#" },
              { label: "Docs", href: "#" },
            ].map(({ label, href }) => (
              <RippleButton
                key={label}
                onClick={() => { window.location.href = href; }}
                rippleColor="currentColor"
                className="h-7 px-3 text-xs font-normal rounded-full border-0 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                {label}
              </RippleButton>
            ))}
          </div>

          {/* Social */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <RippleButton
              onClick={() => { window.open("#", "_blank"); }}
              rippleColor="currentColor"
              aria-label="GitHub"
              className="w-8 h-8 p-0 rounded-full border-0 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <GithubLogo size={16} />
            </RippleButton>
            <RippleButton
              onClick={() => { window.open("#", "_blank"); }}
              rippleColor="currentColor"
              aria-label="X / Twitter"
              className="w-8 h-8 p-0 rounded-full border-0 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <XLogo size={16} />
            </RippleButton>
          </div>
        </div>
      </div>
    </footer>
  );
}
