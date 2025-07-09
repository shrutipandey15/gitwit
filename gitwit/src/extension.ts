/**
 * GitWit - extension.ts
 *
 * This is the main entry point for the GitWit VS Code extension.
 * It's responsible for activating the extension, registering commands,
 * and creating the webview panel where the UI will be rendered.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "gitwit" is now active!');

    let disposable = vscode.commands.registerCommand('gitwit.start', () => {
        const panel = vscode.window.createWebviewPanel(
            'gitwitPanel',
            'GitWit Review',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out')]
            }
        );

        panel.webview.html = getWebviewContent(context);

        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'review':
                        console.log('Received code to review:', message.code);
                        console.log('Selected persona:', message.persona);

                        vscode.window.showInformationMessage(`Reviewing code with the ${message.persona} persona...`);
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
    const webviewHtmlPath = vscode.Uri.joinPath(context.extensionUri, 'webview.html');
    const htmlContent = fs.readFileSync(webviewHtmlPath.fsPath, 'utf8');
    return htmlContent;
}
