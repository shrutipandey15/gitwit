/**
 * CodeCritter - extension.ts
 * Standalone extension that handles AI requests directly without backend server
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { GoogleGenerativeAI } from '@google/generative-ai';
import { exec } from 'child_process'; // Import the 'exec' function

// Minimal interfaces for the VS Code Git extension API
interface GitExtensionExports {
    getAPI(version: 1): API;
}
interface API {
    repositories: Repository[];
}
interface Repository {
    // We are no longer using the diff methods from the API
}

// Circuit breaker configuration
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_TIMEOUT = 60000;

interface CircuitBreaker {
  failures: number;
  lastFailure: number | null;
  isOpen: boolean;
}

const circuitBreaker: CircuitBreaker = {
  failures: 0,
  lastFailure: null,
  isOpen: false
};

export async function activate(context: vscode.ExtensionContext) {
  console.log('CodeCritter extension is now active!');
  
  await setupProactiveCommitAssistant(context);

  let disposable = vscode.commands.registerCommand("codecritter.start", () => {
    const panel = vscode.window.createWebviewPanel(
      "codecritterPanel",
      "CodeCritter Review",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [context.extensionUri],
      }
    );

    panel.webview.html = getWebviewContent(context);

    panel.webview.onDidReceiveMessage(
      async (message) => {
        const config = vscode.workspace.getConfiguration("codecritter");

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
              if (!userApiKey) {
                vscode.window.showWarningMessage(
                  "Please set your Gemini API key in the CodeCritter settings first."
                );
                return;
              }

              const reviewData = await generateReview(
                message.code,
                message.persona,
                userApiKey
              );

              panel.webview.postMessage({
                command: "displayReview",
                review: reviewData.review,
                productionRisk: reviewData.productionRisk,
              });
            } catch (error) {
              console.error("Error generating review:", error);
              vscode.window.showErrorMessage(
                `Failed to generate review: ${error instanceof Error ? error.message : 'Unknown error'}`
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

              const docstring = await generateDocstring(
                message.code,
                userApiKey
              );

              panel.webview.postMessage({
                command: "displayDocstring",
                docstring,
              });
            } catch (error) {
              console.error("Error generating docstring:", error);
              vscode.window.showErrorMessage(
                `Failed to generate docstring: ${error instanceof Error ? error.message : 'Unknown error'}`
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

// New helper function to execute a command and return its output
function executeCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceFolder) {
            return resolve('');
        }

        exec(command, { cwd: workspaceFolder }, (error, stdout, stderr) => {
            if (error) {
                console.warn(`Warning executing command "${command}":`, stderr);
                // Often, git diff returns an error code if there are no changes,
                // so we resolve with an empty string instead of rejecting.
                resolve(''); 
                return;
            }
            resolve(stdout);
        });
    });
}


async function setupProactiveCommitAssistant(context: vscode.ExtensionContext) {
    console.log("CodeCritter: Setting up proactive commit assistant...");

    // We still need the Git extension to know a repository exists.
    const gitExtension = vscode.extensions.getExtension<GitExtensionExports>('vscode.git');
    if (!gitExtension) {
        console.warn("CodeCritter: VS Code Git extension not found. Proactive commit assistant is disabled.");
        return;
    }
    await gitExtension.activate();
    console.log("CodeCritter: Git extension is active.");

    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(async (document) => {
        console.log(`CodeCritter: File saved: ${document.uri.path}`);

        if (document.uri.path.includes('/.git/')) {
            console.log("CodeCritter: Save was inside .git directory, ignoring.");
            return;
        }
        
        const config = vscode.workspace.getConfiguration("codecritter");
        const userApiKey = config.get("apiKey") as string;

        if (!userApiKey) {
            return; // Silently exit if no API key
        }
        
        // Use our new reliable method to get the diff
        const stagedDiff = await executeCommand('git diff --staged');
        const unstagedDiff = await executeCommand('git diff');
        const fullDiff = (stagedDiff + '\n' + unstagedDiff).trim();

        if (!fullDiff) {
            console.log("CodeCritter: No changes detected after running git diff command.");
            return;
        }
        console.log("CodeCritter: Diff generated successfully via command line.");

        try {
            const analysis = await analyzeAndSuggestCommit(fullDiff, userApiKey);
            if (analysis.ready) {
                const persona = config.get("persona", "Strict Tech Lead");
                const commitMessage = analysis.commitMessage;
                
                const message = getPopupMessage(persona, commitMessage);

                const userChoice = await vscode.window.showInformationMessage(
                    message,
                    { modal: true },
                    "Commit",
                    "Cancel"
                );

                if (userChoice === "Commit") {
                    const terminal = vscode.window.createTerminal("CodeCritter Commit");
                    terminal.sendText(`git add . && git commit -m "${commitMessage}"`);
                    terminal.show();
                    vscode.window.showInformationMessage("Commit successful!");
                }
            } else {
                console.log("CodeCritter: AI deemed changes NOT READY. Reason:", analysis.reason);
            }
        } catch (error) {
            console.error("CodeCritter: Failed to analyze for commit on save:", error);
        }
    }));
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


export function deactivate() {}

function getWebviewContent(context: vscode.ExtensionContext): string {
  const webviewHtmlPath = path.join(context.extensionPath, "webview.html");
  const htmlContent = fs.readFileSync(webviewHtmlPath, "utf8");
  return htmlContent;
}

// Circuit breaker functions
function isCircuitBreakerOpen(): boolean {
  if (!circuitBreaker.isOpen) return false;

  if (circuitBreaker.lastFailure && Date.now() - circuitBreaker.lastFailure > CIRCUIT_BREAKER_TIMEOUT) {
    circuitBreaker.isOpen = false;
    circuitBreaker.failures = 0;
    console.log("Circuit breaker has been reset.");
    return false;
  }
  return true;
}

function recordFailure(): void {
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = Date.now();
  if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreaker.isOpen = true;
    console.log(`Circuit breaker has OPENED after ${circuitBreaker.failures} failures.`);
  }
}

function recordSuccess(): void {
  circuitBreaker.failures = 0;
  circuitBreaker.isOpen = false;
}

// Retry with backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const isRetryable = error.status === 503 || error.status === 429 || (error.status >= 500 && error.status < 600);
      if (!isRetryable || attempt === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("All retry attempts failed");
}

// Prompt generation functions
function getPrompt(persona: string, code: string): string {
  const baseInstruction = `
    Analyze the following code snippet. Provide your review in a pure JSON format, with no markdown wrappers or extra text.
    The JSON object must have two top-level keys:
    1. "review": An object with three string keys: "summary", "critique", and "suggestions".
    2. "productionRisk": An array of objects, where each object has a "risk" (string) and a "isSafe" (boolean).
  `;

  switch (persona) {
    case 'Strict Tech Lead':
      return `You are a Strict Tech Lead. ${baseInstruction}\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
    case 'Supportive Mentor':
      return `You are a Supportive Mentor. ${baseInstruction}\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
    case 'Sarcastic Reviewer':
      return `You are a Sarcastic Reviewer. ${baseInstruction}\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
    case 'Code Poet':
      return `You are a Code Poet. ${baseInstruction}\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
    case 'Paranoid Security Engineer':
      return `You are a Paranoid Security Engineer. Focus ONLY on security vulnerabilities. ${baseInstruction}\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
    default:
      return `Analyze this code: ${code}`;
  }
}

function getDocstringPrompt(code: string): string {
  return `
    You are an expert software engineer writing documentation.
    Analyze the following code snippet and generate a professional docstring for it.
    Format the response as a single block of text, ready to be pasted into a code editor. Do not include any other text or explanation.

    Code:
    \`\`\`
    ${code}
    \`\`\`
  `;
}
// EXPORTED FOR TESTING
export function getCommitMessagePrompt(diff: string): string {
  return `
    Your primary task is to generate a clear, conventional commit message for the following code diff.
    The format must be: <type>(<scope>): <short summary>.

    - Analyze the changes to understand their intent (e.g., adding a feature, fixing a bug, refactoring).
    - If the changes are reasonable, ALWAYS generate a commit message.
    - ONLY if the code diff shows extremely low quality, like syntax errors, large blocks of commented-out code, or only whitespace changes, should you decide it's not ready.

    Respond in a pure JSON format.
    - If you generate a message, the JSON should be: { "ready": true, "commitMessage": "..." }
    - ONLY in cases of extremely poor quality, the JSON should be: { "ready": false, "reason": "..." }

    Diff:
    \`\`\`
    ${diff}
    \`\`\`
  `;
}

// EXPORTED FOR TESTING
export function parseAndValidateJsonResponse(rawText: string): any {
  const jsonRegex = /\{[\s\S]*\}/;
  const match = rawText.match(jsonRegex);
  if (!match) throw new Error("AI response did not contain a valid JSON object.");
  
  const jsonString = match[0];
  let parsedJson;
  try {
    parsedJson = JSON.parse(jsonString);
  } catch (error) {
    throw new Error(`Failed to parse AI response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  if (parsedJson.review && Array.isArray(parsedJson.productionRisk)) {
    const requiredReviewKeys = ['summary', 'critique', 'suggestions'];
    const missingKeys = requiredReviewKeys.filter(key => !(key in parsedJson.review));
    if (missingKeys.length > 0) {
      throw new Error(`AI response's 'review' object is missing keys: ${missingKeys.join(', ')}`);
    }
  } else if (parsedJson.hasOwnProperty('ready') && !parsedJson.ready) {
    if (!parsedJson.reason) {
      throw new Error("AI response is missing 'reason' key.");
    }
  } else if (parsedJson.hasOwnProperty('ready') && parsedJson.ready) {
    if (!parsedJson.commitMessage) {
      throw new Error("AI response is missing 'commitMessage' key.");
    }
  } else {
    throw new Error("Invalid or incomplete AI response format.");
  }


  return parsedJson;
}

// AI service functions
async function generateReview(code: string, persona: string, apiKey: string): Promise<any> {
  if (isCircuitBreakerOpen()) {
    throw new Error("Service is currently unavailable. Please try again later.");
  }

  try {
    const prompt = getPrompt(persona, code);
    const result = await retryWithBackoff(async () => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return parseAndValidateJsonResponse(text);
    });

    recordSuccess();
    return result;
  } catch (error) {
    recordFailure();
    throw error;
  }
}

async function generateDocstring(code: string, apiKey: string): Promise<string> {
  if (isCircuitBreakerOpen()) {
    throw new Error("Service is currently unavailable. Please try again later.");
  }

  try {
    const prompt = getDocstringPrompt(code);
    const result = await retryWithBackoff(async () => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });

    recordSuccess();
    return result;
  } catch (error) {
    recordFailure();
    throw error;
  }
}
async function analyzeAndSuggestCommit(diff: string, apiKey: string): Promise<any> {
  if (isCircuitBreakerOpen()) {
    throw new Error("Service is currently unavailable. Please try again later.");
  }

  try {
    const prompt = getCommitMessagePrompt(diff);
    const result = await retryWithBackoff(async () => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return parseAndValidateJsonResponse(text);
    });

    recordSuccess();
    return result;
  } catch (error) {
    recordFailure();
    throw error;
  }
}