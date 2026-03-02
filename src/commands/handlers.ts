import * as vscode from "vscode";
import { WebviewManager } from "../webview/WebviewManager";
import {
  generateDocstring,
  generateReview,
  generateExplanation,
  analyzeAndSuggestCommit,
  generateAutomatedReview,
  generateTests,
  generateIntelligentRefactoring,
  generateIntelligentSelectionRefactoring,
  generateReadme,
  summarizeFileContent,
  generateIssueFix
} from "../ai/ai";
import { executeCommand, executeGitCommit } from "../utils/command";
import { buildProjectContext } from "../utils/projectContext";
import { diagnosticCollection, reviewStatusBar } from "../extension";
import * as path from "path";
import { Buffer } from 'buffer';

// -- Fix 1: SecretStorage key ------------------------------------------------
const SECRET_KEY = "codecritter.apiKey";

async function getApiKeyFromSecrets(context: vscode.ExtensionContext): Promise<string | undefined> {
  return context.secrets.get(SECRET_KEY);
}

// -- Fix 2 & 3: per-document debounce (2 s) for auto-review -----------------
let isReviewInProgress = false;
const reviewDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();


export async function startReviewHandler(context: vscode.ExtensionContext) {
    const panel = new WebviewManager(context);
    panel.onDidReceiveMessage(
        async (message) => {
          const config = vscode.workspace.getConfiguration("codecritter");

          switch (message.command) {
            case "getApiKey":
              panel.postMessage({
                command: "setApiKey",
                // Return a masked placeholder so the webview knows a key is set,
                // but never expose the actual secret value to the renderer.
                apiKey: (await context.secrets.get(SECRET_KEY)) ? "••••••••" : "",
              });
              return;

            case "getAutoReviewSettings":
              panel.postMessage({
                command: "setAutoReviewSettings",
                autoReviewEnabled: config.get("autoReviewEnabled", true),
                reviewThreshold: config.get("reviewThreshold", "medium"),
                commitAssistEnabled: config.get("commitAssistEnabled", true),
              });
              return;

            case "saveAutoReviewSettings":
              try {
                await config.update(
                  "autoReviewEnabled",
                  message.autoReviewEnabled,
                  vscode.ConfigurationTarget.Global
                );
                await config.update(
                  "reviewThreshold",
                  message.reviewThreshold,
                  vscode.ConfigurationTarget.Global
                );
                await config.update(
                  "commitAssistEnabled",
                  message.commitAssistEnabled,
                  vscode.ConfigurationTarget.Global
                );

                vscode.window.showInformationMessage(
                  "Auto Review settings saved successfully!"
                );
              } catch (error) {
                console.error("Failed to save auto review settings:", error);
                vscode.window.showErrorMessage(
                  "Could not save auto review settings."
                );
              }
              return;

            // Fix 1: store key in OS keychain, not settings.json
            case "saveApiKey":
              try {
                await context.secrets.store(SECRET_KEY, message.apiKey);
                vscode.window.showInformationMessage(
                  "CodeCritter API Key saved securely!"
                );
              } catch (error) {
                console.error("Failed to save API key:", error);
                vscode.window.showErrorMessage(
                  "Could not save the API key. Please check the developer console for errors."
                );
              }
              return;

            case "review":
              try {
                const userApiKey = await context.secrets.get(SECRET_KEY);
                const currentPersona = config.get<string>("persona", "Strict Tech Lead");

                if (!userApiKey) {
                  vscode.window.showWarningMessage(
                    "Please set your Gemini API key in the CodeCritter settings first."
                  );
                  return;
                }

                const reviewData = await generateReview(
                  message.code,
                  currentPersona,
                  userApiKey
                );

                panel.postMessage({
                  command: "displayReview",
                  review: reviewData.review,
                  productionRisk: reviewData.productionRisk,
                });
              } catch (error) {
                console.error("Error generating review:", error);
                vscode.window.showErrorMessage(
                  `Failed to generate review: ${
                    error instanceof Error ? error.message : "Unknown error"
                  }`
                );
              }
              return;

            case "generateDocstring":
              try {
                const userApiKey = await context.secrets.get(SECRET_KEY);
                if (!userApiKey) {
                  vscode.window.showWarningMessage(
                    "Please set your Gemini API key in the CodeCritter settings first."
                  );
                  return;
                }

                const docstring = await generateDocstring(message.code, userApiKey);

                panel.postMessage({
                  command: "displayDocstring",
                  docstring,
                });
              } catch (error) {
                console.error("Error generating docstring:", error);
                vscode.window.showErrorMessage(
                  `Failed to generate docstring: ${
                    error instanceof Error ? error.message : "Unknown error"
                  }`
                );
              }
              return;
            case "copyToClipboard":
              if (message.text) {
                await vscode.env.clipboard.writeText(message.text);
                vscode.window.showInformationMessage("Review copied to clipboard!");
              }
              return;
          }
        },
        undefined,
        context.subscriptions
      );
}

