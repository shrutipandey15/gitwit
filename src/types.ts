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

export interface RefactorIssue {
  line: number;
  issue: string;
  category: string;
}

export interface IntelligentRefactorResponse {
  refactoredCode: string;
  explanation: string;
  alternativeSuggestion?: {
    explanation: string;
    code: string;
  };
}
