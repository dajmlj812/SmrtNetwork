"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-lg font-bold text-foreground-strong mt-4 mb-2">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-foreground-strong mt-3 mb-1">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-foreground mt-2 mb-1">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-foreground leading-relaxed mb-2">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1 mb-2 text-sm text-foreground marker:text-faint">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 mb-2 text-sm text-foreground marker:text-faint">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-sm text-foreground leading-relaxed">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground-strong">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-foreground-muted">{children}</em>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent hover:text-accent-hover underline underline-offset-2"
    >
      {children}
    </a>
  ),
  code: ({ children, className }) => {
    const isBlock = !!className;
    if (isBlock) {
      return (
        <code className="font-mono text-xs text-foreground bg-transparent p-0">
          {children}
        </code>
      );
    }
    return (
      <code className="font-mono text-xs bg-overlay-strong px-1.5 py-0.5 rounded text-accent">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-overlay border rounded-lg p-3 overflow-x-auto mb-2">
      {children}
    </pre>
  ),
  hr: () => <hr className="border-t my-3" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-accent/60 pl-3 italic text-foreground-muted my-2">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-2 py-1.5">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2 py-1.5 text-sm text-foreground border-b">{children}</td>
  ),
};

export function MarkdownOutput({ content }: { content: string }) {
  return (
    <div>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
