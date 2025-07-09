/**
 * GitWit - extension.ts
 *
 * This is the main entry point for the GitWit VS Code extension.
 * It's responsible for activating the extension, registering commands,
 * and creating the webview panel where the UI will be rendered.
 *
 * To run this, you would typically use the VS Code Extension generator (`yo code`)
 * and replace the contents of `src/extension.ts` with this file.
 */

// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';

/**
 * This method is called when your extension is activated.
 * The extension is activated the very first time the command is executed.
 */
export function activate(context: vscode.ExtensionContext) {

    // Log to the console for debugging purposes. This is our "footprint".
    console.log('Congratulations, your extension "gitwit" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('gitwit.start', () => {
        // The code you place here will be executed every time your command is executed

        // --- 1. Create and show a new webview panel ---
        const panel = vscode.window.createWebviewPanel(
            'gitwitPanel', // An internal identifier for the panel.
            'GitWit Review', // The title displayed to the user in the panel's tab.
            vscode.ViewColumn.Beside, // Show the panel in a new column to the side.
            {
                // Enable scripts in the webview
                enableScripts: true
            }
        );

        // --- 2. Set the HTML content for the webview ---
        // This is just a placeholder for now. In the next commit, we'll load
        // our React application here.
        panel.webview.html = getWebviewContent();

        // You can also listen for messages from the webview
        panel.webview.onDidReceiveMessage(
            message => {
                console.log('Received message from webview:', message);
                // Handle messages from the webview (e.g., code to be reviewed)
            },
            undefined,
            context.subscriptions
        );
    });

    // Add the command to the extension's context so it will be disposed of
    // when the extension is deactivated.
    context.subscriptions.push(disposable);
}

export function deactivate() {
    // This is where you would clean up any resources.
}
function getWebviewContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitWit Review</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 20px;
            color: #333;
            background-color: #f5f5f5;
        }
        h1 {
            color: #005fcc;
        }
        p {
            font-size: 1.1em;
        }
    </style>
</head>
<body>
    <h1>Welcome to GitWit!</h1>
    <p>The UI for reviewing your code will live here.</p>
    <p>This is just the foundational shell. The real work starts next!</p>
</body>
</html>`;
}

