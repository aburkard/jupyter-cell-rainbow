import * as vscode from 'vscode';

type PaletteName = 'rainbow' | 'pastel' | 'ocean' | 'warm' | 'custom';

interface Config {
	enabled: boolean;
	palette: PaletteName;
	customColors: string[];
	opacity: number;
	cycleLength: number;
}

const NOTEBOOK_CELL_SCHEME = 'vscode-notebook-cell';

let decorationTypes: vscode.TextEditorDecorationType[] = [];

export function activate(context: vscode.ExtensionContext) {
	rebuild();

	context.subscriptions.push(
		vscode.window.onDidChangeVisibleTextEditors(() => applyAll()),
		vscode.workspace.onDidChangeNotebookDocument(e => applyToNotebook(e.notebook)),
		vscode.window.onDidChangeActiveNotebookEditor(() => applyAll()),
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('jupyterCellRainbow')) {
				rebuild();
			}
		}),
		vscode.commands.registerCommand('jupyterCellRainbow.toggle', async () => {
			const cfg = vscode.workspace.getConfiguration('jupyterCellRainbow');
			const next = !cfg.get<boolean>('enabled', true);
			await cfg.update('enabled', next, vscode.ConfigurationTarget.Global);
		}),
		vscode.commands.registerCommand('jupyterCellRainbow.refresh', () => rebuild()),
		vscode.commands.registerCommand('jupyterCellRainbow.pickPalette', pickPalette),
		{ dispose: disposeAll }
	);
}

export function deactivate() {
	disposeAll();
}

function readConfig(): Config {
	const cfg = vscode.workspace.getConfiguration('jupyterCellRainbow');
	return {
		enabled: cfg.get<boolean>('enabled', true),
		palette: cfg.get<PaletteName>('palette', 'rainbow'),
		customColors: cfg.get<string[]>('customColors', []),
		opacity: clamp(cfg.get<number>('opacity', 0.12), 0, 1),
		cycleLength: Math.max(2, Math.floor(cfg.get<number>('cycleLength', 12))),
	};
}

function rebuild() {
	disposeAll();
	const cfg = readConfig();
	if (!cfg.enabled) {
		return;
	}
	decorationTypes = buildDecorationTypes(cfg);
	applyAll();
}

function disposeAll() {
	for (const d of decorationTypes) {
		d.dispose();
	}
	decorationTypes = [];
}

function applyAll() {
	for (const editor of vscode.window.visibleTextEditors) {
		applyToEditor(editor);
	}
}

function applyToNotebook(notebook: vscode.NotebookDocument) {
	for (const editor of vscode.window.visibleTextEditors) {
		if (editor.document.uri.scheme !== NOTEBOOK_CELL_SCHEME) {
			continue;
		}
		if (cellNotebook(editor.document)?.uri.toString() === notebook.uri.toString()) {
			applyToEditor(editor);
		}
	}
}

function applyToEditor(editor: vscode.TextEditor) {
	if (editor.document.uri.scheme !== NOTEBOOK_CELL_SCHEME) {
		return;
	}
	if (decorationTypes.length === 0) {
		return;
	}

	const index = cellIndex(editor.document);
	if (index < 0) {
		return;
	}

	const wholeRange = new vscode.Range(0, 0, editor.document.lineCount, 0);

	for (let i = 0; i < decorationTypes.length; i++) {
		if (i === index % decorationTypes.length) {
			editor.setDecorations(decorationTypes[i], [wholeRange]);
		} else {
			editor.setDecorations(decorationTypes[i], []);
		}
	}
}

function cellNotebook(document: vscode.TextDocument): vscode.NotebookDocument | undefined {
	for (const notebook of vscode.workspace.notebookDocuments) {
		if (notebook.getCells().some(cell => cell.document === document)) {
			return notebook;
		}
	}
	return undefined;
}

function cellIndex(document: vscode.TextDocument): number {
	for (const notebook of vscode.workspace.notebookDocuments) {
		const cells = notebook.getCells();
		const idx = cells.findIndex(cell => cell.document === document);
		if (idx >= 0) {
			return idx;
		}
	}
	return -1;
}

