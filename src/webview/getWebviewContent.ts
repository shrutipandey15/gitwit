import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function getWebviewContent(context: vscode.ExtensionContext): string {
  const webviewHtmlPath = path.join(context.extensionPath, 'webview.html');
  const htmlContent = fs.readFileSync(webviewHtmlPath, 'utf8');
  return htmlContent;
}
