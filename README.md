# Jupyter Cell Rainbow

A tiny VS Code extension that tints each notebook cell by its position, so scrolling through a long notebook doesn't feel like wading through identical gray boxes.

![Screenshot](docs/screenshot.png)

## Install

Grab the latest `.vsix` from the [releases page](https://github.com/aburkard/jupyter-cell-rainbow/releases) (or build one locally — see below) and:

```bash
code --install-extension jupyter-cell-rainbow-0.1.0.vsix
```

## Use

Open any `.ipynb`. Cells pick up a tinted background and a matching stripe in the overview ruler on the right edge. Nothing to configure.

## Settings

`Cmd+,` → search **"jupyter cell rainbow"**:

| Setting | Default | What it does |
| --- | --- | --- |
| `enabled` | `true` | Turn coloring on/off. |
| `palette` | `rainbow` | `rainbow`, `pastel`, `ocean`, `warm`, or `custom`. |
| `customColors` | — | Hex colors used when `palette` is `custom`. |
| `opacity` | `0.12` | Background tint opacity. Higher = more saturated. |
| `cycleLength` | `12` | Distinct colors before the palette repeats. |

## Commands

`Cmd+Shift+P`:

- **Jupyter Cell Rainbow: Toggle** — on/off
- **Jupyter Cell Rainbow: Pick Palette** — quick palette switcher
- **Jupyter Cell Rainbow: Refresh Colors** — force reapply

## Limits

Decoration covers the Monaco editor area inside each cell, not the outer cell frame/toolbar. That's a VS Code extension API limitation (issue [#15489](https://github.com/microsoft/vscode-jupyter/issues/15489)) — the full-frame look requires CSS injection via a separate tool like [Apc Customize UI++](https://marketplace.visualstudio.com/items?itemName=drcika.apc-extension), which in turn patches VS Code's install files and wants admin. Not worth it for most people.

Rendered (non-edit) markdown cells don't have a text editor to decorate, so they stay uncolored.

## Build from source

```bash
npm install
npm run build
npx vsce package
```

## License

MIT
