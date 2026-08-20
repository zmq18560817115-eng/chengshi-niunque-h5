"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

export class MotionBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onError?: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[H5Motion] isolated animation failure", error.name, info.componentStack ? "component-stack-available" : "no-component-stack");
    this.props.onError?.();
  }

  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
