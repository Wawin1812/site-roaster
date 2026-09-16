import { useState, type FormEvent } from 'react';
import './App.css';
import type { AnalysisReport, PerformanceScores, Severity } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info'
};

type Tone = 'professional' | 'roast';

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [tone, setTone] = useState<Tone>('professional');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }
      setReport(data as AnalysisReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while analyzing that URL.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🔥 Site Roaster</h1>
        <p>Point it at a website and get an honest report on its tech stack, security, and performance.</p>
      </header>

      <form className="url-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Roasting…' : 'Roast it'}
        </button>
      </form>

      {error && <div className="error-banner">{error}</div>}

      {report && (
        <>
          <div className="tone-toggle" role="group" aria-label="Report tone">
            <button
              type="button"
              className={tone === 'professional' ? 'tone-btn active' : 'tone-btn'}
              onClick={() => setTone('professional')}
            >
              Professional
            </button>
            <button
              type="button"
              className={tone === 'roast' ? 'tone-btn active' : 'tone-btn'}
              onClick={() => setTone('roast')}
            >
              🔥 Brutal Roast
            </button>
          </div>
          <Report report={report} tone={tone} />
        </>
      )}
    </div>
  );
}

function Report({ report, tone }: { report: AnalysisReport; tone: Tone }) {
  const isRoast = tone === 'roast';

  return (
    <div className="report">
      <section className="grade-card">
        <div className={`grade grade-${report.grade}`}>{report.grade}</div>
        <div>
          <div className="grade-score">Overall score: {report.overallScore}/100</div>
          <div className="grade-url">{report.url}</div>
          {isRoast && <div className="grade-roast">{report.roastHeadline}</div>}
        </div>
      </section>

      <section className="panel">
        <h2>Detected Technologies</h2>
        {report.technologies.length === 0 ? (
          <p className="muted">No technologies confidently detected.</p>
        ) : (
          <ul className="tech-list">
            {report.technologies.map((tech) => (
              <li key={tech.slug} className="tech-item">
                <div className="tech-header">
                  <span className="tech-name">{tech.name}</span>
                  {tech.version && <span className="tech-version">v{tech.version}</span>}
                  <span className="tech-categories">{tech.categories.join(', ')}</span>
                </div>
                <div className="tech-note">{isRoast ? tech.roast : tech.note}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Security Findings ({report.security.score}/100)</h2>
        {report.security.findings.length === 0 ? (
          <p className="muted">No security issues found. Nice work.</p>
        ) : (
          <ul className="findings-list">
            {report.security.findings.map((finding) => (
              <li key={finding.id} className={`severity-${finding.severity}`}>
                <span className="severity-badge">{SEVERITY_LABELS[finding.severity]}</span>
                <div>
                  <div className="finding-title">{finding.title}</div>
                  <div className="finding-advice">{isRoast ? finding.roast : finding.advice}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Performance</h2>
        {report.performance.available ? (
          <ul className="perf-scores">
            {(Object.entries(report.performance.scores) as [keyof PerformanceScores, number | null][]).map(([key, value]) => (
              <li key={key}>
                <span className="perf-label">{formatPerfLabel(key)}</span>
                <span className="perf-value">{value ?? 'n/a'}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Performance data unavailable: {report.performance.reason}</p>
        )}
      </section>

      <section className="panel">
        <h2>Suggestions</h2>
        <ul className="findings-list">
          {report.suggestions.map((suggestion) => (
            <li key={suggestion.id} className={`severity-${suggestion.severity}`}>
              <span className="severity-badge">{SEVERITY_LABELS[suggestion.severity]}</span>
              <div>
                <div className="finding-title">{suggestion.title}</div>
                <div className="finding-advice">{isRoast ? suggestion.roast : suggestion.advice}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function formatPerfLabel(key: keyof PerformanceScores): string {
  const labels: Record<keyof PerformanceScores, string> = {
    performance: 'Performance',
    accessibility: 'Accessibility',
    bestpractices: 'Best Practices',
    seo: 'SEO'
  };
  return labels[key] || key;
}

export default App;
