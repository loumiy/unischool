import { Component, type ErrorInfo, type ReactNode } from 'react';
import { crashSource } from '../engine/crashContext';
import { exportSave } from '../state/persistence';
import { downloadFile } from './download';

// The crash screen (Plan 70C): an error boundary around the whole game. A
// render that throws would otherwise leave a blank page; this says what
// happened in the game's voice and offers the run, a record for a bug
// report, and a reload. The last save in this browser is untouched, so a
// reload reopens the run where it was last saved.

export function CrashFallback({ error }: { error: Error }) {
  const source = crashSource();
  const started = (() => {
    try {
      return source?.state().started === true;
    } catch {
      return false;
    }
  })();
  const download = (what: 'save' | 'report') => {
    try {
      if (!source) return;
      if (what === 'save') {
        const f = exportSave(source.state());
        downloadFile(f.filename, f.text);
      } else {
        const report = JSON.stringify({ error: `${error.name}: ${error.message}`, stack: error.stack ?? null, run: JSON.parse(source.runLog()) as unknown });
        downloadFile(`unischool-bug-report-${Date.now()}.json`, report);
      }
    } catch {
      // Nothing more can be done from here; the reload still is.
    }
  };
  return (
    <div className="front-screen crash-screen" role="alertdialog" aria-modal="true" aria-label="The game has stopped">
      <section className="title-card">
        <h1 className="hall-title">The game has stopped</h1>
        <p>
          Something in the game broke, and it cannot carry on from here. The run is not lost: the last save in this browser is
          where it will reopen after a reload.
        </p>
        {started && (
          <p>
            You can also keep the run as it stood a moment ago, and a record of what happened this session to send with a bug
            report. It replays the session exactly.
          </p>
        )}
        <div className="crash-actions">
          {started && <button type="button" className="save-btn" onClick={() => download('save')}>Download save</button>}
          {source && <button type="button" className="save-btn" onClick={() => download('report')}>Download a bug report</button>}
          <button type="button" className="title-primary" onClick={() => window.location.reload()}>Reload</button>
        </div>
        <p className="crash-detail">{error.name}: {error.message}</p>
      </section>
    </div>
  );
}

export default class CrashScreen extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: unknown): { error: Error } {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Kept on the error for the bug report's stack.
    if (info.componentStack && !error.stack?.includes(info.componentStack)) error.stack = `${error.stack ?? ''}\n${info.componentStack}`;
  }

  render() {
    return this.state.error ? <CrashFallback error={this.state.error} /> : this.props.children;
  }
}
