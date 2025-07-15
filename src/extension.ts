/**
 * GitWit - extension.ts
 * This commit adds the ability for users to provide their own API key.
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import fetch from "node-fetch";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "gitwit" is now active!');

  let disposable = vscode.commands.registerCommand("gitwit.start", () => {
    const panel = vscode.window.createWebviewPanel(
      "gitwitPanel",
      "GitWit Review",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [context.extensionUri],
      }
    );

    panel.webview.html = getWebviewContent(context);

    panel.webview.onDidReceiveMessage(
      async (message) => {
        const config = vscode.workspace.getConfiguration("gitwit");

        switch (message.command) {
          case "getApiKey":
            panel.webview.postMessage({
              command: "setApiKey",
              apiKey: config.get("apiKey"),
            });
            return;

          case "saveApiKey":
            try {
              await config.update(
                "apiKey",
                message.apiKey,
                vscode.ConfigurationTarget.Global
              );
              vscode.window.showInformationMessage(
                "GitWit API Key saved successfully!"
              );
            } catch (error) {
              console.error("Failed to save API key:", error);
              vscode.window.showErrorMessage(
                "Could not save the API key. Please check the developer console for errors."
              );
            }
            return;

          case "review":
          case "generateDocstring":
            const userApiKey = config.get("apiKey");
            const endpoint =
              message.command === "review" ? "review" : "generate-docstring";
            const body = {
              code: message.code,
              persona: message.persona,
              apiKey: userApiKey,
            };

            vscode.window.showInformationMessage(
              `Sending request to GitWit backend...`
            );

            try {
              const response = await fetch(
                `http://localhost:3001/${endpoint}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                }
              );

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                  errorData.error || `HTTP error! status: ${response.status}`
                );
              }

              const data = await response.json();
              const command =
                message.command === "review"
                  ? "displayReview"
                  : "displayDocstring";

              panel.webview.postMessage({ command, ...data });
            } catch (error) {
              console.error(`Error calling ${endpoint} backend:`, error);
              console.error("Error calling backend:", error);
              vscode.window.showErrorMessage(
                "Failed to get review from backend. Is the server running?"
              );
            }
            return;

          case "copyToClipboard":
            if (message.text) {
              await vscode.env.clipboard.writeText(message.text);
              vscode.window.showInformationMessage(
                "Review copied to clipboard!"
              );
            }
            return;
        }
      },
      undefined,
      context.subscriptions
    );
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

function getWebviewContent(context: vscode.ExtensionContext): string {
  const webviewHtmlPath = path.join(context.extensionPath, "webview.html");
  const htmlContent = fs.readFileSync(webviewHtmlPath, "utf8");
  return htmlContent;
}