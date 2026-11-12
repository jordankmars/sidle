# sidle

[![CI](https://github.com/jordankmars/sidle/actions/workflows/ci.yml/badge.svg)](https://github.com/jordankmars/sidle/actions/workflows/ci.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

> iOS Mail-style swipe actions for list rows.

Swipe partway to reveal a row's actions, or all the way to commit the main one.
A vertical drag still scrolls the page, a quick flick opens a row even over a short
distance, and only one row is open at a time.

## Status

Early days. The framework-agnostic core and the React adapter are both in place,
but the package isn't on npm yet. To try it now, clone the repo and run the
playground (see [Development](#development)).

## Installation

Once it's published:

```sh
npm install sidle
```

React 18 or later is a peer dependency.

## Usage

```tsx
import * as Sidle from "sidle/react";

<Sidle.Row value={mail.id}>
	<Sidle.Actions side="start">
		<Sidle.Action onSelect={archive}>Archive</Sidle.Action>
	</Sidle.Actions>
	<Sidle.Content onClick={open}>…row…</Sidle.Content>
	<Sidle.Actions side="end">
		<Sidle.Action shortcut="f" onSelect={flag}>
			Flag
		</Sidle.Action>
		<Sidle.Action shortcut="Delete" onSelect={remove} commit>
			Delete
		</Sidle.Action>
	</Sidle.Actions>
</Sidle.Row>;
```

### Parts

Every part takes the props of the element it renders and forwards its ref.

| Part      | Renders  | Props                                                                                                    |
| --------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `Group`   | nothing  | None                                                                                                     |
| `Row`     | `div`    | `value`, `dir`, `edgeGuard` (px, default 24, 0 to turn it off), `commitMomentum` (seconds, default 0.05) |
| `Content` | `div`    | None                                                                                                     |
| `Actions` | `div`    | `side` (`"start"` or `"end"`), `width` (px, default 75 per action)                                       |
| `Action`  | `button` | `onSelect`, `commit`, `shortcut` (a key or an array of keys)                                             |

### Commit actions

A `commit` action is the one a full swipe runs. The row slides away and collapses
first, and `onSelect` fires after that, so `onSelect={remove}` takes the row out
of your list at the right moment. A commit can't be undone by the row: if
`onSelect` doesn't remove it, it stays collapsed at zero height.

A fast flick commits a little early, once it's past the side's actions. Tune that
with `commitMomentum` on `Row`: it's how many seconds of the release speed count
towards the commit point, and 0 goes by distance alone.

Plain actions run `onSelect` straight away and close the row.

### One open row

Rows share one group across the page, so opening a row closes any other. Wrap a
list in `Sidle.Group` to let it keep its own open row. Tapping outside every row
closes whichever is open.

In a virtualized list, give each row a stable `value`. A row that scrolls away
open comes back open.

### Keyboard

These work while a row's `Content` has focus:

| Key                    | Does                                                |
| ---------------------- | --------------------------------------------------- |
| An action's `shortcut` | Runs that action                                    |
| Left and right arrows  | Reveals a side, whose buttons can then be tabbed to |
| Escape                 | Closes the row                                      |
| Enter                  | Clicks `Content`                                    |

### Styling

There's no stylesheet to import. The parts set only the inline styles swiping
depends on, and the rest is yours. Give `Content` an opaque background, and don't
set `width` on `Actions` or `transform` on `Content`, since those move every frame.

| Attribute        | On        | Value                                                                |
| ---------------- | --------- | -------------------------------------------------------------------- |
| `data-phase`     | `Row`     | `idle`, `pending`, `dragging`, `settling`, `committing`, `committed` |
| `data-open-side` | `Row`     | `start` or `end`, when open                                          |
| `data-side`      | `Actions` | `start` or `end`                                                     |
| `data-armed`     | `Actions` | Present when letting go would commit                                 |
| `data-commit`    | `Action`  | Present on a commit action                                           |

## Adapters

| Framework | Import path    | Status      |
| --------- | -------------- | ----------- |
| React     | `sidle/react`  | Unreleased  |
| Vue       | `sidle/vue`    | Coming soon |
| Svelte    | `sidle/svelte` | Coming soon |

## Development

Needs Node 20+ and pnpm.

```sh
pnpm install
pnpm test        # unit tests for the core and the React adapter
pnpm playground  # Vite dev server with an inbox demo
pnpm site:dev    # the docs site, in site/
pnpm lint        # Biome
pnpm typecheck
```

The core lives in `src/core` and never touches the DOM. You feed it pointer
positions and frame ticks, and it tells you where the row should be. The React
adapter in `src/react` connects it to the page, and the playground in
`playground/main.tsx` is built on the adapter. Open it on a phone with
`pnpm playground --host` to try it with touch.

## Contributing

Bug reports and pull requests are welcome. For anything bigger than a small fix,
open an issue first so the approach can be agreed on. CI runs lint, typecheck,
the tests and both builds, so running those locally first saves a round trip.

## License

[MIT](./LICENSE)
