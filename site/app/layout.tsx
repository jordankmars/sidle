import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
	variable: "--font-jetbrains-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: { default: "Tuckaway", template: "%s · Tuckaway" },
	description: "iOS Mail-style swipe actions for list rows.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html
			lang="en"
			className={`${inter.variable} ${jetbrainsMono.variable}`}
			suppressHydrationWarning
		>
			<body className="flex min-h-dvh flex-col bg-white font-sans text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
				<ThemeProvider>
					<SiteHeader />
					{children}
				</ThemeProvider>
			</body>
		</html>
	);
}
