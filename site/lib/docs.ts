export const SECTIONS = [
	{
		title: "Basics",
		pages: [
			{ title: "Getting Started", href: "/docs" },
			{ title: "API", href: "/docs/api" },
		],
	},
	{
		title: "Guides",
		pages: [
			{ title: "Actions", href: "/docs/actions" },
			{ title: "Keyboard", href: "/docs/keyboard" },
			{ title: "Styling", href: "/docs/styling" },
		],
	},
];

export const DOCS = SECTIONS.flatMap((section) => section.pages);
