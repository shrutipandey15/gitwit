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
import fetch from 'node-fetch';

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
            async message => { 
                switch (message.command) {
                    case 'review':
                        vscode.window.showInformationMessage('Sending code to GitWit backend...');

                        try {
                            const response = await fetch('http://localhost:3001/review', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    code: message.code,
                                    persona: message.persona
                                }),
                            });

                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }

                            const data = await response.json();

                            panel.webview.postMessage({
                                command: 'displayReview',
                                review: data.review
                            });

                        } catch (error) {
                            console.error('Error calling backend:', error);
                            vscode.window.showErrorMessage('Failed to get review from backend. Is the server running?');
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
    const webviewHtmlPath = vscode.Uri.joinPath(context.extensionUri, 'webview.html');
    const htmlContent = fs.readFileSync(webviewHtmlPath.fsPath, 'utf8');
    return htmlContent;
}