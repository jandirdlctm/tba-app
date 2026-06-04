import { JOB_STAGES, type JobStage } from '../types';

interface StageTrackerProps {
  stage: JobStage;
  /** Admins can advance the stage; workers see it read-only. */
  editable: boolean;
  onChange?: (next: JobStage) => void;
  saving?: boolean;
}

// 3-step job workflow: Demo/Prep → Build → Finish. Distinct from the
// active/upcoming/completed status. Admins tap a step to set it.
export default function StageTracker({ stage, editable, onChange, saving }: StageTrackerProps) {
  const currentIndex = JOB_STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="stage">
      {JOB_STAGES.map((s, i) => {
        const done = i <= currentIndex;
        const isCurrent = i === currentIndex;
        const Tag = editable ? 'button' : 'div';
        return (
          <Tag
            key={s.key}
            type={editable ? 'button' : undefined}
            className={`stage__step${done ? ' stage__step--done' : ''}${isCurrent ? ' stage__step--current' : ''}`}
            onClick={editable && onChange ? () => onChange(s.key) : undefined}
            disabled={editable ? saving : undefined}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className="stage__dot">{i + 1}</span>
            <span className="stage__label">{s.label}</span>
          </Tag>
        );
      })}
    </div>
  );
}