export async function toggleAutoReviewHandler() {
  const config = vscode.workspace.getConfiguration("codecritter");
  const currentSetting = config.get("autoReviewEnabled", true);
  await config.update(
    "autoReviewEnabled",
    !currentSetting,
    vscode.ConfigurationTarget.Global
  );

  vscode.window.showInformationMessage(
    `CodeCritter Auto Review ${!currentSetting ? "Enabled" : "Disabled"}`
  );
}

// Fix 2: standalone commit-assist command (decoupled from save)
export async function commitAssistHandler(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('codecritter');
  const userApiKey = await getApiKeyFromSecrets(context);
  if (!userApiKey) {
    vscode.window.showWarningMessage('Please set your Gemini API key in the CodeCritter settings.');
    return;
  }

  const stagedDiff = await executeCommand('git diff --staged');
  if (!stagedDiff.trim()) {
    vscode.window.showInformationMessage('CodeCritter: No staged changes found. Stage some files first.');
    return;
  }

  try {
    const activeFile = vscode.window.activeTextEditor?.document.fileName ?? '';
    const analysis = await analyzeAndSuggestCommit(stagedDiff, activeFile, userApiKey);

    if (!analysis.ready) {
      vscode.window.showInformationMessage('CodeCritter: Changes do not look ready to commit yet.');
      return;
    }

    const persona = config.get<string>('persona', 'Strict Tech Lead');
    const personaPrompts: Record<string, string> = {
      'Supportive Mentor': "Great work! Edit or accept the commit message:",
      'Sarcastic Reviewer': "Fine. Edit it if you must, then commit.",
      'Code Poet': "A fine change. Craft your commit message:",
      'Paranoid Security Engineer': "Acceptable. Review the message carefully:",
      'Rubber Duck': "What does this commit actually do? Edit the message:",
      'Strict Tech Lead': "Ready to commit. Edit the message if needed:",
    };
    const prompt = personaPrompts[persona] ?? "Edit or accept the commit message:";

    const editedMessage = await vscode.window.showInputBox({
      title: 'CodeCritter Commit Assistant',
      prompt,
      value: analysis.commitMessage,
      placeHolder: 'Enter commit message',
      validateInput: (val) => val.trim() ? null : 'Commit message cannot be empty',
    });

    if (editedMessage !== undefined) {
      try {
        await executeGitCommit(editedMessage.trim());
        vscode.window.showInformationMessage(`CodeCritter: Committed — "${editedMessage.trim()}"`);
      } catch (commitError) {
        const msg = commitError instanceof Error ? commitError.message : 'Unknown error';
        vscode.window.showErrorMessage(`CodeCritter: Commit failed — ${msg}`);
      }
    }
  } catch (error) {
    console.error('CodeCritter: Failed to analyze for commit:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`CodeCritter: Commit assist failed — ${msg}`);
  }
}

// Fix 3: debounced auto-review — no commit assist, 2 s idle before firing
export async function onDidSaveTextDocumentHandler(document: vscode.TextDocument, context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('codecritter');
    const userApiKey = await getApiKeyFromSecrets(context);
    if (!userApiKey) {
        return;
    }

    const autoReviewEnabled = config.get('autoReviewEnabled', true);
    if (!autoReviewEnabled || shouldSkipFile(document)) {
        return;
    }

    // Cancel any pending timer for this document
    const docKey = document.uri.toString();
    const existing = reviewDebounceTimers.get(docKey);
    if (existing) {
        clearTimeout(existing);
    }

    // Schedule the review to fire 2 s after the last save
    const timer = setTimeout(async () => {
        reviewDebounceTimers.delete(docKey);

        if (isReviewInProgress) { return; }
        isReviewInProgress = true;
        try {
            const currentContent = document.getText();
            await performAutomatedReview(currentContent, document, userApiKey, config, context);
        } catch (error) {
            console.error('CodeCritter: Failed to perform automated review:', error);
        } finally {
            isReviewInProgress = false;
        }
    }, 2000);

    reviewDebounceTimers.set(docKey, timer);
}


export async function selectPersonaHandler() {
  const config = vscode.workspace.getConfiguration("codecritter");

  const personas = [
    "Strict Tech Lead",
    "Supportive Mentor",
    "Sarcastic Reviewer",
    "Code Poet",
    "Paranoid Security Engineer",
    "Rubber Duck",
  ];

  const selectedPersona = await vscode.window.showQuickPick(personas, {
    placeHolder: "Choose a reviewer persona for CodeCritter",
  });

  if (selectedPersona) {
    await config.update(
      "persona",
      selectedPersona,
      vscode.ConfigurationTarget.Global
    );
    vscode.window.showInformationMessage(
      `CodeCritter persona set to: ${selectedPersona}`
    );
  }
}

export async function explainCodeHandler(context: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    vscode.window.showInformationMessage("Please select some code to explain.");
    return;
  }

  const apiKey = await getApiKeyFromSecrets(context);
  if (!apiKey) {
    vscode.window.showWarningMessage(
      "Please set your Gemini API key in the CodeCritter settings."
    );
    return;
  }

  const selectedText = editor.document.getText(editor.selection);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "CodeCritter is explaining...",
      cancellable: false,
    },
    async () => {
      try {
        const explanation = await generateExplanation(selectedText, apiKey);
        vscode.window.showInformationMessage(explanation, { modal: true });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred.";
        vscode.window.showErrorMessage(
          `Failed to get explanation: ${errorMessage}`
        );
      }
    }
  );
}

