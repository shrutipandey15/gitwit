import * as vscode from 'vscode';
import { getWebviewContent } from './getWebviewContent';

export class WebviewManager {
  private panel: vscode.WebviewPanel;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.panel = vscode.window.createWebviewPanel(
      'codecritterPanel',
      'CodeCritter Review',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [context.extensionUri],
      }
    );

    this.panel.webview.html = getWebviewContent(context);
  }

  public onDidReceiveMessage(
    listener: (message: any) => any,
    thisArgs?: any,
    disposables?: vscode.Disposable[]
  ) {
    this.panel.webview.onDidReceiveMessage(
      listener,
      thisArgs,
      disposables
    );
  }

  public postMessage(message: any) {
    this.panel.webview.postMessage(message);
  }
}