function buildDecorationTypes(cfg: Config): vscode.TextEditorDecorationType[] {
	const colors = paletteColors(cfg);
	return colors.map(hex => vscode.window.createTextEditorDecorationType({
		backgroundColor: withAlpha(hex, cfg.opacity),
		isWholeLine: true,
		overviewRulerColor: hex,
		overviewRulerLane: vscode.OverviewRulerLane.Full,
	}));
}

function paletteColors(cfg: Config): string[] {
	if (cfg.palette === 'custom') {
		const cleaned = cfg.customColors
			.map(c => normalizeHex(c))
			.filter((c): c is string => !!c);
		return cleaned.length > 0 ? cleaned : defaultPalette('rainbow', cfg.cycleLength);
	}
	return defaultPalette(cfg.palette, cfg.cycleLength);
}

function defaultPalette(name: PaletteName, n: number): string[] {
	const out: string[] = [];
	for (let i = 0; i < n; i++) {
		const t = i / n;
		switch (name) {
			case 'rainbow':
				out.push(hslToHex(t * 360, 65, 55));
				break;
			case 'pastel':
				out.push(hslToHex(t * 360, 55, 75));
				break;
			case 'ocean':
				out.push(hslToHex(160 + t * 80, 55, 55));
				break;
			case 'warm':
				out.push(hslToHex(t * 60, 70, 55));
				break;
			default:
				out.push(hslToHex(t * 360, 65, 55));
		}
	}
	return out;
}

function hslToHex(h: number, s: number, l: number): string {
	const sN = s / 100;
	const lN = l / 100;
	const c = (1 - Math.abs(2 * lN - 1)) * sN;
	const hP = ((h % 360) + 360) % 360 / 60;
	const x = c * (1 - Math.abs((hP % 2) - 1));
	let r = 0, g = 0, b = 0;
	if (hP < 1) { r = c; g = x; b = 0; }
	else if (hP < 2) { r = x; g = c; b = 0; }
	else if (hP < 3) { r = 0; g = c; b = x; }
	else if (hP < 4) { r = 0; g = x; b = c; }
	else if (hP < 5) { r = x; g = 0; b = c; }
	else { r = c; g = 0; b = x; }
	const m = lN - c / 2;
	return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function rgbToHex(r: number, g: number, b: number): string {
	const h = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
	return `#${h(r)}${h(g)}${h(b)}`;
}

function normalizeHex(raw: string): string | undefined {
	const v = raw.trim();
	if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
	if (/^#[0-9a-fA-F]{3}$/.test(v)) {
		const chars = v.slice(1).split('');
		return `#${chars.map(c => c + c).join('').toLowerCase()}`;
	}
	return undefined;
}

function withAlpha(hex: string, alpha: number): string {
	const n = normalizeHex(hex);
	if (!n) return `rgba(128,128,128,${alpha})`;
	const r = parseInt(n.slice(1, 3), 16);
	const g = parseInt(n.slice(3, 5), 16);
	const b = parseInt(n.slice(5, 7), 16);
	return `rgba(${r},${g},${b},${alpha})`;
}

function clamp(n: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, n));
}

async function pickPalette() {
	const current = readConfig().palette;
	const items: (vscode.QuickPickItem & { value: PaletteName })[] = [
		{ value: 'rainbow', label: 'Rainbow', description: 'Full hue cycle' },
		{ value: 'pastel',  label: 'Pastel',  description: 'Soft, high-lightness' },
		{ value: 'ocean',   label: 'Ocean',   description: 'Blues and greens' },
		{ value: 'warm',    label: 'Warm',    description: 'Reds, oranges, yellows' },
		{ value: 'custom',  label: 'Custom',  description: 'Use jupyterCellRainbow.customColors' },
	];
	for (const it of items) {
		if (it.value === current) it.label = `$(check) ${it.label}`;
	}
	const pick = await vscode.window.showQuickPick(items, {
		placeHolder: 'Pick a palette',
		matchOnDescription: true,
	});
	if (pick) {
		await vscode.workspace.getConfiguration('jupyterCellRainbow')
			.update('palette', pick.value, vscode.ConfigurationTarget.Global);
	}
}
