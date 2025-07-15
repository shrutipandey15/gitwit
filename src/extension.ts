/**
 * GitWit - extension.ts
 * This commit adds the logic to handle the 'generateDocstring' command.
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
                                headers: { 'Content-Type': 'application/json' },
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
                                review: data.review,
                                productionRisk: data.productionRisk
                            });

                        } catch (error) {
                            console.error('Error calling backend:', error);
                            vscode.window.showErrorMessage('Failed to get review from backend. Is the server running?');
                        }
                        return;
                        
                    case 'copyToClipboard':
                        if (message.text) {
                            await vscode.env.clipboard.writeText(message.text);
                            vscode.window.showInformationMessage('Review copied to clipboard!');
                        }
                        return;

                    case 'generateDocstring':
                        vscode.window.showInformationMessage('Generating docstring with GitWit...');
                        try {
                            const response = await fetch('http://localhost:3001/generate-docstring', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ code: message.code }),
                            });
                            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                            
                            const data = await response.json();

                            panel.webview.postMessage({
                                command: 'displayDocstring',
                                docstring: data.docstring
                            });

                        } catch (error) {
                            console.error('Error calling docstring backend:', error);
                            vscode.window.showErrorMessage('Failed to generate docstring.');
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