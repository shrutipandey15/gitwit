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
exports.registerCommands = registerCommands;
const vscode = __importStar(require("vscode"));
const handlers_1 = require("./handlers");
function registerCommands(context) {
    const personaStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    personaStatusBarItem.command = 'codecritter.selectPersona';
    const updateStatusBarItem = () => {
        const config = vscode.workspace.getConfiguration('codecritter');
        const persona = config.get('persona', 'Strict Tech Lead');
        personaStatusBarItem.text = `🤖 ${persona}`;
        personaStatusBarItem.tooltip = 'Select CodeCritter Persona';
        personaStatusBarItem.show();
    };
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('codecritter.persona')) {
            updateStatusBarItem();
        }
    }));
    updateStatusBarItem();
    const startReviewDisposable = vscode.commands.registerCommand('codecritter.start', () => (0, handlers_1.startReviewHandler)(context));
    const toggleAutoReviewDisposable = vscode.commands.registerCommand('codecritter.toggleAutoReview', handlers_1.toggleAutoReviewHandler);
    const selectPersonaDisposable = vscode.commands.registerCommand('codecritter.selectPersona', handlers_1.selectPersonaHandler);
    const explainCodeDisposable = vscode.commands.registerCommand('codecritter.explainCode', handlers_1.explainCodeHandler);
    const showStatsDisposable = vscode.commands.registerCommand('codecritter.showStats', () => (0, handlers_1.showStatsHandler)(context));
    context.subscriptions.push(startReviewDisposable, toggleAutoReviewDisposable, selectPersonaDisposable, personaStatusBarItem, explainCodeDisposable, showStatsDisposable);
}
//# sourceMappingURL=registerCommands.js.map