/**
 * CrewTimeline — static visual of the Triage → Reply → Approve flow.
 * Used on the landing page and reused by the dashboard later.
 * No animation, no client JS: pure presentational component.
 */

export interface CrewStep {
  id: string;
  label: string;
  description: string;
}

export const DEFAULT_CREW_STEPS: CrewStep[] = [
  {
    id: "triage",
    label: "Triage",
    description: "The crew reads the message and sorts it: reply, escalate, or ignore.",
  },
  {
    id: "reply",
    label: "Reply",
    description: "The crew drafts a reply in your voice, using your knowledge base.",
  },
  {
    id: "approve",
    label: "Approve",
    description: "You review the draft. Approve, edit, or reject — nothing ships without you.",
  },
];

interface CrewTimelineProps {
  steps?: CrewStep[];
  /** Zero-based index of the current step. -1 means no step is active yet. */
  currentStep?: number;
}

export default function CrewTimeline({
  steps = DEFAULT_CREW_STEPS,
  currentStep = -1,
}: CrewTimelineProps) {
  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:gap-0">
      {steps.map((step, index) => {
        const isCurrent = index === currentStep;
        const isDone = currentStep > index;
        const isLast = index === steps.length - 1;
        return (
          <li
            key={step.id}
            className="relative flex flex-1 gap-4 pb-8 sm:flex-col sm:gap-0 sm:pb-0"
          >
            {/* Connector line */}
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute left-[15px] top-9 h-[calc(100%-2rem)] w-px bg-line sm:left-[calc(2rem+15px)] sm:top-[15px] sm:h-px sm:w-[calc(100%-2rem)]"
              />
            )}
            <span
              aria-hidden="true"
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                isDone
                  ? "border-accent bg-accent text-white"
                  : isCurrent
                    ? "border-accent bg-paper text-accent"
                    : "border-line bg-paper text-muted"
              }`}
            >
              {index + 1}
            </span>
            <div className="sm:mt-3 sm:pr-6">
              <p
                className={`font-display text-lg font-semibold ${
                  isCurrent || isDone ? "text-ink" : "text-muted"
                }`}
              >
                {step.label}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {step.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
