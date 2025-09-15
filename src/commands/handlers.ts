import * as vscode from "vscode";
import * as path from "path";
import { WebviewManager } from "../webview/WebviewManager";
import {
  generateDocstring,
  generateReview,
  generateExplanation,
} from "../ai/ai";
import { executeCommand } from "../utils/command";
import { generateAutomatedReview } from "../ai/ai";
import { ReviewData } from "../types";
import { diagnosticCollection } from "../extension";

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
            const currentPersona = config.get("persona", "Strict Tech Lead");

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

export async function setupAutomatedReviewSystem(
  context: vscode.ExtensionContext
) {
  console.log("CodeCritter: Setting up automated code review system...");

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      const config = vscode.workspace.getConfiguration("codecritter");
      const autoReviewEnabled = config.get("autoReviewEnabled", true);
      const userApiKey = config.get("apiKey") as string;

      if (!autoReviewEnabled || !userApiKey || isReviewInProgress) {
        return;
      }

      if (shouldSkipFile(document)) {
        return;
      }

      const filePath = document.uri.fsPath;
      const currentContent = document.getText();

      if (lastReviewedContent.get(filePath) === currentContent) {
        return;
      }

      console.log(`CodeCritter: Analyzing saved file: ${document.fileName}`);
      isReviewInProgress = true;

      try {
        await performAutomatedReview(
          currentContent,
          document,
          userApiKey,
          config
        );
        lastReviewedContent.set(filePath, currentContent);
      } catch (error) {
        console.error(
          "CodeCritter: Failed to perform automated review:",
          error
        );
      } finally {
        isReviewInProgress = false;
      }
    })
  );
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

  // Skip if it's in excluded paths
  if (skipPaths.some((path) => document.uri.path.includes(path))) {
    return true;
  }

  // Skip if it's an excluded file type
  if (skipExtensions.some((ext) => fileName.endsWith(ext))) {
    return true;
  }

  // Skip very large files (over 10KB)
  if (document.getText().length > 10000) {
    return true;
  }

  return false;
}

async function performAutomatedReview(
  content: string,
  document: vscode.TextDocument, // Changed from fileName to the whole document
  apiKey: string,
  config: vscode.WorkspaceConfiguration,
  isDiff: boolean = false
) {
  try {
    const persona = config.get("persona", "Strict Tech Lead") as string;

    // Get automated review with the new prompt structure
    const reviewResult = await generateAutomatedReview(
      content,
      persona,
      apiKey,
      isDiff
    );

    // Clear old diagnostics for this file
    diagnosticCollection.delete(document.uri);

    if (reviewResult && reviewResult.issues && reviewResult.issues.length > 0) {
      const diagnostics = reviewResult.issues.map((issue: any) => {
        const range = new vscode.Range(
          issue.lineNumber - 1,
          0, // line numbers are 1-based, Range is 0-based
          issue.lineNumber - 1,
          document.lineAt(issue.lineNumber - 1).text.length
        );

        const severity =
          issue.severity === "high"
            ? vscode.DiagnosticSeverity.Error
            : issue.severity === "medium"
            ? vscode.DiagnosticSeverity.Warning
            : vscode.DiagnosticSeverity.Information;

        const diagnostic = new vscode.Diagnostic(
          range,
          issue.message,
          severity
        );
        diagnostic.source = "CodeCritter";
        return diagnostic;
      });

      diagnosticCollection.set(document.uri, diagnostics);

      if (reviewResult && reviewResult.isClean && diagnostics.length === 0) {
  const kudosMessages = {
    'Strict Tech Lead': '✅ Solid work. This code meets standards.',
    'Supportive Mentor': '🎉 Fantastic job! This code is clean, readable, and well-structured.',
    'Sarcastic Reviewer': `Wow, you actually wrote something I can't complain about. Don't get used to it.`,
    'Code Poet': '✨ A truly elegant piece of code. Well done.',
    'Paranoid Security Engineer': 'Scan complete. No immediate threats detected. For now.'
  };
  const message = kudosMessages[persona as keyof typeof kudosMessages] || 'Good job! No issues found.';
  vscode.window.showInformationMessage(`CodeCritter: ${message}`);
}
    }
  } catch (error) {
    console.error("Error in automated review:", error);
    vscode.window.setStatusBarMessage(
      "CodeCritter: Error performing review.",
      5000
    );
  }
}
