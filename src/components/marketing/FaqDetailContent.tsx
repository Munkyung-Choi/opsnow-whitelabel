'use client';

import ReactMarkdown from 'react-markdown';

interface Props {
  answer: string;
}

export default function FaqDetailContent({ answer }: Props) {
  return (
    <div className="prose prose-neutral max-w-none dark:prose-invert">
      <ReactMarkdown>{answer}</ReactMarkdown>
    </div>
  );
}
