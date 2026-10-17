import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import type { Task, Goal, Project, Routine } from './model';

export function TaskEditor({
  task,
  onChange,
  onClose,
  onDelete,
  dateFirst,
  goals,
  projects,
  routines,
}: {
  task: Task;
  goals: Goal[];
  projects: Project[];
  routines: Routine[];
  dateFirst: boolean;
  onChange: (patch: Partial<Omit<Task, 'id'>>) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [date, setDate] = useState(task.date ?? '');
  const [goalId, setGoalId] = useState(task.goalId ?? '');
  const [projectId, setProjectId] = useState(task.projectId ?? '');
  const [routineId, setRoutineId] = useState(task.routineId ?? '');
  const [discarding, setDiscarding] = useState(false);
  const previousTask = useRef(task);
  useEffect(() => {
    const before = previousTask.current;
    setTitle((current) => (current === before.title ? task.title : current));
    setDate((current) =>
      current === (before.date ?? '') ? (task.date ?? '') : current,
    );
    setGoalId((current) =>
      current === (before.goalId ?? '') ? (task.goalId ?? '') : current,
    );
    setProjectId((current) =>
      current === (before.projectId ?? '') ? (task.projectId ?? '') : current,
    );
    setRoutineId((current) =>
      current === (before.routineId ?? '') ? (task.routineId ?? '') : current,
    );
    previousTask.current = task;
  }, [task]);
  const close = () => {
    if (
      title !== task.title ||
      date !== (task.date ?? '') ||
      goalId !== (task.goalId ?? '') ||
      routineId !== (task.routineId ?? '') ||
      projectId !== (task.projectId ?? '')
    )
      setDiscarding(true);
    else onClose();
  };
  return (
    <Modal
      title="Task details"
      onClose={close}
      initialFocus={dateFirst ? 'input[type="date"]' : undefined}
    >
      <form
        className="task-editor"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          // Send only editable fields. Legacy notes and metadata stay on the task.
          onChange({
            title: title.trim(),
            date: date || null,
            ...(routineId !== (task.routineId ?? '')
              ? { routineId: routineId || null }
              : {}),
            ...(goalId !== (task.goalId ?? '')
              ? { goalId: goalId || null }
              : {}),
            ...(projectId !== (task.projectId ?? '')
              ? { projectId: projectId || null }
              : {}),
          });
          onClose();
        }}
      >
        <label className="field">
          Task
          <input
            autoFocus
            value={title}
            maxLength={300}
            required
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="field">
          Date (optional)
          <input
            type="date"
            value={date}
            min="0001-01-01"
            max="9999-12-31"
            onInput={(event) => setDate(event.currentTarget.value)}
          />
        </label>
        {date && (
          <button
            className="clear-date"
            type="button"
            onClick={() => setDate('')}
          >
            Clear date
          </button>
        )}
        <details className="task-organise">
          <summary>Organise</summary>
          <label className="field">
            Project
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                  {project.completed ? ' (completed)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Goal
            <select
              value={goalId}
              onChange={(event) => setGoalId(event.target.value)}
            >
              <option value="">No goal</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title} ({goal.year})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Routine
            <select
              value={routineId}
              onChange={(event) => setRoutineId(event.target.value)}
            >
              <option value="">No routine</option>
              {routines
                .filter((item) => !item.archived || item.id === routineId)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                    {item.archived ? ' (archived)' : ''}
                  </option>
                ))}
            </select>
          </label>
        </details>
        <footer className="task-editor-actions">
          <button type="button" className="delete-button" onClick={onDelete}>
            Delete task
          </button>
          <button className="primary-button" disabled={!title.trim()}>
            Save changes
          </button>
        </footer>
      </form>
      {discarding && (
        <Modal
          title="Discard changes?"
          description="Your unsaved task edits will be lost."
          onClose={() => setDiscarding(false)}
        >
          <footer className="modal-actions">
            <button
              className="secondary-button"
              onClick={() => setDiscarding(false)}
            >
              Keep editing
            </button>
            <button className="danger-button" onClick={onClose}>
              Discard changes
            </button>
          </footer>
        </Modal>
      )}
    </Modal>
  );
}
