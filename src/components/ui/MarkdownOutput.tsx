"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-lg font-bold text-white mt-4 mb-2">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-white mt-3 mb-1">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-white/90 mt-2 mb-1">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-white/80 leading-relaxed mb-2">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1 mb-2 text-sm text-white/80">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 mb-2 text-sm text-white/80">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-sm text-white/80 leading-relaxed">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-white/70">{children}</em>
  ),
  code: ({ children, className }) => {
    const isBlock = !!className;
    if (isBlock) {
      return (
        <code className="font-mono text-xs text-white/80 bg-transparent p-0">
          {children}
        </code>
      );
    }
    return (
      <code className="font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded text-blue-300">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-white/5 border border-white/10 rounded-lg p-3 overflow-x-auto mb-2">
      {children}
    </pre>
  ),
  hr: () => <hr className="border-white/10 my-3" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-blue-500/50 pl-3 italic text-white/60 my-2">
      {children}
    </blockquote>
  ),
};

export function MarkdownOutput({ content }: { content: string }) {
  return (
    <div className="prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
