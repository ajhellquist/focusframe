import React from 'react';

type ReactMarkdownProps = {
  children?: React.ReactNode;
  className?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  remarkPlugins?: any[];
};

// Simple mock used for tests: renders markdown children without parsing.
const ReactMarkdownMock: React.FC<ReactMarkdownProps> = ({ children, className }) => (
  <div className={className}>{children}</div>
);

export default ReactMarkdownMock;
