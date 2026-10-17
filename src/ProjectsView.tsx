import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Checklist, NameDialog } from './Checklist';
import { Modal } from './Modal';
import type { Project, Task } from './model';

export function ProjectsView({
  projects,
  tasks,
  creating,
  onCreationClose,
  renderTasks,
  onAdd,
  onRename,
  onRemove,
  onToggleState,
  onAddTask,
}: {
  projects: Project[];
  tasks: Task[];
  creating: boolean;
  onCreationClose: () => void;
  renderTasks: (tasks: Task[]) => ReactNode;
  onAdd: (title: string) => void;
  onRename: (id: string, title: string) => void;
  onRemove: (id: string) => void;
  onToggleState: (id: string) => void;
  onAddTask: (title: string, id: string) => void;
}) {
  const [editing, setEditing] = useState<Project | null>(null);
  const [removing, setRemoving] = useState<Project | null>(null);
  const focusAfterRemove = useRef(false);
  useEffect(() => {
    if (focusAfterRemove.current) {
      document
        .querySelector<HTMLButtonElement>('.view-actions .primary-button')
        ?.focus();
      focusAfterRemove.current = false;
    }
  }, [projects.length]);
  const root = useRef<HTMLDivElement>(null);
  const focusNew = useRef(false);
  useEffect(() => {
    if (!focusNew.current) return;
    root.current
      ?.querySelector<HTMLInputElement>('.goal-column:last-child input')
      ?.focus();
    focusNew.current = false;
  }, [projects.length]);
  return (
    <div className="goals-view projects-view" ref={root}>
      <div className="goals-grid">
        {projects.map((project) => (
          <Checklist
            key={project.id}
            kind="project"
            id={project.id}
            title={project.title}
            completed={project.completed}
            tasks={tasks.filter((task) => task.projectId === project.id)}
            renderTasks={renderTasks}
            onAdd={onAddTask}
            onEdit={() => setEditing(project)}
            onRemove={() => setRemoving(project)}
            onToggleState={() => onToggleState(project.id)}
          />
        ))}
      </div>
      {(creating || editing) && (
        <NameDialog
          kind="project"
          title={editing?.title}
          onClose={() => {
            setEditing(null);
            onCreationClose();
          }}
          onSave={(title) => {
            if (editing) onRename(editing.id, title);
            else {
              focusNew.current = true;
              onAdd(title);
            }
            setEditing(null);
            onCreationClose();
          }}
        />
      )}
      {removing && (
        <Modal
          title="Remove project"
          description={`Remove “${removing.title}”? Its tasks and scheduled dates will be kept.`}
          onClose={() => setRemoving(null)}
        >
          <footer className="modal-actions">
            <button
              className="secondary-button"
              onClick={() => setRemoving(null)}
            >
              Keep project
            </button>
            <button
              className="danger-button"
              onClick={() => {
                focusAfterRemove.current = true;
                onRemove(removing.id);
                setRemoving(null);
              }}
            >
              Remove project
            </button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
