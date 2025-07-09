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
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "gitwit" is now active!');

    let disposable = vscode.commands.registerCommand('gitwit.start', () => {

        const panel = vscode.window.createWebviewPanel(
            'gitwitPanel', // An internal identifier for the panel.
            'GitWit Review', // The title displayed to the user in the panel's tab.
            vscode.ViewColumn.Beside, // Show the panel in a new column to the side.
            {
                enableScripts: true
            }
        );
        panel.webview.html = getWebviewContent(context);

        panel.webview.onDidReceiveMessage(
            message => {
                console.log('Received message from webview:', message);
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
}
function getWebviewContent(context: vscode.ExtensionContext): string {
    const webviewHtmlPath = path.join(context.extensionPath, 'webview.html');
    
    const htmlContent = fs.readFileSync(webviewHtmlPath, 'utf8');
    
    return htmlContent;
}

