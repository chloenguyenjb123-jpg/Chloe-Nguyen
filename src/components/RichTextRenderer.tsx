import type { ReactNode } from 'react';

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function renderInlineFormatting(text: string): ReactNode[] {
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-[#55443F]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={idx} className="italic text-[#6D5A54]">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={idx} className="font-mono text-[12.5px] bg-[#F3EDE6] text-[#55443F] px-1.5 py-0.5 rounded">
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      if (isSafeUrl(href)) {
        return (
          <a
            key={idx}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#A77C78] underline hover:text-[#55443F]"
          >
            {label}
          </a>
        );
      }
      return <span key={idx}>{label}</span>;
    }
    return <span key={idx}>{part}</span>;
  });
}

interface Props {
  content: string;
  compact?: boolean;
}

export function RichTextRenderer({ content, compact = false }: Props) {
  const lines = content.split('\n');

  return (
    <div className={compact ? 'space-y-1 text-sm text-[#6D5A54]' : 'space-y-2 text-sm text-[#6D5A54] leading-relaxed'}>
      {lines.map((rawLine, index) => {
        const line = rawLine.trimEnd();
        if (!line.trim()) {
          return compact ? null : <div key={index} className="h-1" />;
        }
        if (line.startsWith('### ')) {
          return (
            <h4 key={index} className="text-sm font-semibold text-[#55443F] pt-1">
              {renderInlineFormatting(line.slice(4))}
            </h4>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h3 key={index} className="text-base font-semibold text-[#55443F] pt-1">
              {renderInlineFormatting(line.slice(3))}
            </h3>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h2 key={index} className="font-display text-lg font-semibold text-[#55443F] pt-1">
              {renderInlineFormatting(line.slice(2))}
            </h2>
          );
        }
        if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
          return (
            <div key={index} className="flex items-start gap-2 pl-1">
              <span className="mt-0.5 w-4 h-4 rounded border border-[#5B6B52] bg-[#A8B5A0] text-white text-[11px] flex items-center justify-center shrink-0">
                ✓
              </span>
              <span className="line-through text-[#9A8983]">{renderInlineFormatting(line.slice(6))}</span>
            </div>
          );
        }
        if (line.startsWith('- [ ] ')) {
          return (
            <div key={index} className="flex items-start gap-2 pl-1">
              <span className="mt-0.5 w-4 h-4 rounded border border-[#D8C3B5] bg-white shrink-0" />
              <span>{renderInlineFormatting(line.slice(6))}</span>
            </div>
          );
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={index} className="flex items-start gap-2 pl-1">
              <span className="text-[#A77C78] select-none">•</span>
              <span>{renderInlineFormatting(line.slice(2))}</span>
            </div>
          );
        }
        if (line.startsWith('> ')) {
          return (
            <blockquote key={index} className="pl-3 py-1.5 bg-[#F8F5F0] border-l-2 border-[#EBCFD0] rounded-r text-[#7F6D67] italic">
              {renderInlineFormatting(line.slice(2))}
            </blockquote>
          );
        }
        return <p key={index}>{renderInlineFormatting(line)}</p>;
      })}
    </div>
  );
}