export function showStatsHandler(context: vscode.ExtensionContext) {
  const stats = context.globalState.get('codeCritterStats', { kudos: 0, issuesFixed: 0 });
  vscode.window.showInformationMessage(
    `CodeCritter Stats | Kudos Received: ${stats.kudos} | Issues Fixed: ${stats.issuesFixed}`,
    { modal: true }
  );
}

const MAX_AUTO_REVIEW_FILE_LENGTH = 10000;

function shouldSkipFile(document: vscode.TextDocument): boolean {
  const fileName = document.fileName.toLowerCase();
  const skipExtensions = [
    ".json",
    ".md",
    ".txt",
    ".log",
    ".xml",
    ".yaml",
    ".yml",
  ];
  const skipPaths = [
    "/.git/",
    "/node_modules/",
    "/dist/",
    "/build/",
    "/.vscode/",
  ];

  if (skipPaths.some((path) => document.uri.path.includes(path))) {
    return true;
  }

  if (skipExtensions.some((ext) => fileName.endsWith(ext))) {
    return true;
  }

  if (document.getText().length > MAX_AUTO_REVIEW_FILE_LENGTH) {
    return true;
  }

  return false;
}

async function performAutomatedReview(
  content: string,
  document: vscode.TextDocument,
  apiKey: string,
  config: vscode.WorkspaceConfiguration,
  context: vscode.ExtensionContext,
  isDiff: boolean = false
) {
  try {
    const persona = config.get('persona', 'Strict Tech Lead') as string;
    const projectContext = isDiff ? '' : await buildProjectContext(document);

    const reviewResult = await generateAutomatedReview(
      content,
      persona,
      apiKey,
      isDiff,
      projectContext
    );

    const threshold = config.get<string>('reviewThreshold', 'medium');
    const severityRank: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const thresholdRank = severityRank[threshold] ?? 2;

    const diagnostics: vscode.Diagnostic[] = [];
    diagnosticCollection.delete(document.uri);

    if (reviewResult && reviewResult.issues && reviewResult.issues.length > 0) {
      for (const issue of reviewResult.issues) {
        if ((severityRank[issue.severity] ?? 1) < thresholdRank) {
          continue;
        }

        const line = issue.lineNumber - 1;
        if (line < 0 || line >= document.lineCount) {
          console.warn(`CodeCritter: AI returned an out-of-bounds line number (${issue.lineNumber}) and it was ignored.`);
          continue;
        }

        const range = new vscode.Range(line, 0, line, document.lineAt(line).text.length);
        const severity = issue.severity === 'high' ? vscode.DiagnosticSeverity.Error :
                         issue.severity === 'medium' ? vscode.DiagnosticSeverity.Warning :
                         vscode.DiagnosticSeverity.Information;

        const diagnostic = new vscode.Diagnostic(range, issue.message, severity);
        diagnostic.source = 'CodeCritter';
        diagnostics.push(diagnostic);
      }
      diagnosticCollection.set(document.uri, diagnostics);
    }

    if (diagnostics.length > 0) {
      reviewStatusBar.text = `$(warning) ${diagnostics.length} issue${diagnostics.length === 1 ? '' : 's'}`;
      reviewStatusBar.tooltip = 'CodeCritter found issues — click a squiggle to fix';
      reviewStatusBar.show();
    } else if (reviewResult && reviewResult.isClean) {
        const kudosMessages = {
          'Strict Tech Lead': '✅ Solid work. This code meets standards.',
          'Supportive Mentor': '🎉 Fantastic job! This code is clean, readable, and well-structured.',
          'Sarcastic Reviewer': `Wow, you actually wrote something I can't complain about. Don't get used to it.`,
          'Code Poet': '✨ A truly elegant piece of code. Well done.',
          'Paranoid Security Engineer': 'Scan complete. No immediate threats detected. For now.',
          'Rubber Duck': 'Everything seems to be in its place. What assumptions are you making here?'
        };
        const message = kudosMessages[persona as keyof typeof kudosMessages] || 'Good job! No issues found.';
        vscode.window.showInformationMessage(`CodeCritter: ${message}`);

        reviewStatusBar.text = '$(check) Clean';
        reviewStatusBar.tooltip = 'CodeCritter: No issues found';
        reviewStatusBar.show();

        const stats = context.globalState.get('codeCritterStats', { kudos: 0, issuesFixed: 0 });
        stats.kudos += 1;
        context.globalState.update('codeCritterStats', stats);
    }

  } catch (error) {
    console.error('CodeCritter: [Auto-Review] An error occurred.', error);
    reviewStatusBar.text = '$(error) Review error';
    reviewStatusBar.tooltip = 'CodeCritter: Error during review';
    reviewStatusBar.show();
  }
}

