"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.diagnosticCollection = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const registerCommands_1 = require("./commands/registerCommands");
const handlers_1 = require("./commands/handlers");
exports.diagnosticCollection = vscode.languages.createDiagnosticCollection('codecritter');
async function activate(context) {
    try {
        console.log('CodeCritter: Extension is now active!');
        (0, registerCommands_1.registerCommands)(context);
        context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((document) => {
            if (document.uri.path.includes('/.git/'))
                return;
            (0, handlers_1.onDidSaveTextDocumentHandler)(document, context);
        }));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`CodeCritter failed to activate: ${errorMessage}`);
        console.error('CodeCritter Activation Error:', error);
    }
}
function deactivate() {
    console.log('CodeCritter: Extension deactivated.');
}
//# sourceMappingURL=extension.js.map