import React from "react";

/*
 * AdErrorBoundary — wraps individual ad components
 *
 * If an ad component throws (SDK crash, bad response, etc.), the overlay is
 * silently removed and `onError` is called so the game can recover cleanly.
 * The player never sees an error state; gameplay continues uninterrupted.
 */

interface Props {
  onError: () => void;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class AdErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Ad] Component error caught by boundary:", error, info);
    // Defer so the state update in getDerivedStateFromError settles first
    setTimeout(() => this.props.onError(), 0);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