const LANGUAGE_FALLBACK_FRAMEWORKS: Record<string, string> = {
  python:     'pytest',
  go:         "Go's built-in testing package",
  java:       'JUnit 5',
  rust:       "Rust's built-in test framework",
  csharp:     'NUnit',
  ruby:       'RSpec',
  swift:      'XCTest',
  kotlin:     'JUnit 5 with kotlin.test',
  dart:       'Flutter test',
  php:        'PHPUnit',
};

async function detectTestFramework(document: vscode.TextDocument): Promise<string> {
  const rootUri = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!rootUri) {
    return LANGUAGE_FALLBACK_FRAMEWORKS[document.languageId] ?? 'Jest';
  }

  try {
    const raw = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(rootUri, 'package.json'));
    const pkg = JSON.parse(Buffer.from(raw).toString('utf-8'));
    const allDeps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };

    if (allDeps['vitest'])                         { return 'Vitest'; }
    if (allDeps['jest'] || allDeps['ts-jest'] || allDeps['babel-jest']) { return 'Jest'; }
    if (allDeps['mocha'])                          { return 'Mocha'; }
    if (allDeps['jasmine'])                        { return 'Jasmine'; }
    if (allDeps['ava'])                            { return 'AVA'; }
    if (allDeps['tape'])                           { return 'Tape'; }

    const testScript: string = pkg.scripts?.test ?? '';
    if (testScript.includes('vitest')) { return 'Vitest'; }
    if (testScript.includes('jest'))   { return 'Jest'; }
    if (testScript.includes('mocha'))  { return 'Mocha'; }
  } catch {
  }

  const configSignals: [string, string][] = [
    ['vitest.config.ts',  'Vitest'],
    ['vitest.config.js',  'Vitest'],
    ['jest.config.ts',    'Jest'],
    ['jest.config.js',    'Jest'],
    ['jest.config.mjs',   'Jest'],
    ['.mocharc.js',       'Mocha'],
    ['.mocharc.yml',      'Mocha'],
    ['.mocharc.json',     'Mocha'],
    ['jasmine.json',      'Jasmine'],
  ];
  for (const [file, framework] of configSignals) {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.joinPath(rootUri, file));
      return framework;
    } catch { /* not found */ }
  }

  return LANGUAGE_FALLBACK_FRAMEWORKS[document.languageId] ?? 'Jest';
}

