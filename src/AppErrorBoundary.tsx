import { Component, type ReactNode } from 'react';
import { download } from './download';
import { STORAGE_KEY } from './model';

/** Keep saved data recoverable if an unexpected render error interrupts the app. */
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean; message: string }
> {
  state = { failed: false, message: '' };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  private exportSaved = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        this.setState({
          message: 'No saved planner was found in this browser.',
        });
        return;
      }
      download(raw, 'ultrafocussed-recovery.json');
      this.setState({ message: 'Your saved planner was downloaded.' });
    } catch {
      this.setState({
        message: 'Browser storage is unavailable. Try reloading the app.',
      });
    }
  };
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="app-error" role="alert">
        <h1>The planner could not open</h1>
        <p>
          An unexpected error interrupted the app. Your saved data has not been
          cleared.
        </p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={this.exportSaved}>
            Download saved planner
          </button>
          <button
            className="primary-button"
            onClick={() => window.location.reload()}
          >
            Reload app
          </button>
        </div>
        {this.state.message && <p role="status">{this.state.message}</p>}
      </main>
    );
  }
}
