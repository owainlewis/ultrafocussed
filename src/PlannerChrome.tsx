import {
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  Upload,
  Sun,
  Moon,
  Plus,
  Layers,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { Theme } from './useTheme';

export type PlannerView = 'today' | 'year' | 'month' | 'goals';

export function PlannerHeader({
  view,
  onView,
  theme,
  onTheme,
  onExport,
  onImport,
  onHelp,
  readError,
  saveError,
}: {
  view: PlannerView;
  onView: (view: PlannerView) => void;
  theme: Theme;
  onTheme: () => void;
  onExport: () => void;
  onImport: () => void;
  onHelp: () => void;
  readError: boolean;
  saveError: boolean;
}) {
  return (
    <header className="app-header">
      <div className="app-identity">
        <Layers size={19} aria-hidden="true" />
        <span>UltraFocussed</span>
      </div>
      <nav className="planner-tabs" aria-label="Planner view">
        {(['today', 'month', 'year', 'goals'] as const).map((mode) => (
          <button
            key={mode}
            aria-pressed={view === mode}
            onClick={() => onView(mode)}
          >
            {mode === 'today'
              ? 'Today'
              : mode === 'month'
                ? 'Month'
                : mode === 'year'
                  ? 'Year'
                  : 'Goals'}
          </button>
        ))}
      </nav>
      <div className="app-utilities">
        {(readError || saveError) && (
          <span className="save-failed">Not saved</span>
        )}
        <div className="backup-actions" aria-label="Planner backups">
          <button
            className="icon-button"
            aria-label="Export backup"
            title="Export backup"
            disabled={readError}
            onClick={onExport}
          >
            <Download size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Import backup"
            title="Import backup"
            onClick={onImport}
          >
            <Upload size={17} />
          </button>
        </div>
        <button
          className="icon-button"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`${theme === 'light' ? 'Dark' : 'Light'} mode`}
          onClick={onTheme}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button
          className="icon-button"
          aria-label="Planner help"
          title="Planner help"
          onClick={onHelp}
        >
          <CircleHelp size={18} />
        </button>
      </div>
    </header>
  );
}

export function PlannerToolbar({
  view,
  title,
  onToday,
  onPeriod,
  onAddGoal,
  children,
}: {
  view: PlannerView;
  title: string | number;
  onToday: () => void;
  onPeriod: (delta: number) => void;
  onAddGoal?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="planner-toolbar">
      <div className="period-controls">
        <h1>{title}</h1>
        {view !== 'today' && (
          <>
            <div className="period-buttons">
              <button
                className="icon-button"
                aria-label={
                  view === 'month' ? 'Previous month' : 'Previous year'
                }
                onClick={() => onPeriod(-1)}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="icon-button"
                aria-label={view === 'month' ? 'Next month' : 'Next year'}
                onClick={() => onPeriod(1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <button
              className="text-button"
              aria-label="Go to today"
              onClick={onToday}
            >
              Today
            </button>
          </>
        )}
      </div>
      <div className="view-actions">
        {children}
        {onAddGoal && (
          <button className="primary-button" onClick={onAddGoal}>
            <Plus size={16} aria-hidden="true" />
            Add goal
          </button>
        )}
      </div>
    </div>
  );
}