const TESTABLE_SYMBOL_KINDS = new Set([
  vscode.SymbolKind.Function,
  vscode.SymbolKind.Method,
  vscode.SymbolKind.Class,
]);
const MAX_SYMBOLS = 15;
const MAX_SYMBOL_CODE_LINES = 80;

async function resolveSignature(
  document: vscode.TextDocument,
  symbol: vscode.DocumentSymbol
): Promise<string> {
  try {
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider',
      document.uri,
      symbol.selectionRange.start
    );
    if (hovers && hovers.length > 0) {
      for (const hover of hovers) {
        for (const content of hover.contents) {
          const raw = content instanceof vscode.MarkdownString
            ? content.value
            : typeof content === 'string' ? content : (content as { value?: string }).value ?? '';
          // TypeScript/JS hover wraps the signature in a code fence
          const match = raw.match(/```(?:typescript|javascript|ts|js)?\n([\s\S]*?)```/);
          if (match) { return match[1].trim(); }
        }
      }
    }
  } catch { /* hover provider unavailable */ }
  return symbol.detail ? `${symbol.name}: ${symbol.detail}` : symbol.name;
}

async function extractTestableSymbols(
  document: vscode.TextDocument,
  selectionRange?: vscode.Range
): Promise<string> {
  let allSymbols: vscode.DocumentSymbol[];
  try {
    allSymbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
      'vscode.executeDocumentSymbolProvider',
      document.uri
    ) ?? [];
  } catch {
    return '';
  }

  if (allSymbols.length === 0) { return ''; }

  const candidates: vscode.DocumentSymbol[] = [];
  for (const sym of allSymbols) {
    if (TESTABLE_SYMBOL_KINDS.has(sym.kind)) {
      candidates.push(sym);
    }
    if (sym.kind === vscode.SymbolKind.Class) {
      for (const child of sym.children) {
        if (child.kind === vscode.SymbolKind.Method) {
          candidates.push(child);
        }
      }
    }
  }

  const testable = candidates
    .filter(s => selectionRange ? selectionRange.contains(s.range.start) : true)
    .filter(s => !s.name.startsWith('_') && !s.name.startsWith('#') && s.name !== 'constructor')
    .slice(0, MAX_SYMBOLS);

  if (testable.length === 0) { return ''; }

  const parts: string[] = [];
  for (const sym of testable) {
    const signature = await resolveSignature(document, sym);
    const lines = document.getText(sym.range).split('\n');
    const code = lines.length > MAX_SYMBOL_CODE_LINES
      ? lines.slice(0, MAX_SYMBOL_CODE_LINES).join('\n') + '\n  // ...'
      : lines.join('\n');
    parts.push(`${vscode.SymbolKind[sym.kind]}: ${signature}\n\`\`\`\n${code}\n\`\`\``);
  }

  return parts.join('\n\n');
}

