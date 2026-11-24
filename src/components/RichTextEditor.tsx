import { useRef, useState } from 'react';
import { Bold, CheckSquare, Eye, Heading2, Italic, Link2, List, Pencil, Quote } from 'lucide-react';
import { useI18n } from '../i18n/LanguageContext';
import { RichTextRenderer } from './RichTextRenderer';

interface Props {
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
  placeholder?: string;
}

export function RichTextEditor({
  value,
  onChange,
  maxLength = 20000,
  placeholder,
}: Props) {
  const { lang } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const insertSnippet = (before: string, after = '', fallbackText = 'text') => {
    const el = textareaRef.current;
    if (!el) {
      onChange((value + '\n' + before + fallbackText + after).slice(0, maxLength));
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || fallbackText;
    const next = (value.slice(0, start) + before + selected + after + value.slice(end)).slice(0, maxLength);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  return (
    <div className="border border-[#E8DFD6] rounded-xl overflow-hidden bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#F8F5F0] border-b border-[#E8DFD6]">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => insertSnippet('## ', '', lang === 'en' ? 'Heading' : 'Tiêu đề mục')}
            className="p-1.5 text-[#7F6D67] hover:text-[#55443F] hover:bg-[#EBCFD0]/40 rounded-lg transition-colors"
            title={lang === 'en' ? 'Heading' : 'Tiêu đề'}
            disabled={previewMode}
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('**', '**', lang === 'en' ? 'bold' : 'in đậm')}
            className="p-1.5 text-[#7F6D67] hover:text-[#55443F] hover:bg-[#EBCFD0]/40 rounded-lg transition-colors"
            title={lang === 'en' ? 'Bold' : 'In đậm'}
            disabled={previewMode}
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('*', '*', lang === 'en' ? 'italic' : 'in nghiêng')}
            className="p-1.5 text-[#7F6D67] hover:text-[#55443F] hover:bg-[#EBCFD0]/40 rounded-lg transition-colors"
            title={lang === 'en' ? 'Italic' : 'In nghiêng'}
            disabled={previewMode}
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('\n- ', '', lang === 'en' ? 'List item' : 'Mục danh sách')}
            className="p-1.5 text-[#7F6D67] hover:text-[#55443F] hover:bg-[#EBCFD0]/40 rounded-lg transition-colors"
            title={lang === 'en' ? 'Bullet list' : 'Danh sách'}
            disabled={previewMode}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('\n- [ ] ', '', lang === 'en' ? 'Checklist item' : 'Việc cần làm')}
            className="p-1.5 text-[#7F6D67] hover:text-[#55443F] hover:bg-[#EBCFD0]/40 rounded-lg transition-colors"
            title="Checklist"
            disabled={previewMode}
          >
            <CheckSquare className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('\n> ', '', lang === 'en' ? 'Quote' : 'Trích dẫn')}
            className="p-1.5 text-[#7F6D67] hover:text-[#55443F] hover:bg-[#EBCFD0]/40 rounded-lg transition-colors"
            title={lang === 'en' ? 'Quote' : 'Trích dẫn'}
            disabled={previewMode}
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('[', '](https://example.com)', lang === 'en' ? 'Link' : 'Liên kết')}
            className="p-1.5 text-[#7F6D67] hover:text-[#55443F] hover:bg-[#EBCFD0]/40 rounded-lg transition-colors"
            title={lang === 'en' ? 'Insert link' : 'Chèn liên kết'}
            disabled={previewMode}
          >
            <Link2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 p-0.5 bg-[#EDE4DC] rounded-lg">
          <button
            type="button"
            onClick={() => setPreviewMode(false)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              !previewMode ? 'bg-white text-[#55443F] shadow-xs' : 'text-[#7F6D67] hover:text-[#55443F]'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            {lang === 'en' ? 'Write' : 'Soạn thảo'}
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode(true)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              previewMode ? 'bg-white text-[#55443F] shadow-xs' : 'text-[#7F6D67] hover:text-[#55443F]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            {lang === 'en' ? 'Preview' : 'Xem trước'}
          </button>
        </div>
      </div>

      {previewMode ? (
        <div className="p-4 min-h-[200px] max-h-[380px] overflow-y-auto bg-white">
          {value.trim() ? (
            <RichTextRenderer content={value} />
          ) : (
            <p className="text-sm text-[#9A8983] italic">
              {lang === 'en' ? 'Nothing to preview yet.' : 'Chưa có nội dung để xem trước.'}
            </p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          rows={9}
          placeholder={placeholder || (lang === 'en' ? 'Write your note content...' : 'Nhập nội dung ghi chú...')}
          className="w-full p-3.5 text-sm text-[#55443F] bg-white focus:outline-none resize-y leading-relaxed"
        />
      )}
    </div>
  );
}
