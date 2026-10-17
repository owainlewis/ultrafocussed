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
  ListTodo,
  Clock3,
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  FolderOpen,
  Flag,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { Theme } from './useTheme';

export type PlannerView =
  | 'dashboard'
  | 'tasks'
  | 'year'
  | 'month'
  | 'goals'
  | 'projects'
  | 'weekly'
  | 'plan';

export function PlannerSidebar({
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
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ultrafocussed.sidebar') === 'collapsed';
    } catch {
      return false;
    }
  });
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(
        'ultrafocussed.sidebar',
        next ? 'collapsed' : 'expanded',
      );
    } catch {
      /* Navigation still works when preference storage is unavailable. */
    }
  };
  const navigation = [
    { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { view: 'plan', label: 'Plan', icon: Clock3 },
    { view: 'tasks', label: 'Tasks', icon: ListTodo },
    { view: 'weekly', label: 'Weekly', icon: CalendarCheck },
    { view: 'month', label: 'Calendar', icon: CalendarDays },
    { view: 'projects', label: 'Projects', icon: FolderOpen },
    { view: 'goals', label: 'Goals', icon: Flag },
  ] as const;
  return (
    <aside
      className={`planner-sidebar ${collapsed ? 'is-collapsed' : ''}`}
      aria-label="Planner sidebar"
    >
      <div className="sidebar-brand" title="UltraFocussed">
        <Layers size={22} aria-hidden="true" />
        <span className="sidebar-label">UltraFocussed</span>
      </div>
      <button
        className="sidebar-collapse"
        onClick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        aria-controls="planner-navigation"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <PanelLeftOpen size={18} aria-hidden="true" />
        ) : (
          <PanelLeftClose size={18} aria-hidden="true" />
        )}
      </button>
      <nav
        id="planner-navigation"
        className="sidebar-navigation"
        aria-label="Planner view"
      >
        {navigation.map(({ view: mode, label, icon: Icon }) => (
          <button
            key={mode}
            aria-label={label}
            title={label}
            aria-pressed={
              mode === 'month'
                ? view === 'month' || view === 'year'
                : view === mode
            }
            onClick={() => onView(mode)}
          >
            <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
            <span className="sidebar-label">{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-utilities">
        {(readError || saveError) && (
          <span className="sidebar-save-error" role="status" title="Not saved">
            Not saved
          </span>
        )}
        <div
          className="sidebar-backups"
          role="group"
          aria-label="Planner backups"
        >
          <button
            aria-label="Export backup"
            title="Export backup"
            disabled={readError}
            onClick={onExport}
          >
            <Download size={18} aria-hidden="true" />
            <span className="sidebar-label">Export backup</span>
          </button>
          <button
            aria-label="Import backup"
            title="Import backup"
            onClick={onImport}
          >
            <Upload size={18} aria-hidden="true" />
            <span className="sidebar-label">Import backup</span>
          </button>
        </div>
        <button
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`${theme === 'light' ? 'Dark' : 'Light'} mode`}
          onClick={onTheme}
        >
          {theme === 'light' ? (
            <Moon size={18} aria-hidden="true" />
          ) : (
            <Sun size={18} aria-hidden="true" />
          )}
          <span className="sidebar-label">
            {theme === 'light' ? 'Dark' : 'Light'} mode
          </span>
        </button>
        <button aria-label="Planner help" title="Planner help" onClick={onHelp}>
          <CircleHelp size={18} aria-hidden="true" />
          <span className="sidebar-label">Help</span>
        </button>
      </div>
    </aside>
  );
}

export function PlannerToolbar({
  view,
  title,
  onToday,
  onPeriod,
  onAddGoal,
  onAddProject,
  onCalendarView,
  children,
}: {
  view: PlannerView;
  title: string | number;
  onToday: () => void;
  onPeriod: (delta: number) => void;
  onAddGoal?: () => void;
  onAddProject?: () => void;
  onCalendarView?: (view: 'month' | 'year') => void;
  children?: ReactNode;
}) {
  return (
    <div className="planner-toolbar">
      <div className="period-controls">
        <h1>{title}</h1>
        {(view === 'month' || view === 'year' || view === 'goals') && (
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
        {(view === 'month' || view === 'year') && (
          <div
            className="calendar-scale"
            role="group"
            aria-label="Calendar scale"
          >
            <button
              aria-pressed={view === 'month'}
              onClick={() => onCalendarView?.('month')}
            >
              Month
            </button>
            <button
              aria-pressed={view === 'year'}
              onClick={() => onCalendarView?.('year')}
            >
              Year
            </button>
          </div>
        )}
        {onAddProject && (
          <button className="primary-button" onClick={onAddProject}>
            <Plus size={16} aria-hidden="true" />
            Add project
          </button>
        )}
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
