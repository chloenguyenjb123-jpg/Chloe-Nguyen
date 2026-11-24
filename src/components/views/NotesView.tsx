import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  Check,
  ExternalLink,
  Folder,
  Link2,
  Loader2,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { NOTE_CATEGORY_KEYS, type Note, type NoteAttachment, type Task } from '../../types';
import {
  createNote,
  deleteNote,
  isValidSafeUrl,
  toggleNoteArchive,
  toggleNotePin,
  updateNote,
} from '../../services/firestoreService';
import { RichTextEditor } from '../RichTextEditor';
import { useI18n } from '../../i18n/LanguageContext';

interface NotesViewProps {
  uid: string;
  notes: Note[];
  tasks: Task[];
  onNotify: (msg: string) => void;
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved';

export function NotesView({ uid, notes, tasks, onNotify }: NotesViewProps) {
  const { lang, t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Editor state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>(NOTE_CATEGORY_KEYS[0]);
  const [folder, setFolder] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState('');
  const [pinned, setPinned] = useState(false);
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [newAttName, setNewAttName] = useState('');
  const [newAttUrl, setNewAttUrl] = useState('');
  const [attError, setAttError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const skipNextAutosaveRef = useRef(true);

  const folders = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) {
      if (n.folder && n.folder.trim()) set.add(n.folder.trim());
    }
    return Array.from(set).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return notes.filter((n) => {
      if (Boolean(n.archived) !== showArchived) return false;
      if (selectedFolder !== 'all' && (n.folder || '') !== selectedFolder) return false;
      if (q) {
        const hay = `${n.title} ${n.content} ${(n.tags || []).join(' ')} ${n.folder || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [notes, showArchived, selectedFolder, searchTerm]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? null,
    [notes, selectedNoteId]
  );

  const loadNoteIntoEditor = (note: Note) => {
    skipNextAutosaveRef.current = true;
    setSelectedNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category || NOTE_CATEGORY_KEYS[0]);
    setFolder(note.folder || '');
    setTagsInput((note.tags || []).join(', '));
    setLinkedTaskId(note.linkedTaskId || '');
    setPinned(Boolean(note.pinned));
    setAttachments(note.attachments || []);
    setSaveState('saved');
  };

  const handleCreateNewNote = async () => {
    const defaultTitle = lang === 'en' ? 'Untitled Note' : 'Ghi chú mới';
    const newId = await createNote(uid, {
      title: defaultTitle,
      content: '',
      category: NOTE_CATEGORY_KEYS[0],
      folder: selectedFolder !== 'all' ? selectedFolder : '',
      tags: [],
      pinned: false,
      archived: false,
      linkedTaskId: '',
      attachments: [],
    });
    skipNextAutosaveRef.current = true;
    setSelectedNoteId(newId);
    setTitle(defaultTitle);
    setContent('');
    setCategory(NOTE_CATEGORY_KEYS[0]);
    setFolder(selectedFolder !== 'all' ? selectedFolder : '');
    setTagsInput('');
    setLinkedTaskId('');
    setPinned(false);
    setAttachments([]);
    setShowArchived(false);
    setSaveState('saved');
  };

  // Debounced autosave when editing an existing note
  useEffect(() => {
    if (!selectedNoteId) return;
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }
    if (!title.trim()) return;

    setSaveState('dirty');
    const timer = setTimeout(async () => {
      setSaveState('saving');
      try {
        await updateNote(uid, selectedNoteId, {
          title,
          content,
          category,
          folder,
          tags: tagsInput
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean),
          pinned,
          archived: selectedNote?.archived ?? false,
          linkedTaskId,
          attachments,
        });
        setSaveState('saved');
      } catch {
        setSaveState('dirty');
      }
    }, 850);

    return () => clearTimeout(timer);
  }, [
    uid,
    selectedNoteId,
    title,
    content,
    category,
    folder,
    tagsInput,
    pinned,
    linkedTaskId,
    attachments,
    selectedNote?.archived,
  ]);

  const handleAddAttachment = () => {
    setAttError(null);
    if (!isValidSafeUrl(newAttUrl)) {
      setAttError(t.notes.invalidUrl);
      return;
    }
    setAttachments((prev) => [
      ...prev,
      { name: newAttName.trim() || newAttUrl.trim(), url: newAttUrl.trim() },
    ]);
    setNewAttName('');
    setNewAttUrl('');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#55443F]">{t.notes.title}</h2>
          <p className="text-xs text-[#7F6D67] mt-1">{t.notes.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void handleCreateNewNote()}
          className="dh-btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          {t.notes.newNote}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List */}
        <div className="lg:col-span-4 dh-card p-4 space-y-3 h-fit">
          <div className="relative">
            <Search className="w-4 h-4 text-[#9A8983] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.notes.searchPlaceholder}
              className="dh-input w-full pl-9 pr-3 py-2 text-xs"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex p-0.5 bg-[#F3EDE6] rounded-lg">
              <button
                type="button"
                onClick={() => setShowArchived(false)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                  !showArchived ? 'bg-white text-[#55443F] shadow-xs' : 'text-[#7F6D67]'
                }`}
              >
                {t.notes.activeTab}
              </button>
              <button
                type="button"
                onClick={() => setShowArchived(true)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                  showArchived ? 'bg-white text-[#55443F] shadow-xs' : 'text-[#7F6D67]'
                }`}
              >
                {t.notes.archivedTab}
              </button>
            </div>

            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="dh-input px-2.5 py-1 text-xs max-w-[140px]"
            >
              <option value="all">{t.notes.allFolders}</option>
              {folders.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
            {filteredNotes.length === 0 ? (
              <p className="text-xs text-[#9A8983] py-6 text-center">{t.notes.emptyState}</p>
            ) : (
              filteredNotes.map((n) => {
                const active = n.id === selectedNoteId;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => loadNoteIntoEditor(n)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      active
                        ? 'bg-[#F7ECEC] border-[#EBCFD0]'
                        : 'bg-[#FCF9F6] border-[#EFE7DF] hover:bg-[#F3EDE6]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[#55443F] truncate">{n.title}</p>
                      {n.pinned && <Pin className="w-3 h-3 text-[#A77C78] shrink-0" />}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-[#7F6D67]">
                      <span>{t.noteCategories[n.category] || n.category}</span>
                      {n.folder && (
                        <span className="inline-flex items-center gap-0.5 text-[#A77C78]">
                          · <Folder className="w-2.5 h-2.5" /> {n.folder}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Editor */}
        <div className="lg:col-span-8 dh-card p-5">
          {!selectedNote ? (
            <div className="py-20 text-center text-xs text-[#9A8983]">{t.notes.selectPrompt}</div>
          ) : (
            <div className="space-y-4">
              {/* Top Actions & Autosave Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EFE7DF]">
                <div className="flex items-center gap-2 text-xs">
                  {saveState === 'saving' && (
                    <span className="inline-flex items-center gap-1 text-[#A77C78]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {t.notes.autosaving}
                    </span>
                  )}
                  {saveState === 'saved' && (
                    <span className="inline-flex items-center gap-1 text-[#5B6B52]">
                      <Check className="w-3.5 h-3.5" />
                      {t.notes.autosaved}
                    </span>
                  )}
                  {saveState === 'dirty' && (
                    <span className="text-[#7F6D67]">{t.notes.unsavedChanges}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !pinned;
                      setPinned(next);
                      void toggleNotePin(uid, selectedNote.id, next);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#E8DFD6] text-[#55443F] hover:bg-[#F7ECEC]"
                  >
                    {pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    {pinned ? t.notes.unpinNote : t.notes.pinNote}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextArch = !selectedNote.archived;
                      void toggleNoteArchive(uid, selectedNote.id, nextArch);
                      setSelectedNoteId(null);
                      onNotify(nextArch ? t.notes.archiveNote : t.notes.restoreNote);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#E8DFD6] text-[#55443F] hover:bg-[#F3EDE6]"
                  >
                    {selectedNote.archived ? (
                      <ArchiveRestore className="w-3.5 h-3.5" />
                    ) : (
                      <Archive className="w-3.5 h-3.5" />
                    )}
                    {selectedNote.archived ? t.notes.restoreNote : t.notes.archiveNote}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void deleteNote(uid, selectedNote.id);
                      setSelectedNoteId(null);
                    }}
                    className="p-1.5 text-[#7F6D67] hover:text-[#A77C78] rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.notes.titlePlaceholder}
                className="w-full font-display text-xl font-semibold text-[#55443F] bg-transparent focus:outline-none"
              />

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#7F6D67] mb-1">
                    {t.notes.categoryLabel}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="dh-input w-full px-2.5 py-1.5 text-xs"
                  >
                    {NOTE_CATEGORY_KEYS.map((c) => (
                      <option key={c} value={c}>{t.noteCategories[c]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#7F6D67] mb-1">
                    {t.notes.folderLabel}
                  </label>
                  <input
                    type="text"
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    placeholder={t.notes.folderPlaceholder}
                    className="dh-input w-full px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#7F6D67] mb-1">
                    {t.notes.tagsLabel}
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder={t.notes.tagsPlaceholder}
                    className="dh-input w-full px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#7F6D67] mb-1">
                    {t.notes.linkedTaskLabel}
                  </label>
                  <select
                    value={linkedTaskId}
                    onChange={(e) => setLinkedTaskId(e.target.value)}
                    className="dh-input w-full px-2.5 py-1.5 text-xs"
                  >
                    <option value="">{t.common.none}</option>
                    {tasks.slice(0, 40).map((tk) => (
                      <option key={tk.id} value={tk.id}>{tk.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <RichTextEditor value={content} onChange={setContent} />

              {/* Attachments / Reference Links */}
              <div className="p-3.5 rounded-xl bg-[#FCF9F6] border border-[#EFE7DF] space-y-2.5">
                <p className="text-xs font-semibold text-[#55443F] flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-[#A77C78]" />
                  {t.notes.attachmentsLabel}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={newAttName}
                    onChange={(e) => setNewAttName(e.target.value)}
                    placeholder={t.notes.attachmentNamePlaceholder}
                    className="dh-input sm:col-span-4 px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="url"
                    value={newAttUrl}
                    onChange={(e) => setNewAttUrl(e.target.value)}
                    placeholder={t.notes.attachmentUrlPlaceholder}
                    className="dh-input sm:col-span-6 px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="sm:col-span-2 px-3 py-1.5 text-xs font-semibold bg-[#EBCFD0]/70 text-[#55443F] rounded-xl"
                  >
                    {t.notes.addAttachment}
                  </button>
                </div>
                {attError && <p className="text-[11px] text-[#A77C78]">{attError}</p>}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E8DFD6] text-xs"
                      >
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#55443F] hover:text-[#A77C78] inline-flex items-center gap-1"
                        >
                          {att.name}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-[#9A8983] hover:text-[#A77C78]"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
