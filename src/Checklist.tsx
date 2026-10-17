import { useState, type ReactNode } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import type { Task } from './model';

export function Checklist({
  id,
  title,
  kind,
  tasks,
  renderTasks,
  onAdd,
  onEdit,
  onRemove,
  completed,
  onToggleState,
}: {
  id: string;
  title: string;
  kind: 'goal' | 'project';
  tasks: Task[];
  renderTasks: (tasks: Task[]) => ReactNode;
  onAdd: (title: string, id: string) => void;
  onEdit: () => void;
  onRemove: () => void;
  completed?: boolean;
  onToggleState?: () => void;
}) {
  const [draft, setDraft] = useState('');
  return (
    <section
      className="goal-column"
      aria-label={`${kind === 'goal' ? 'Goal' : 'Project'}: ${title}`}
    >
      <header>
        <h2>{title}</h2>
        <div className="goal-controls">
          {onToggleState && (
            <button
              className="checklist-status"
              aria-label={`${completed ? 'Reopen' : 'Complete'} project ${title}`}
              onClick={onToggleState}
            >
              {completed ? 'Completed' : 'Active'}
            </button>
          )}
          <button
            className="icon-button"
            aria-label={`Edit ${kind} ${title}`}
            onClick={onEdit}
          >
            <Pencil size={15} />
          </button>
          <button
            className="icon-button"
            aria-label={`Remove ${kind} ${title}`}
            onClick={onRemove}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </header>
      {renderTasks(tasks)}
      <form
        className="goal-action-composer"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          onAdd(draft.trim(), id);
          setDraft('');
        }}
      >
        <Plus size={15} aria-hidden="true" />
        <input
          aria-label={`New ${kind === 'goal' ? 'action' : 'task'} for ${title}`}
          placeholder={kind === 'goal' ? 'Add an action' : 'Add a task'}
          maxLength={300}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button className="small-primary" disabled={!draft.trim()}>
          Add
        </button>
      </form>
    </section>
  );
}

export function NameDialog({
  kind,
  title,
  onSave,
  onClose,
}: {
  kind: 'goal' | 'project';
  title?: string;
  onSave: (title: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(title ?? '');
  return (
    <Modal
      title={title === undefined ? `Add a ${kind}` : `Edit ${kind}`}
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim()) onSave(draft.trim());
        }}
      >
        <label className="field">
          {kind === 'goal' ? 'Goal name' : 'Project name'}
          <input
            autoFocus
            required
            maxLength={200}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <footer className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" disabled={!draft.trim()}>
            {title === undefined ? `Add ${kind}` : `Save ${kind}`}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
