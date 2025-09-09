import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ReviewData } from '../types';

export function getWebviewContent(context: vscode.ExtensionContext): string {
  const webviewHtmlPath = path.join(context.extensionPath, 'webview.html');
  const htmlContent = fs.readFileSync(webviewHtmlPath, 'utf8');
  return htmlContent;
}

export function getAutoReviewWebviewContent(
  reviewData: ReviewData,
  fileName: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CodeCritter Auto Review</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body {
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
                font-family: var(--vscode-font-family);
            }
            .review-card { border-left: 4px solid #4f46e5; }
        </style>
    </head>
    <body>
        <div class="p-6 space-y-6">
            <header class="text-center border-b border-gray-700 pb-4">
                <h1 class="text-2xl font-bold">CodeCritter Auto Review</h1>
                <p class="text-gray-400">${fileName}</p>
            </header>

            <div class="space-y-4">
                <div class="p-4 bg-gray-800 rounded-md space-y-3">
                    <div class="p-3 bg-gray-700 rounded-md review-card">
                        <h3 class="font-bold text-indigo-300">Summary</h3>
                        <p class="text-gray-300">${
                          reviewData.review?.summary || 'No summary available'
                        }</p>
                    </div>

                    <div class="p-3 bg-gray-700 rounded-md review-card">
                        <h3 class="font-bold text-indigo-300">Key Issues</h3>
                        <p class="text-gray-300">${
                          reviewData.review?.critique || 'No critique available'
                        }</p>
                    </div>

                    <div class="p-3 bg-gray-700 rounded-md review-card">
                        <h3 class="font-bold text-indigo-300">Recommendations</h3>
                        <p class="text-gray-300">${
                          reviewData.review?.suggestions ||
                          'No suggestions available'
                        }</p>
                    </div>
                </div>

                ${
                  reviewData.productionRisk &&
                  reviewData.productionRisk.length > 0
                    ? `
                <div class="space-y-2">
                    <h3 class="font-bold text-yellow-400">🚨 Production Risk Watch</h3>
                    <ul class="p-4 bg-gray-800 rounded-md space-y-2">
                        ${reviewData.productionRisk
                          .map(
                            (risk: any) => `
                            <li class="flex items-start">
                                <span class="mr-2">${
                                  risk.isSafe ? '✅' : '⚠️'
                                }</span>
                                <span>${risk.risk}</span>
                            </li>
                        `
                          )
                          .join('')}
                    </ul>
                </div>
                `
                    : ''
                }
            </div>
        </div>
    </body>
    </html>
    `;
}