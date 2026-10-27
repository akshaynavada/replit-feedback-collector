import { useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  useCreateFeedback,
  useExportFeedback,
  useGetFeedbackSummary,
  useListFeedback,
  getExportFeedbackQueryKey,
  getGetFeedbackSummaryQueryKey,
  getListFeedbackQueryKey,
} from '@workspace/api-client-react';
import { ArrowDownToLine, ArrowRight, Check, ChevronRight, CircleHelp, Leaf, LoaderCircle, MessageSquareText, Sparkles } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter, Link } from 'wouter';

const queryClient = new QueryClient();
const listParams = { limit: 100, offset: 0 };

function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" className={`brand-mark ${small ? 'brand-mark-small' : ''}`} data-testid="link-home">
      <span className="brand-symbol"><Leaf size={17} strokeWidth={2.1} /></span>
      <span className="brand-word">good<span>signal</span></span>
    </Link>
  );
}

function SurveyPage() {
  const createFeedback = useCreateFeedback();
  const queryClientInstance = useQueryClient();
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errorText, setErrorText] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (score === null || createFeedback.isPending) return;
    setErrorText('');
    createFeedback.mutate({ data: { score, ...(comment.trim() ? { comment: comment.trim() } : {}) } }, {
      onSuccess: () => {
        setSubmitted(true);
        void queryClientInstance.invalidateQueries({ queryKey: getListFeedbackQueryKey(listParams) });
        void queryClientInstance.invalidateQueries({ queryKey: getGetFeedbackSummaryQueryKey() });
      },
      onError: () => setErrorText('We couldn’t send that just now. Please try again.'),
    });
  };

  return (
    <main className="survey-page">
      <header className="survey-nav">
        <Brand />
        <Link href="/results" className="team-link" data-testid="link-results">Team view <ArrowRight size={15} /></Link>
      </header>
      <section className="survey-layout">
        <div className="survey-intro">
          <div className="eyebrow"><span className="eyebrow-dot" /> A small question, a better product</div>
          <h1>Your experience<br />makes us <em>better.</em></h1>
          <p className="intro-copy">A quick check-in helps us understand what’s working — and what could be a little easier.</p>
          <div className="time-note"><span className="time-line" /> About one minute <span className="time-separator">·</span> No wrong answers</div>
          <div className="quiet-quote">
            <span className="quote-mark">“</span>
            <p>Good products are built by listening closely.</p>
            <span className="quote-credit">THE GOODSIGNAL TEAM</span>
          </div>
        </div>
        <div className="survey-card">
          {submitted ? (
            <div className="success-state" data-testid="status-submitted">
              <div className="success-icon"><Check size={26} /></div>
              <span className="eyebrow">RESPONSE RECEIVED</span>
              <h2>Thank you for<br /><em>being honest.</em></h2>
              <p>Your feedback has a place here. We read every response and use it to make the next version better.</p>
              <button className="text-action" onClick={() => { setSubmitted(false); setScore(null); setComment(''); }} data-testid="button-submit-another">Share another response <ArrowRight size={15} /></button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="form-topline"><span className="step-count">01 <span>/ 01</span></span><span className="private-note"><CircleHelp size={14} /> No name or email collected</span></div>
              <h2>How likely are you to<br />recommend us to a friend?</h2>
              <p className="form-explainer">Choose a number from 0 (not likely) to 10 (very likely).</p>
              <div className="score-row" role="radiogroup" aria-label="Recommendation score">
                {Array.from({ length: 11 }, (_, value) => (
                  <button key={value} type="button" role="radio" aria-checked={score === value} onClick={() => setScore(value)} className={`score-button ${score === value ? 'score-selected' : ''}`} data-testid={`button-score-${value}`}>{value}</button>
                ))}
              </div>
              <div className="score-captions"><span>Not likely</span><span>Very likely</span></div>
              <label className="comment-label" htmlFor="feedback-comment">What’s the main reason for your score? <span>OPTIONAL</span></label>
              <textarea id="feedback-comment" maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="A thought, a moment, anything you’d like us to know…" data-testid="input-comment" />
              <div className="form-footer">
                <span className="character-count">{comment.length}/2000</span>
                <button className="submit-button" type="submit" disabled={score === null || createFeedback.isPending} data-testid="button-submit-feedback">
                  {createFeedback.isPending ? <><LoaderCircle size={16} className="spin" /> Sending</> : <>Send feedback <ArrowRight size={16} /></>}
                </button>
              </div>
              {errorText && <p className="form-error" role="alert" data-testid="status-submit-error">{errorText}</p>}
              {score === null && <p className="score-hint">Select a score to continue</p>}
            </form>
          )}
        </div>
      </section>
      <footer className="survey-footer"><span>GOOD SIGNAL, GOOD COMPANY.</span><span>We’re glad you’re here.</span></footer>
    </main>
  );
}

