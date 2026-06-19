"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";


export interface NavLink {
    label: string;
    href: string;
    active?: boolean;
}

export interface SocialLink {
    label: string;
    href: string;
}

export interface Hero1Props {
    brand?: React.ReactNode;
    navLinks?: NavLink[];
    headline?: React.ReactNode;
    ctaLabel?: string;
    ctaHref?: string;
    description?: string;
    socialLinks?: SocialLink[];
    signInLabel?: string;
    signInHref?: string;
    onNavLinkClick?: (link: NavLink) => void;
    className?: string;
}

const DEFAULT_NAV: NavLink[] = [
    { label: "Products", href: "#", active: true },
    { label: "About", href: "#" },
    { label: "Features", href: "#" },
    { label: "Support", href: "#" },
];

const DEFAULT_SOCIAL: SocialLink[] = [
    { label: "Twitter", href: "#" },
    { label: "GitHub", href: "#" },
    { label: "LinkedIn", href: "#" },
];

export default function Hero1({
    brand = "Astra",
    navLinks = DEFAULT_NAV,
    headline = (
        <>
            Your GitHub,
            <br />
            <span className="text-brand">as a portfolio.</span>
        </>
    ),
    ctaLabel = "Get early access",
    ctaHref = "#",
    description = "Connect GitHub once. Astra reads your codebase and ships a portfolio that shows how you actually build.",
    socialLinks = DEFAULT_SOCIAL,
    signInLabel = "Sign in",
    signInHref = "#",
    onNavLinkClick,
    className,
}: Hero1Props) {
    const [links, setLinks] = useState<NavLink[]>(navLinks);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleNavLinkClick = (clickedLink: NavLink, e: React.MouseEvent) => {
        if (onNavLinkClick) {
            e.preventDefault();
            onNavLinkClick(clickedLink);
        }
        setLinks(
            links.map((link) => ({
                ...link,
                active: link.label === clickedLink.label,
            }))
        );
        setIsMobileMenuOpen(false);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.12,
                delayChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 24 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
        },
    };

    const backgroundVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { duration: 1.0, ease: "easeOut" as const },
        },
    };

    return (
        <section
            className={cn(
                "relative w-full min-h-screen flex flex-col justify-between overflow-hidden bg-background text-foreground",
                className
            )}
        >
            {/* ── Ambient background ── */}
            <motion.div
                initial="hidden"
                animate="visible"
                variants={backgroundVariants}
                className="absolute inset-0 pointer-events-none select-none z-0"
                aria-hidden
            >
                {/* Grid dots */}
                <div className="absolute inset-0 grid-dots opacity-35" />

                {/* Brand glow — bottom-left quadrant */}
                <div
                    className="absolute bottom-0 left-0 w-[70%] h-[65%]"
                    style={{
                        background:
                            "radial-gradient(ellipse 80% 80% at 20% 80%, color-mix(in oklch, var(--brand) 8%, transparent) 0%, transparent 70%)",
                    }}
                />

                {/* Edge fade to bg */}
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 40%, var(--background) 100%)",
                    }}
                />
            </motion.div>

            {/* ── Navbar ── */}
            <motion.header
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative z-50 flex items-center justify-between px-6 py-6 md:px-12 lg:px-20"
            >
                {/* Brand */}
                <a href="/" className="flex items-center gap-1 group">
                    {typeof brand === "string" ? (
                        <span className="relative text-foreground font-semibold text-lg tracking-tight select-none">
                            {brand}
                            <span className="absolute -top-1 -right-2 text-brand text-xs select-none">
                                •
                            </span>
                        </span>
                    ) : (
                        brand
                    )}
                </a>

                {/* Desktop nav */}
                <nav className="hidden md:block">
                    <ul className="flex items-center gap-12 lg:gap-16">
                        {links.map((link) => (
                            <li key={link.label} className="relative py-1">
                                <a
                                    href={link.href}
                                    onClick={(e) => handleNavLinkClick(link, e)}
                                    className={cn(
                                        "text-base font-medium transition-colors duration-300 relative px-0.5 tracking-wide",
                                        link.active
                                            ? "text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {link.label}
                                    {link.active && (
                                        <motion.span
                                            layoutId="hero1-activeUnderline"
                                            className="absolute left-0 right-0 bottom-[-4px] h-[1.5px] bg-brand"
                                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Sign-in */}
                <div className="hidden md:block ml-4">
                    <a
                        href={signInHref}
                        className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg border border-foreground/20 text-foreground text-base font-medium bg-transparent hover:border-foreground/40 hover:bg-foreground/5 transition-all duration-300"
                    >
                        {signInLabel}
                    </a>
                </div>

                {/* Mobile hamburger */}
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="md:hidden flex flex-col justify-center items-center w-9 h-9 rounded-full border border-border bg-muted/50 hover:bg-muted transition-colors z-50 relative"
                    aria-label="Toggle navigation menu"
                >
                    <div className="w-4 h-4 flex flex-col justify-between items-center relative">
                        <span
                            className={cn(
                                "w-full h-[1.5px] bg-foreground transition-all duration-300 absolute left-0",
                                isMobileMenuOpen ? "rotate-45 top-[7px]" : "top-[2px]"
                            )}
                        />
                        <span
                            className={cn(
                                "w-full h-[1.5px] bg-foreground transition-all duration-300 absolute left-0 top-[7px]",
                                isMobileMenuOpen && "opacity-0"
                            )}
                        />
                        <span
                            className={cn(
                                "w-full h-[1.5px] bg-foreground transition-all duration-300 absolute left-0",
                                isMobileMenuOpen ? "-rotate-45 top-[7px]" : "top-[12px]"
                            )}
                        />
                    </div>
                </button>
            </motion.header>

            {/* ── Mobile menu ── */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="fixed inset-0 bg-background/98 backdrop-blur-md z-40 flex flex-col justify-between px-6 py-24 md:hidden"
                    >
                        <nav className="flex flex-col gap-6 mt-8">
                            {links.map((link, idx) => (
                                <motion.div
                                    key={link.label}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <a
                                        href={link.href}
                                        onClick={(e) => handleNavLinkClick(link, e)}
                                        className={cn(
                                            "text-3xl font-semibold transition-colors duration-200 block",
                                            link.active ? "text-foreground" : "text-muted-foreground"
                                        )}
                                    >
                                        {link.label}
                                    </a>
                                </motion.div>
                            ))}
                        </nav>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className="flex flex-col gap-6"
                        >
                            <a
                                href={signInHref}
                                className="w-full py-3.5 rounded-full border border-border text-foreground text-center text-base font-medium bg-muted/30 hover:bg-muted transition-colors"
                            >
                                {signInLabel}
                            </a>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Main hero content ── */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative z-10 flex-1 flex flex-col justify-between px-6 pt-12 pb-10 md:px-12 lg:px-20 md:pt-16 md:pb-12"
            >
                {/* Top: headline + CTA */}
                <div className="flex flex-col gap-8 md:gap-10 max-w-[900px] mt-[5vh]">
                    <motion.h1
                        variants={itemVariants}
                        className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.06] tracking-[-0.04em] text-foreground"
                    >
                        {headline}
                    </motion.h1>

                    <motion.div variants={itemVariants} className="w-fit">
                        <a
                            href={ctaHref}
                            className="inline-flex w-fit items-center gap-4 bg-foreground text-background font-medium text-sm p-1 pl-4 rounded-lg hover:bg-foreground/90 transition-all duration-300 shadow-[0_4px_16px_color-mix(in_oklch,var(--foreground)_6%,transparent)] group"
                        >
                            <span>{ctaLabel}</span>
                            <span className="w-8 h-8 rounded-md bg-brand flex items-center justify-center shrink-0 overflow-hidden relative">
                                <ArrowUpRight className="w-4 h-4 text-white transition-transform duration-300 ease-out group-hover:translate-x-[2px] group-hover:translate-y-[-2px]" />
                            </span>
                        </a>
                    </motion.div>
                </div>

                {/* Bottom: description + socials + scroll */}
                <motion.div
                    variants={itemVariants}
                    className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 lg:gap-10 mt-auto pt-16 w-full relative"
                >
                    <div className="md:max-w-2xl">
                        <p className="text-foreground/70 text-base md:text-lg lg:text-xl leading-relaxed font-normal whitespace-pre-line">
                            {description}
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between lg:justify-end gap-10 pb-1 w-full lg:w-auto">
                        <div className="flex items-center gap-6 lg:gap-10 order-1 lg:order-2">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    className="text-muted-foreground text-base lg:text-lg hover:text-foreground transition-colors duration-200 tracking-wide"
                                >
                                    {social.label}
                                </a>
                            ))}
                        </div>

                        <div className="hidden md:flex items-center gap-3 text-muted-foreground text-sm lg:text-base tracking-wide order-2 lg:order-1 lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:bottom-1">
                            <span>Scroll to Discover</span>
                            <motion.span
                                animate={{ y: [0, 4, 0] }}
                                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                            >
                                <ArrowDown className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                            </motion.span>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </section>
    );
}
