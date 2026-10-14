import React from "react";

export interface TErrorSource {
  path: string | number;
  message: string;
}

export interface TErrorResponse {
  success?: boolean;
  message?: string;
  errorSources?: TErrorSource[];
  err?: Record<string, unknown> & {
    statusCode?: number;
  };
  stack?: string;
}

// RTK Query Error টাইপ সাপোর্টসহ Props ইন্টারফেস
interface ErrorProps {
  error?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeError(error: unknown): TErrorResponse {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  if (typeof error === "string") {
    return { message: error };
  }

  const outer = isRecord(error) ? error : undefined;
  const response = outer && isRecord(outer.data) ? outer.data : outer;
  if (!response) return { message: "An unexpected error occurred." };

  const responseError = isRecord(response.err) ? response.err : undefined;
  const statusCode =
    typeof responseError?.statusCode === "number"
      ? responseError.statusCode
      : typeof response.status === "number"
        ? response.status
        : typeof outer?.status === "number"
          ? outer.status
          : undefined;
  const errorSources = Array.isArray(response.errorSources)
    ? response.errorSources.flatMap((source): TErrorSource[] =>
        isRecord(source) &&
        (typeof source.path === "string" || typeof source.path === "number") &&
        typeof source.message === "string"
          ? [{ path: source.path, message: source.message }]
          : [],
      )
    : undefined;

  return {
    message:
      (typeof response.message === "string" && response.message) ||
      (typeof outer?.error === "string" && outer.error) ||
      "An unexpected error occurred.",
    errorSources,
    err: statusCode === undefined ? undefined : { ...responseError, statusCode },
    stack: typeof response.stack === "string" ? response.stack : undefined,
  };
}

const ErrorPage: React.FC<ErrorProps> = ({ error }) => {
  if (!error) return null;

  const { message, errorSources = [], err = {}, stack = "" } = normalizeError(error);

  return (
    <div style={styles.container}>
      {/* Header / Status Banner */}
      <div style={styles.header}>
        {typeof err?.statusCode === "number" && <span style={styles.badge}>{err.statusCode}</span>}
        <h2 style={styles.title}>{message}</h2>
      </div>

      {/* Error Sources Breakdown */}
      {errorSources.length > 0 && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Error Details</h4>
          <ul style={styles.list}>
            {errorSources.map((source: TErrorSource, index: number) => (
              <li key={index} style={styles.listItem}>
                {source.path !== "" && <strong>{source.path}: </strong>}
                <span>{source.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stack Trace */}
      {stack && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Stack Trace</h4>
          <pre style={styles.stack}>{stack}</pre>
        </div>
      )}
    </div>
  );
};

// Strongly-typed CSS styles
const styles = {
  container: {
    maxWidth: "700px",
    margin: "20px auto",
    padding: "24px",
    borderRadius: "8px",
    backgroundColor: "#fff5f5",
    border: "1px solid #feb2b2",
    color: "#2d3748",
    fontFamily: "system-ui, -apple-system, sans-serif",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    borderBottom: "1px solid #fed7d7",
    paddingBottom: "12px",
    marginBottom: "16px",
  },
  badge: {
    backgroundColor: "#e53e3e",
    color: "#ffffff",
    padding: "4px 10px",
    borderRadius: "4px",
    fontSize: "14px",
    fontWeight: "bold",
  },
  title: {
    margin: 0,
    fontSize: "18px",
    color: "#c53030",
  },
  section: {
    marginTop: "16px",
  },
  sectionTitle: {
    margin: "0 0 8px 0",
    fontSize: "14px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#742a2a",
  },
  list: {
    margin: 0,
    paddingLeft: "20px",
    color: "#9b2c2c",
  },
  listItem: {
    marginBottom: "4px",
    fontSize: "14px",
  },
  stack: {
    backgroundColor: "#2d3748",
    color: "#f7fafc",
    padding: "14px",
    borderRadius: "6px",
    fontSize: "12px",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontFamily: "Courier New, Courier, monospace",
  },
} satisfies Record<string, React.CSSProperties>;

export default ErrorPage;