function Metric({ label, value, note, accent = false }: { label: string; value: string | number; note: string; accent?: boolean }) {
  return <div className={`metric ${accent ? 'metric-accent' : ''}`}><span className="metric-label">{label}</span><strong data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</strong><span className="metric-note">{note}</span></div>;
}

function scoreCategory(score: number) {
  if (score >= 9) return { label: 'Promoter', className: 'promoter' };
  if (score >= 7) return { label: 'Passive', className: 'passive' };
  return { label: 'Detractor', className: 'detractor' };
}

function ResultsPage() {
  const summaryQuery = useGetFeedbackSummary({ query: { queryKey: getGetFeedbackSummaryQueryKey() } });
  const listQuery = useListFeedback(listParams, { query: { queryKey: getListFeedbackQueryKey(listParams) } });
  const exportQuery = useExportFeedback({ query: { queryKey: getExportFeedbackQueryKey(), enabled: false } });
  const [exportError, setExportError] = useState('');
  const summary = summaryQuery.data;
  const responses = listQuery.data ?? [];

  const exportCsv = async () => {
    setExportError('');
    try {
      const result = await exportQuery.refetch();
      if (!result.data) throw new Error('No export data');
      const csv = result.data;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'goodsignal-feedback.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError('The export could not be prepared. Please try again.');
    }
  };

  const loading = summaryQuery.isLoading || listQuery.isLoading;
  const error = summaryQuery.isError || listQuery.isError;
  const segments = summary && summary.total > 0 ? [
    { label: 'Promoters', count: summary.promoters, color: 'var(--pine)' },
    { label: 'Passives', count: summary.passives, color: 'var(--ochre)' },
    { label: 'Detractors', count: summary.detractors, color: 'var(--clay)' },
  ] : [];

  return (
    <main className="results-page">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-section-label">WORKSPACE</div>
        <Link href="/" className="side-link" data-testid="link-survey"><MessageSquareText size={17} /> Feedback survey <ChevronRight size={14} className="side-chevron" /></Link>
        <Link href="/results" className="side-link side-link-active" data-testid="link-overview"><span className="overview-glyph">◫</span> Overview <span className="active-line" /></Link>
        <div className="sidebar-bottom"><div className="workspace-badge">GS</div><div><strong>Goodsignal</strong><span>Product team</span></div><span className="online-dot" /></div>
      </aside>
      <div className="results-main">
        <header className="results-header">
          <div><span className="breadcrumb">WORKSPACE <span>/</span> OVERVIEW</span><h1>Feedback overview</h1><p>A considered look at what customers are telling you.</p></div>
          <button className="export-button" onClick={exportCsv} disabled={exportQuery.isFetching} data-testid="button-export">
            {exportQuery.isFetching ? <LoaderCircle size={16} className="spin" /> : <ArrowDownToLine size={16} />}
            {exportQuery.isFetching ? 'Preparing…' : 'Export CSV'}
          </button>
        </header>
        {exportError && <div className="inline-error" role="alert" data-testid="status-export-error">{exportError}</div>}
        {loading ? (
          <div className="loading-board" aria-label="Loading feedback overview"><div className="skeleton-row"><i /><i /><i /></div><div className="skeleton-large" /><div className="skeleton-large short" /></div>
        ) : error ? (
          <section className="empty-panel error-panel" data-testid="status-results-error"><div className="empty-illustration"><CircleHelp size={26} /></div><h2>We couldn’t load your overview.</h2><p>Your feedback is safe. Try loading the data again.</p><button className="submit-button" onClick={() => { void summaryQuery.refetch(); void listQuery.refetch(); }} data-testid="button-retry-results">Try again <ArrowRight size={15} /></button></section>
        ) : !summary || summary.total === 0 ? (
          <section className="empty-panel" data-testid="status-empty-results"><div className="empty-illustration"><Sparkles size={25} /></div><span className="eyebrow">A FRESH START</span><h2>Your first signal is<br /><em>waiting to arrive.</em></h2><p>Share the survey with a customer. Their response will appear here, along with a clearer picture of how things are going.</p><Link href="/" className="submit-button empty-cta" data-testid="link-open-survey">Preview the survey <ArrowRight size={15} /></Link></section>
        ) : (
          <>
            <section className="summary-grid" aria-label="Feedback summary">
              <Metric label="Net promoter score" value={summary.nps > 0 ? `+${summary.nps}` : summary.nps} note="out of 100" accent />
              <Metric label="Average score" value={summary.average.toFixed(1)} note="out of 10" />
              <Metric label="Responses" value={summary.total.toLocaleString()} note="all time" />
              <div className="metric trend-metric"><span className="metric-label">Recent responses</span><strong>{summary.recentCount}</strong><span className="metric-note">vs. {summary.previousCount} previous period</span><div className="trend-track"><span style={{ width: `${summary.recentCount + summary.previousCount ? Math.min((summary.recentCount / (summary.recentCount + summary.previousCount)) * 100, 100) : 0}%` }} /></div></div>
            </section>
            <section className="insights-grid">
              <div className="panel sentiment-panel"><div className="panel-head"><div><span className="eyebrow">THE MIX</span><h2>Sentiment at a glance</h2></div><span className="tiny-note">Based on {summary.total} {summary.total === 1 ? 'response' : 'responses'}</span></div>
                <div className="sentiment-bar" aria-label="Sentiment distribution">{segments.map((segment) => <div key={segment.label} style={{ width: `${summary.total ? (segment.count / summary.total) * 100 : 0}%`, backgroundColor: segment.color }} />)}</div>
                <div className="sentiment-legend">{segments.map((segment) => <div key={segment.label} className="legend-item"><span className="legend-dot" style={{ backgroundColor: segment.color }} /><span>{segment.label}</span><strong>{segment.count}</strong></div>)}</div>
                <div className="sentiment-footnote">A good question can start a good conversation.</div>
              </div>
              <div className="panel nps-panel"><div className="eyebrow">HOW TO READ THIS</div><h2>One number.<br /><em>A lot of context.</em></h2><p>NPS is the share of promoters minus the share of detractors. It’s a starting point for listening, not the whole story.</p><div className="nps-formula"><span>promoters</span><b>−</b><span>detractors</span><b>=</b><strong>NPS</strong></div></div>
            </section>
            <section className="responses-section">
              <div className="responses-heading"><div><span className="eyebrow">THE INBOX</span><h2>Recent responses <span>{responses.length}</span></h2></div><span className="sorted-note">Newest first</span></div>
              {responses.length === 0 ? <div className="small-empty">No written responses yet. Ratings without comments still count toward your overview.</div> : (
                <div className="response-list">{responses.map((response) => {
                  const category = scoreCategory(response.score);
                  return <article className="response-row" key={response.id} data-testid={`response-${response.id}`}><div className={`response-score ${category.className}`}>{response.score}</div><div className="response-content"><div className="response-meta"><span className={`category-label ${category.className}`}>{category.label}</span><time>{new Date(response.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time></div><p>{response.comment || <span className="no-comment">No written comment</span>}</p></div><span className="response-id">#{response.id}</span></article>;
                })}</div>
              )}
            </section>
          </>
        )}
        <footer className="results-footer"><span>GOOD SIGNAL, GOOD COMPANY.</span><Link href="/" data-testid="link-footer-survey">View customer survey <ArrowRight size={13} /></Link></footer>
      </div>
    </main>
  );
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={SurveyPage} /><Route path="/results" component={ResultsPage} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
