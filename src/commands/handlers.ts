import * as vscode from "vscode";
import { WebviewManager } from "../webview/WebviewManager";
import {
  generateDocstring,
  generateReview,
  generateExplanation,
  analyzeAndSuggestCommit,
  generateAutomatedReview,
  generateTests,
  generateIntelligentRefactoring
} from "../ai/ai";
import { executeCommand } from "../utils/command";
import { ReviewData } from "../types";
import { diagnosticCollection } from "../extension";
import * as path from "path";
import { Buffer } from 'buffer';

let isReviewInProgress = false;
let lastReviewedContent = new Map<string, string>();

export async function startReviewHandler(context: vscode.ExtensionContext) {
    const panel = new WebviewManager(context);
    panel.onDidReceiveMessage(
        async (message) => {
          const config = vscode.workspace.getConfiguration("codecritter");

          switch (message.command) {
            case "getApiKey":
              panel.postMessage({
                command: "setApiKey",
                apiKey: config.get("apiKey"),
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

            case "saveApiKey":
              try {
                await config.update(
                  "apiKey",
                  message.apiKey,
                  vscode.ConfigurationTarget.Global
                );
                vscode.window.showInformationMessage(
                  "CodeCritter API Key saved successfully!"
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
                const userApiKey = config.get("apiKey") as string;
                const currentPersona = config.get("persona", "Strict Tech Lead") as string;

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
                const userApiKey = config.get("apiKey") as string;
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

export async function onDidSaveTextDocumentHandler(document: vscode.TextDocument, context: vscode.ExtensionContext) {
    console.log(`CodeCritter: File saved: ${document.fileName}.`);
    const config = vscode.workspace.getConfiguration('codecritter');
    const userApiKey = config.get('apiKey') as string;

    if (!userApiKey) return;

    const autoReviewEnabled = config.get('autoReviewEnabled', true);
    if (autoReviewEnabled && !isReviewInProgress && !shouldSkipFile(document)) {
        isReviewInProgress = true;
        try {
            console.log(`CodeCritter: Kicking off auto-review...`);
            const currentContent = document.getText();
            await performAutomatedReview(currentContent, document, userApiKey, config, context);
            lastReviewedContent.set(document.uri.fsPath, currentContent);
        } catch (error) {
            console.error('CodeCritter: Failed to perform automated review:', error);
        } finally {
            isReviewInProgress = false;
        }
    }

    const commitAssistEnabled = config.get('commitAssistEnabled', true);
    if (commitAssistEnabled) {
        console.log(`CodeCritter: Kicking off commit assistant...`);
        const stagedDiff = await executeCommand('git diff --staged');
        const unstagedDiff = await executeCommand('git diff');
        const fullDiff = (stagedDiff + '\n' + unstagedDiff).trim();

        if (fullDiff) {
            console.log('CodeCritter: Diff generated for commit assistant.');
            try {
                const analysis = await analyzeAndSuggestCommit(fullDiff, userApiKey);
                if (analysis.ready) {
                    const persona = config.get('persona', 'Strict Tech Lead') as string;
                    const commitMessage = analysis.commitMessage;
                    const message = getPopupMessage(persona, commitMessage);
                    const userChoice = await vscode.window.showInformationMessage(message, { modal: true }, "Commit", "Cancel");

                    if (userChoice === "Commit") {
                        const terminal = vscode.window.createTerminal("CodeCritter Commit");
                        terminal.sendText(`git add . && git commit -m "${commitMessage}"`);
                        terminal.show();
                    }
                }
            } catch (error) {
                console.error('CodeCritter: Failed to analyze for commit:', error);
            }
        } else {
            console.log('CodeCritter: No diff found for commit assistant.');
        }
    }
}

function getPopupMessage(persona: string, commitMessage: string): string {
  const formattedCommit = `\n\n"${commitMessage}"`;
  switch (persona) {
    case 'Supportive Mentor':
      return `Looks like you've done some great work! I think it's ready to go. How about this commit message?${formattedCommit}`;
    case 'Sarcastic Reviewer':
      return `Oh, look, you actually finished something. I guess you can commit it. If you have to.${formattedCommit}`;
    case 'Code Poet':
      return `A beautiful composition of logic and form. This change is ready for the ages. Shall we use this message?${formattedCommit}`;
    case 'Paranoid Security Engineer':
      return `I've scanned for vulnerabilities and it seems... acceptable. For now. Commit with this message, and stay alert.${formattedCommit}`;
    case 'Strict Tech Lead':
    default:
      return `This change meets our standards. It's ready for commit. Use the following message.${formattedCommit}`;
  }
}

export async function selectPersonaHandler() {
  console.log('CodeCritter: User initiated persona selection.');

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
      console.log(`CodeCritter: Persona saved to settings -> ${selectedPersona}`);

}

export async function explainCodeHandler() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    vscode.window.showInformationMessage("Please select some code to explain.");
    return;
  }

  const config = vscode.workspace.getConfiguration("codecritter");
  const apiKey = config.get<string>("apiKey");
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
    `CodeCritter Stats | Kudos Received: ${stats.kudos}`,
    { modal: true }
  );
}

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

  if (document.getText().length > 10000) {
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
  console.log(`CodeCritter: [Auto-Review] Starting review for ${document.fileName}.`);
  try {
    const persona = config.get('persona', 'Strict Tech Lead') as string;
    console.log(`CodeCritter: [Auto-Review] Using persona: ${persona}`);

    const reviewResult = await generateAutomatedReview(
      content,
      persona,
      apiKey,
      isDiff
    );
    console.log('CodeCritter: [Auto-Review] AI response received:', JSON.stringify(reviewResult, null, 2));

    const diagnostics: vscode.Diagnostic[] = [];
    diagnosticCollection.delete(document.uri);

    if (reviewResult && reviewResult.issues && reviewResult.issues.length > 0) {
      for (const issue of reviewResult.issues) {
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

    if (reviewResult && reviewResult.isClean && diagnostics.length === 0) {
        console.log('CodeCritter: [Auto-Review] Code is clean. Displaying kudos.');
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

        const stats = context.globalState.get('codeCritterStats', { kudos: 0, issuesFixed: 0 });
        stats.kudos += 1;
        context.globalState.update('codeCritterStats', stats);
    } else if (diagnostics.length > 0) {
        console.log(`CodeCritter: [Auto-Review] Found ${diagnostics.length} issues. Displaying diagnostics.`);
    }

  } catch (error) {
    console.error('CodeCritter: [Auto-Review] An error occurred.', error);
    vscode.window.setStatusBarMessage('CodeCritter: Error performing review.', 5000);
  }
}

export async function generateTestsHandler() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage("Open a file to generate tests.");
    return;
  }

  const config = vscode.workspace.getConfiguration("codecritter");
  const apiKey = config.get<string>("apiKey");

  if (!apiKey) {
    vscode.window.showWarningMessage("Please set your Gemini API key first.");
    return;
  }
  
  const selectedCode = editor.document.getText(editor.selection);
  const codeToTest = selectedCode || editor.document.getText();

  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "CodeCritter is generating tests...",
    cancellable: false,
  }, async (progress) => {
    try {
      const testFileContent = await generateTests(codeToTest, apiKey);      
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

export async function intelligentRefactorHandler() {
  console.log('CodeCritter: "Intelligently Refactor File" command triggered.');
  
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage("Please open a file to refactor.");
    return;
  }

  const config = vscode.workspace.getConfiguration("codecritter");
  const apiKey = config.get<string>("apiKey");
  if (!apiKey) {
    vscode.window.showWarningMessage("Please set your Gemini API key.");
    return;
  }

  const entireFileContent = editor.document.getText();

  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "CodeCritter is analyzing the file architecture...",
    cancellable: false,
  }, async () => {
    try {
      const result = await generateIntelligentRefactoring(entireFileContent, apiKey);
      
      // Apply the refactored code to the editor
      await editor.edit(editBuilder => {
        const fullRange = new vscode.Range(
          editor.document.positionAt(0),
          editor.document.positionAt(entireFileContent.length)
        );
        editBuilder.replace(fullRange, result.refactoredCode);
      });

      // Show the explanation in an information message
      vscode.window.showInformationMessage(
        "Refactoring complete: " + result.explanation, 
        { modal: true }
      );

      // If there's an alternative suggestion, show that too
      if (result.alternativeSuggestion) {
        vscode.window.showInformationMessage(
          "Alternative Suggestion: " + result.alternativeSuggestion,
          { modal: true }
        );
      }
      
      console.log('CodeCritter: Successfully applied intelligent refactoring.');
      
    } catch (error) {
      console.error('CodeCritter: Error during intelligent refactoring.', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error.";
      vscode.window.showErrorMessage(`Refactoring failed: ${errorMessage}`);
    }
  });
}