export async function generateTestsHandler(context: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage("Open a file to generate tests.");
    return;
  }

  const apiKey = await getApiKeyFromSecrets(context);
  if (!apiKey) {
    vscode.window.showWarningMessage("Please set your Gemini API key first.");
    return;
  }

  const framework = await detectTestFramework(editor.document);
  const selection = editor.selection.isEmpty ? undefined : editor.selection;
  const codeToTest = selection
    ? editor.document.getText(selection)
    : editor.document.getText();
  const symbolsContext = await extractTestableSymbols(editor.document, selection);

  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: `CodeCritter is generating ${framework} tests...`,
    cancellable: false,
  }, async () => {
    try {
      const testFileContent = await generateTests(codeToTest, apiKey, framework, symbolsContext);
      const currentFilePath = editor.document.uri.fsPath;
      const fileExtension = path.extname(currentFilePath);
      const baseName = path.basename(currentFilePath, fileExtension);
      const testFilePathUri = vscode.Uri.file(`${path.dirname(currentFilePath)}/${baseName}.test${fileExtension}`);
      const contentAsUint8Array = Buffer.from(testFileContent, 'utf8');

      await vscode.workspace.fs.writeFile(testFilePathUri, contentAsUint8Array);

      await vscode.window.showTextDocument(testFilePathUri);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(`Failed to generate tests: ${errorMessage}`);
    }
  });
}

export async function intelligentRefactorHandler(context: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }

  const apiKey = await getApiKeyFromSecrets(context);
  if (!apiKey) {
    vscode.window.showInformationMessage("Please set your Gemini API key.");
    return;
  }

  const document = editor.document;
  const languageId = document.languageId;
  const selection = editor.selection;
  const isSelection = !selection.isEmpty;
  const codeToRefactor = isSelection ? document.getText(selection) : document.getText();
  const fullFileText = document.getText();
  const projectContext = await buildProjectContext(document);

  let result: Awaited<ReturnType<typeof generateIntelligentRefactoring>>;

  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: `CodeCritter is refactoring your ${languageId} code...`,
    cancellable: false,
  }, async () => {
    try {
      result = isSelection
        ? await generateIntelligentSelectionRefactoring(codeToRefactor, fullFileText, apiKey, languageId)
        : await generateIntelligentRefactoring(codeToRefactor, apiKey, languageId, projectContext);
    } catch (error) {
      console.error('CodeCritter: Error during intelligent refactoring.', error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      vscode.window.showErrorMessage(`Refactoring failed: ${errorMessage}`);
    }
  });

  if (!result!) { return; }

  // Build the proposed content: full file with refactored region spliced in
  let proposedContent: string;
  if (isSelection) {
    const before = fullFileText.slice(0, document.offsetAt(selection.start));
    const after = fullFileText.slice(document.offsetAt(selection.end));
    proposedContent = before + result.refactoredCode + after;
  } else {
    proposedContent = result.refactoredCode;
  }

  // Open a virtual document with the proposed code and show a diff
  const proposedDoc = await vscode.workspace.openTextDocument({
    content: proposedContent,
    language: languageId,
  });

  await vscode.commands.executeCommand(
    'vscode.diff',
    document.uri,
    proposedDoc.uri,
    `CodeCritter Refactoring — ${path.basename(document.fileName)}`
  );

  // Notification stays until user decides (buttons prevent auto-dismiss)
  const choice = await vscode.window.showInformationMessage(
    `CodeCritter: ${result.explanation}`,
    'Apply Changes',
    'Discard'
  );

  if (choice === 'Apply Changes') {
    await vscode.window.showTextDocument(document);
    await editor.edit(editBuilder => {
      const rangeToReplace = isSelection
        ? selection
        : new vscode.Range(document.positionAt(0), document.positionAt(fullFileText.length));
      editBuilder.replace(rangeToReplace, result.refactoredCode);
    });

    if (result.alternativeSuggestion?.code) {
      const altContent = `# Alternative Suggestion\n${result.alternativeSuggestion.explanation}\n\n\`\`\`${languageId}\n${result.alternativeSuggestion.code}\n\`\`\`\n`;
      const altDoc = await vscode.workspace.openTextDocument({ content: altContent, language: 'markdown' });
      vscode.window.showTextDocument(altDoc, vscode.ViewColumn.Beside);
    }
  }
}

