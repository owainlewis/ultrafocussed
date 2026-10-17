import { Modal } from './Modal';

export function Help({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="How the planner works" onClose={onClose}>
      <div className="help-content">
        <ul>
          <li>
            <strong>Dashboard:</strong> review your weekly score and completed
            workforms.
          </li>
          <li>
            <strong>Plan:</strong> write an intention and start a focused hour.
            Submit a workform afterward. Four completed hours is your daily
            goal; partial sessions stay in history.
          </li>
          <li>
            <strong>Tasks:</strong> capture work with a title and optional date.
            Completed tasks are hidden until you choose Show completed.
          </li>
          <li>
            <strong>Calendar:</strong> use Month or Year to schedule tasks. Plan
            records focused hours without clock times.
          </li>
          <li>
            <strong>Projects and Goals:</strong> list the work needed for each
            outcome. Link existing tasks under Organise so every view stays in
            sync.
          </li>
          <li>
            <strong>Weekly:</strong> tick each completed item toward weekly
            targets and review previous weeks.
          </li>
        </ul>
        <p className="help-storage">
          Your planner is saved in this browser on this device. Export a backup
          to keep a copy. Clearing site data removes the local planner.
        </p>
      </div>
    </Modal>
  );
}
