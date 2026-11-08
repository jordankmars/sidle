# sidle

> iOS Mail-style swipe actions for list rows.

Swipe partway to reveal a row's actions, or all the way to commit the main one.
A vertical drag still scrolls the page, a quick flick opens a row even over a short
distance, and only one row is open at a time.

## Status

Early days. The framework-agnostic core is in place: a small state machine that
handles axis locking, rubber banding, velocity, full-swipe commit, right-to-left
layouts, the iOS edge-swipe-back zone and virtualized lists. The React adapter
is next, so nothing is published yet.

## Installation

```sh
npm install sidle
```

## Usage

The planned React API:

```tsx
<Sidle.Row>
	<Sidle.Actions side="start">
		<Sidle.Action onSelect={archive}>Archive</Sidle.Action>
	</Sidle.Actions>
	<Sidle.Content>…row…</Sidle.Content>
	<Sidle.Actions side="end">
		<Sidle.Action onSelect={flag}>Flag</Sidle.Action>
		<Sidle.Action onSelect={remove} commit>
			Delete
		</Sidle.Action>
	</Sidle.Actions>
</Sidle.Row>;
```

## Adapters

| Framework | Import path    | Status      |
| --------- | -------------- | ----------- |
| React     | `sidle/react`  | In progress |
| Vue       | `sidle/vue`    | Coming soon |
| Svelte    | `sidle/svelte` | Coming soon |

## Development

```sh
pnpm install
pnpm test        # unit tests for the core
pnpm playground  # Vite dev server with a hand-wired inbox demo
```

The core lives in `src/core` and never touches the DOM. You feed it pointer
positions and frame ticks, and it tells you where the row should be. The
playground in `playground/main.tsx` wires it up by hand, which is the quickest
way to feel out a change before it reaches an adapter. Open it on a phone with
`pnpm playground --host` to try it with touch.

## Contributing

Contributions are welcome. Please open an issue to discuss changes before submitting a pull request.

## License

[MIT](./LICENSE)
