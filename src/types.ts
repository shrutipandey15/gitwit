import * as vscode from 'vscode';

export interface GitExtensionExports {
    getAPI(version: 1): API;
}
export interface API {
    repositories: Repository[];
}
export interface Repository {
}

export interface CircuitBreaker {
  failures: number;
  lastFailure: number | null;
  isOpen: boolean;
}

export interface ReviewData {
  review: {
    summary: string;
    critique: string;
    suggestions: string;
  };
  productionRisk: {
    risk: string;
    isSafe: boolean;
  }[];
  severity?: 'low' | 'medium' | 'high';
}

export interface IntelligentRefactorResponse {
  refactoredCode: string;
  explanation: string;
  alternativeSuggestion?: string;
}
