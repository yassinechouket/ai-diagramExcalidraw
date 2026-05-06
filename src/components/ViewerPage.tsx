import { useEffect, useMemo, useRef, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "./viewer.css";

type EvalResult = {
  testCaseId: string;
  input: string;
  response: string;
  elements: unknown[];
  durationMs: number;
  error?: string;
};

type ScoredResult = EvalResult & {
  score?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
};

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ViewerPage() {
  const [results, setResults] = useState<ScoredResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedFilename, setLoadedFilename] = useState<string>("results.json");
  const [parseError, setParseError] = useState<string | null>(null);

  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);

  const current = results[currentIndex];
  const currentElements = current?.elements ?? [];

  const unscoredCount = useMemo(
    () => results.filter((r) => r.score == null).length,
    [results]
  );

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;

    const elements = currentElements as any[];
    api.updateScene({
      elements,
      appState: {
        viewBackgroundColor: "#ffffff",
        openSidebar: null,
      },
    });

    if (elements.length > 0) {
      api.scrollToContent(elements, { fitToContent: true });
    }
  }, [currentIndex, currentElements]);

  const handleFile = async (file: File) => {
    setParseError(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) {
        throw new Error("Expected a JSON array of eval results.");
      }

      const normalized: ScoredResult[] = data.map((row: any, i: number) => {
        const testCaseId = String(row?.testCaseId ?? `case-${i + 1}`);
        return {
          testCaseId,
          input: String(row?.input ?? ""),
          response: String(row?.response ?? ""),
          elements: Array.isArray(row?.elements) ? row.elements : [],
          durationMs: typeof row?.durationMs === "number" ? row.durationMs : 0,
          error: typeof row?.error === "string" ? row.error : undefined,
          score:
            row?.score === 1 ||
            row?.score === 2 ||
            row?.score === 3 ||
            row?.score === 4 ||
            row?.score === 5
              ? row.score
              : undefined,
          notes: typeof row?.notes === "string" ? row.notes : undefined,
        };
      });

      setResults(normalized);
      setCurrentIndex(0);
      setLoadedFilename(file.name || "results.json");
    } catch (e) {
      setResults([]);
      setCurrentIndex(0);
      setParseError(e instanceof Error ? e.message : String(e));
    }
  };

  const setScore = (score: 1 | 2 | 3 | 4 | 5) => {
    setResults((prev) =>
      prev.map((r, i) => (i === currentIndex ? { ...r, score } : r))
    );
  };

  const setNotes = (notes: string) => {
    setResults((prev) =>
      prev.map((r, i) => (i === currentIndex ? { ...r, notes } : r))
    );
  };

  const exportScored = () => {
    const base = loadedFilename.replace(/\.json$/i, "");
    downloadJson(`${base}.scored.json`, results);
  };

  return (
    <div className="viewer-app">
      <div className="viewer-topbar">
        <div className="viewer-topbar-left">
          <a className="viewer-link" href="/">
            ← back to app
          </a>
          <div className="viewer-meta">
            <div className="viewer-title">Diagram Viewer</div>
            <div className="viewer-subtitle">
              {results.length > 0
                ? `${currentIndex + 1}/${results.length} (unscored: ${unscoredCount})`
                : "Load an eval results JSON to start"}
            </div>
          </div>
        </div>

        <div className="viewer-topbar-right">
          <label className="viewer-file">
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            Load JSON
          </label>

          <button
            className="viewer-btn"
            onClick={exportScored}
            disabled={results.length === 0}
            type="button"
          >
            Export scored
          </button>
        </div>
      </div>

      {parseError ? <div className="viewer-error">{parseError}</div> : null}

      <div className="viewer-body">
        <div className="viewer-canvas">
          <Excalidraw
            excalidrawAPI={(api) => {
              apiRef.current = api;
            }}
            viewModeEnabled
            zenModeEnabled
            gridModeEnabled={false}
            initialData={{
              elements: [],
              appState: { openSidebar: null, viewBackgroundColor: "#ffffff" },
            }}
          />
        </div>

        <div className="viewer-panel">
          {current ? (
            <>
              <div className="viewer-panel-section">
                <div className="viewer-kv">
                  <div className="viewer-k">Test case</div>
                  <div className="viewer-v">{current.testCaseId}</div>
                </div>
                <div className="viewer-kv">
                  <div className="viewer-k">Elements</div>
                  <div className="viewer-v">{current.elements.length}</div>
                </div>
                <div className="viewer-kv">
                  <div className="viewer-k">Duration</div>
                  <div className="viewer-v">{current.durationMs}ms</div>
                </div>
                {current.error ? (
                  <div className="viewer-kv">
                    <div className="viewer-k">Error</div>
                    <div className="viewer-v viewer-error-text">{current.error}</div>
                  </div>
                ) : null}
              </div>

              <div className="viewer-panel-section">
                <div className="viewer-section-title">Prompt</div>
                <pre className="viewer-pre">{current.input}</pre>
              </div>

              <div className="viewer-panel-section">
                <div className="viewer-section-title">Model response</div>
                <pre className="viewer-pre">{current.response}</pre>
              </div>

              <div className="viewer-panel-section">
                <div className="viewer-section-title">Score (1–5)</div>
                <div className="viewer-score-row">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      className={
                        "viewer-score" + (current.score === n ? " is-active" : "")
                      }
                      onClick={() => setScore(n as 1 | 2 | 3 | 4 | 5)}
                      type="button"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="viewer-panel-section">
                <div className="viewer-section-title">Notes</div>
                <textarea
                  className="viewer-notes"
                  value={current.notes ?? ""}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes…"
                />
              </div>

              <div className="viewer-panel-section viewer-nav">
                <button
                  className="viewer-btn"
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  type="button"
                >
                  Prev
                </button>
                <button
                  className="viewer-btn"
                  onClick={() =>
                    setCurrentIndex((i) => Math.min(results.length - 1, i + 1))
                  }
                  disabled={currentIndex >= results.length - 1}
                  type="button"
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <div className="viewer-empty">
              Load an eval results JSON file (e.g. one from <code>evals/results/</code>).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