async function buildFileTree(dir: vscode.Uri, indent: string = ''): Promise<string> {
  let tree = '';
  const entries = await vscode.workspace.fs.readDirectory(dir);
  const ignored = ['node_modules', '.git', 'out', 'dist', '.vscode', 'target', 'build', 'bin', 'obj', '.DS_Store'];
  entries.sort((a, b) => {
    if (a[1] === vscode.FileType.Directory && b[1] !== vscode.FileType.Directory) {
      return -1;
    }
    if (a[1] !== vscode.FileType.Directory && b[1] === vscode.FileType.Directory) {
      return 1;
    }
    return a[0].localeCompare(b[0]);
  });

  for (const [name, type] of entries) {
    if (ignored.includes(name)) { continue; }

    if (type === vscode.FileType.Directory) {
      tree += `${indent}├── ${name}/\n`;
      tree += await buildFileTree(vscode.Uri.joinPath(dir, name), `${indent}│   `);
    } else {
      tree += `${indent}├── ${name}\n`;
    }
  }
  return tree;
}

const EXT_TO_LANGUAGE_ID: Record<string, string> = {
  ts: 'typescript', tsx: 'typescriptreact',
  js: 'javascript', jsx: 'javascriptreact',
  py: 'python', go: 'go', java: 'java',
  rs: 'rust', cs: 'csharp', rb: 'ruby',
  php: 'php', swift: 'swift', kt: 'kotlin',
  dart: 'dart', c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
};

const MAX_SUMMARY_FILE_LENGTH = 8000;

// Fix 4: parallel batches — cap at 30 files, run 5 summaries concurrently
const README_MAX_FILES = 30;
const README_CONCURRENCY = 5;

async function getFileSummaries(
  files: vscode.Uri[],
  apiKey: string,
  progress: vscode.Progress<{ message?: string; increment?: number }>
): Promise<string[]> {
  // Limit the total number of files to summarize to keep runtime sane
  const filesToProcess = files.slice(0, README_MAX_FILES);
  const totalFiles = filesToProcess.length;
  const summaries: string[] = [];
  let completed = 0;

  // Process in parallel batches of README_CONCURRENCY
  for (let i = 0; i < totalFiles; i += README_CONCURRENCY) {
    const batch = filesToProcess.slice(i, i + README_CONCURRENCY);

    const batchResults = await Promise.all(
      batch.map(async (file): Promise<string | null> => {
        try {
          const raw = await vscode.workspace.fs.readFile(file);
          const content = Buffer.from(raw).toString('utf-8');
          const ext = path.extname(file.fsPath).substring(1).toLowerCase();
          const languageId = EXT_TO_LANGUAGE_ID[ext];

          if (!languageId || content.trim().length < 50) {
            return null;
          }

          const contentToSummarize = content.length > MAX_SUMMARY_FILE_LENGTH
            ? content.slice(0, MAX_SUMMARY_FILE_LENGTH)
            : content;

          const summary = await summarizeFileContent(contentToSummarize, apiKey, languageId);
          const relativePath = vscode.workspace.asRelativePath(file);
          return `- \`${relativePath}\`: ${summary}`;
        } catch (e) {
          console.warn(`Could not read or summarize file: ${file.fsPath}`, e);
          return null;
        }
      })
    );

    for (const result of batchResults) {
      if (result) { summaries.push(result); }
    }

    completed += batch.length;
    progress.report({
      message: `Analyzed ${completed}/${totalFiles} files...`,
      increment: (batch.length / totalFiles) * 50,
    });
  }

  return summaries;
}

