import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Top-level React error boundary. Replaces the white-screen-of-death with
 * a styled fallback that nudges the user back to /. Dexie data (settings,
 * progress, lessons) is unaffected by render errors so the user can simply
 * reload after fixing whatever input caused the crash.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0A0A0F",
            color: "white",
            fontFamily: "Sora, sans-serif",
            padding: "40px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 24 }}>⚠️</div>
          <h1
            style={{
              fontFamily: "Clash Display, sans-serif",
              fontSize: 32,
              marginBottom: 12,
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              marginBottom: 32,
              maxWidth: 400,
            }}
          >
            An unexpected error occurred. Your progress is saved locally.
          </p>
          <button
            onClick={() => {
              window.location.href = "/";
            }}
            style={{
              background: "#C8973A",
              color: "#0A0A0F",
              border: "none",
              padding: "14px 32px",
              borderRadius: 50,
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Back to home
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre
              style={{
                marginTop: 24,
                fontSize: 11,
                color: "rgba(255,255,255,0.3)",
                maxWidth: 600,
                textAlign: "left",
                overflow: "auto",
              }}
            >
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
