import { Component, type ReactNode } from 'react';
import { Alert } from 'antd';

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { error?: string };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error) {
    return { error: error?.message || '组件渲染失败' };
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback || (
          <Alert type="warning" showIcon message="地图加载失败" description={this.state.error} />
        )
      );
    }
    return this.props.children;
  }
}