export async function fixIssueHandler(
  document: vscode.TextDocument,
  diagnostic: vscode.Diagnostic,
  context: vscode.ExtensionContext
): Promise<void> {
  const apiKey = await getApiKeyFromSecrets(context);
  if (!apiKey) {
    vscode.window.showWarningMessage('Please set your Gemini API key first.');
    return;
  }

  const editor = vscode.window.visibleTextEditors.find(
    e => e.document.uri.toString() === document.uri.toString()
  );
  if (!editor) {
    vscode.window.showWarningMessage('Please open the file in an editor first.');
    return;
  }

  const CONTEXT_LINES = 15;
  const diagLine = diagnostic.range.start.line;
  const startLine = Math.max(0, diagLine - CONTEXT_LINES);
  const endLine = Math.min(document.lineCount - 1, diagLine + CONTEXT_LINES);
  const contextRange = new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);
  const contextCode = document.getText(contextRange);
  const issueLineInContext = diagLine - startLine;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'CodeCritter: Fixing issue...' },
    async () => {
      try {
        const fix = await generateIssueFix(
          contextCode,
          diagnostic.message,
          issueLineInContext,
          document.languageId,
          apiKey
        );

        await editor.edit(editBuilder => {
          editBuilder.replace(contextRange, fix.fixedCode);
        });

        const remaining = (diagnosticCollection.get(document.uri) ?? []).filter(
          d => d !== diagnostic
        );
        diagnosticCollection.set(document.uri, remaining);

        vscode.window.showInformationMessage(`CodeCritter fixed it: ${fix.explanation}`);

        const stats = context.globalState.get('codeCritterStats', { kudos: 0, issuesFixed: 0 });
        stats.issuesFixed += 1;
        await context.globalState.update('codeCritterStats', stats);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`CodeCritter: Could not generate fix — ${msg}`);
      }
    }
  );
}

export async function generateReadmeHandler(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('Please open a project folder first.');
    return;
  }
  const rootUri = workspaceFolders[0].uri;

  const apiKey = await getApiKeyFromSecrets(context);
  if (!apiKey) {
    vscode.window.showInformationMessage('Please set your Gemini API key.');
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'CodeCritter is analyzing your project...',
      cancellable: false,
    },
    async (progress) => {
      try {
        progress.report({ increment: 10, message: 'Reading package.json...' });
        let packageJsonContent: string | null = null;
        try {
          const packageJsonUri = vscode.Uri.joinPath(rootUri, 'package.json');
          packageJsonContent = Buffer.from(
            await vscode.workspace.fs.readFile(packageJsonUri)
          ).toString('utf-8');
        } catch {
          // package.json not present, proceed without it
        }

        progress.report({ increment: 15, message: 'Building file tree...' });
        const fileTree = await buildFileTree(rootUri);

        progress.report({ increment: 15, message: 'Finding source files...' });
        const sourceFilePattern = '**/*.{js,ts,py,go,java,rs,cs,rb,php,swift,kt,dart,c,cpp,h,hpp}';
        const excludePattern = '**/{node_modules,dist,out,build,vendor,.*,target,bin,obj,venv}/**';
        const allFiles = await vscode.workspace.findFiles(sourceFilePattern, excludePattern);

        const fileSummaries = await getFileSummaries(allFiles, apiKey, progress); // Progress is now 50%

        progress.report({
          increment: 10,
          message: 'Synthesizing project documentation...',
        });

        const readmeUri = vscode.Uri.joinPath(rootUri, 'README.md');
        let existingReadmeContent: string | null = null;
        try {
          const content = await vscode.workspace.fs.readFile(readmeUri);
          existingReadmeContent = Buffer.from(content).toString('utf-8');
          progress.report({ message: 'Updating existing README.md...' });
        } catch (error) {
          progress.report({ message: 'Creating new README.md...' });
        }

        const readmeContent = await generateReadme(
          packageJsonContent,
          fileTree,
          fileSummaries,
          existingReadmeContent,
          apiKey
        );

        progress.report({ increment: 40, message: 'Writing README.md...' });
        await vscode.workspace.fs.writeFile(
          readmeUri,
          Buffer.from(readmeContent, 'utf-8')
        );

        await vscode.window.showTextDocument(readmeUri);
      } catch (error) {
        console.error('CodeCritter: Error during README generation.', error);
        const errorMessage =
          error instanceof Error ? error.message : 'An unknown error occurred.';
        vscode.window.showErrorMessage(
          `README generation failed: ${errorMessage}`
        );
      }
    }
  );
}
