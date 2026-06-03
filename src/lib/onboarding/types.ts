export type OnboardingStepStatus = "done" | "todo" | "warning";

export type OnboardingActionKey =
  | "open_holdings_manager"
  | "open_watchlist_manager"
  | "open_import_csv"
  | "open_edit_goals"
  | "open_data_controls"
  | "refresh_fx";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  status: OnboardingStepStatus;
  /** Lower = more important. Steps with priority <= 3 are considered critical. */
  priority: number;
  ctaLabel?: string;
  actionKey?: OnboardingActionKey;
}

export interface OnboardingChecklist {
  steps: OnboardingStep[];
  totalSteps: number;
  completedSteps: number;
  warningCount: number;
  /** True when all non-backup steps are "done". */
  isComplete: boolean;
  /** First non-done step by priority, excluding backup. */
  nextStep: OnboardingStep | null;
}
