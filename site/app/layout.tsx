import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Sidle",
	description: "iOS Mail-style swipe actions for list rows.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
