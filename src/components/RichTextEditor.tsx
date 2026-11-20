import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Markdown } from '@tiptap/markdown';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Check,
  ChevronDown,
  Code,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Type,
  Undo2,
  Unlink,
} from 'lucide-react';
import './MarkdownContent.css';
import './RichTextEditor.css';

type Variant = 'field' | 'document';

interface RichTextEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  variant?: Variant;
  accentColor?: string;
  footerRight?: ReactNode;
}

const keepSelection = (event: MouseEvent) => event.preventDefault();

function normalizeHref(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  return /^(https?:|mailto:)/i.test(value) ? value : `https://${value}`;
}

interface FormatState {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  code: boolean;
  link: boolean;
  heading1: boolean;
  heading2: boolean;
  heading3: boolean;
  heading4: boolean;
  codeBlock: boolean;
  blockquote: boolean;
  bulletList: boolean;
  orderedList: boolean;
  taskList: boolean;
  hasSelection: boolean;
  canUndo: boolean;
  canRedo: boolean;
  words: number;
  characters: number;
}

const EMPTY_FORMAT_STATE: FormatState = {
  bold: false,
  italic: false,
  strike: false,
  code: false,
  link: false,
  heading1: false,
  heading2: false,
  heading3: false,
  heading4: false,
  codeBlock: false,
  blockquote: false,
  bulletList: false,
  orderedList: false,
  taskList: false,
  hasSelection: false,
  canUndo: false,
  canRedo: false,
  words: 0,
  characters: 0,
};

function useFormatState(editor: Editor | null): FormatState | null {
  return useEditorState({
    editor,
    selector: ({ editor: current }): FormatState | null => {
      if (!current) return null;
      if (current.isDestroyed) return EMPTY_FORMAT_STATE;
      try {
        const text = current.getText();
        return {
          bold: current.isActive('bold'),
          italic: current.isActive('italic'),
          strike: current.isActive('strike'),
          code: current.isActive('code'),
          link: current.isActive('link'),
          heading1: current.isActive('heading', { level: 1 }),
          heading2: current.isActive('heading', { level: 2 }),
          heading3: current.isActive('heading', { level: 3 }),
          heading4: current.isActive('heading', { level: 4 }),
          codeBlock: current.isActive('codeBlock'),
          blockquote: current.isActive('blockquote'),
          bulletList: current.isActive('bulletList'),
          orderedList: current.isActive('orderedList'),
          taskList: current.isActive('taskList'),
          hasSelection: !current.state.selection.empty,
          canUndo: current.can().undo(),
          canRedo: current.can().redo(),
          words: text.trim() ? text.trim().split(/\s+/).length : 0,
          characters: text.length,
        };
      } catch {
        return EMPTY_FORMAT_STATE;
      }
    },
  });
}

function getBlockLabel(state: FormatState): string {
  if (state.heading1) return 'Cabeçalho 1';
  if (state.heading2) return 'Cabeçalho 2';
  if (state.heading3) return 'Cabeçalho 3';
  if (state.heading4) return 'Cabeçalho 4';
  if (state.codeBlock) return 'Bloco de código';
  if (state.blockquote) return 'Citação';
  return 'Texto';
}

interface MenuItemProps {
  icon: ReactNode;
  label: string;
  hint?: string;
  active?: boolean;
  onSelect: () => void;
}

function MenuItem({ icon, label, hint, active, onSelect }: MenuItemProps) {
  return (
    <button type="button" className="rte-item" onMouseDown={keepSelection} onClick={onSelect}>
      <span className="rte-item-icon">{icon}</span>
      <span className="rte-item-label">{label}</span>
      {hint && <span className="rte-item-hint">{hint}</span>}
      {active && <Check size={14} className="rte-item-check" />}
    </button>
  );
}

interface PanelProps {
  editor: Editor;
  state: FormatState;
  onDone: () => void;
}

function BlockPanel({ editor, state, onDone }: PanelProps) {
  const run = (command: () => void) => {
    command();
    onDone();
  };

  return (
    <div className="rte-panel">
      <p className="rte-panel-title">Transformar em</p>
      <MenuItem
        icon={<Type size={16} />}
        label="Texto"
        active={getBlockLabel(state) === 'Texto'}
        onSelect={() => run(() => editor.chain().focus().clearNodes().run())}
      />
      <MenuItem
        icon={<Heading1 size={16} />}
        label="Cabeçalho 1"
        hint="Ctrl Alt 1"
        active={state.heading1}
        onSelect={() => run(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
      />
      <MenuItem
        icon={<Heading2 size={16} />}
        label="Cabeçalho 2"
        hint="Ctrl Alt 2"
        active={state.heading2}
        onSelect={() => run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
      />
      <MenuItem
        icon={<Heading3 size={16} />}
        label="Cabeçalho 3"
        hint="Ctrl Alt 3"
        active={state.heading3}
        onSelect={() => run(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
      />
      <MenuItem
        icon={<Heading4 size={16} />}
        label="Cabeçalho 4"
        hint="Ctrl Alt 4"
        active={state.heading4}
        onSelect={() => run(() => editor.chain().focus().toggleHeading({ level: 4 }).run())}
      />
      <div className="rte-panel-sep" />
      <MenuItem
        icon={<SquareCode size={16} />}
        label="Bloco de código"
        active={state.codeBlock}
        onSelect={() => run(() => editor.chain().focus().toggleCodeBlock().run())}
      />
      <MenuItem
        icon={<Quote size={16} />}
        label="Citação"
        active={state.blockquote}
        onSelect={() => run(() => editor.chain().focus().toggleBlockquote().run())}
      />
    </div>
  );
}

function ListPanel({ editor, state, onDone }: PanelProps) {
  const run = (command: () => void) => {
    command();
    onDone();
  };

  return (
    <div className="rte-panel">
      <MenuItem
        icon={<List size={16} />}
        label="Lista com marcadores"
        hint="Ctrl Shift 8"
        active={state.bulletList}
        onSelect={() => run(() => editor.chain().focus().toggleBulletList().run())}
      />
      <MenuItem
        icon={<ListOrdered size={16} />}
        label="Lista numerada"
        hint="Ctrl Shift 7"
        active={state.orderedList}
        onSelect={() => run(() => editor.chain().focus().toggleOrderedList().run())}
      />
      <MenuItem
        icon={<ListChecks size={16} />}
        label="Checklist"
        hint="Ctrl Shift 9"
        active={state.taskList}
        onSelect={() => run(() => editor.chain().focus().toggleTaskList().run())}
      />
    </div>
  );
}

interface ToolButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function ToolButton({ label, active, disabled, onClick, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      className={active ? 'rte-btn rte-btn--active' : 'rte-btn'}
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={keepSelection}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function BubbleToolbar({ editor, state }: { editor: Editor; state: FormatState }) {
  const [openMenu, setOpenMenu] = useState<'block' | 'list' | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkValue, setLinkValue] = useState('');

  useEffect(() => {
    const reset = () => {
      setOpenMenu(null);
      setLinkMode(false);
    };
    editor.on('selectionUpdate', reset);
    return () => {
      editor.off('selectionUpdate', reset);
    };
  }, [editor]);

  function startLink() {
    if (state.link) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    setLinkValue('');
    setLinkMode(true);
  }

  function applyLink() {
    const href = normalizeHref(linkValue);
    if (href) {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    setLinkMode(false);
  }

  const close = () => setOpenMenu(null);

  return (
    <BubbleMenu editor={editor} options={{ placement: 'top', offset: 8 }}>
      <div className="rte-bar">
        {linkMode ? (
          <form
            className="rte-link-form"
            onSubmit={(event) => {
              event.preventDefault();
              applyLink();
            }}
          >
            <LinkIcon size={15} />
            <input
              autoFocus
              value={linkValue}
              onChange={(event) => setLinkValue(event.target.value)}
              placeholder="Cole o endereço e tecle Enter"
            />
            <button type="submit" className="rte-btn" aria-label="Aplicar link">
              <Check size={15} />
            </button>
          </form>
        ) : (
          <>
            <div className="rte-dd">
              <button
                type="button"
                className="rte-dd-btn"
                onMouseDown={keepSelection}
                onClick={() => setOpenMenu(openMenu === 'block' ? null : 'block')}
              >
                {getBlockLabel(state)} <ChevronDown size={13} />
              </button>
              {openMenu === 'block' && <BlockPanel editor={editor} state={state} onDone={close} />}
            </div>

            <div className="rte-dd">
              <button
                type="button"
                className="rte-dd-btn"
                aria-label="Listas"
                onMouseDown={keepSelection}
                onClick={() => setOpenMenu(openMenu === 'list' ? null : 'list')}
              >
                <List size={16} /> <ChevronDown size={13} />
              </button>
              {openMenu === 'list' && <ListPanel editor={editor} state={state} onDone={close} />}
            </div>

            <ToolButton label="Checklist" active={state.taskList} onClick={() => editor.chain().focus().toggleTaskList().run()}>
              <ListChecks size={15} />
            </ToolButton>
            <span className="rte-sep" />
            <ToolButton label="Negrito" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold size={15} />
            </ToolButton>
            <ToolButton label="Itálico" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic size={15} />
            </ToolButton>
            <ToolButton label="Tachado" active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
              <Strikethrough size={15} />
            </ToolButton>
            <ToolButton label="Código" active={state.code} onClick={() => editor.chain().focus().toggleCode().run()}>
              <Code size={15} />
            </ToolButton>
            <span className="rte-sep" />
            <ToolButton label={state.link ? 'Remover link' : 'Adicionar link'} active={state.link} onClick={startLink}>
              {state.link ? <Unlink size={15} /> : <LinkIcon size={15} />}
            </ToolButton>
          </>
        )}
      </div>
    </BubbleMenu>
  );
}

function DocumentToolbar({ editor, state }: { editor: Editor; state: FormatState }) {
  const [openMenu, setOpenMenu] = useState<'block' | 'list' | 'link' | null>(null);
  const [linkValue, setLinkValue] = useState('');
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    function handleOutside(event: globalThis.MouseEvent) {
      if (barRef.current && !barRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [openMenu]);

  const close = () => setOpenMenu(null);

  function toggleLink() {
    if (state.link) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    setLinkValue('');
    setOpenMenu(openMenu === 'link' ? null : 'link');
  }

  function applyLink() {
    const href = normalizeHref(linkValue);
    if (href) {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    close();
  }

  return (
    <div className="rte-docbar" ref={barRef} role="toolbar" aria-label="Formatação">
      <ToolButton label="Desfazer (Ctrl+Z)" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 size={16} />
      </ToolButton>
      <ToolButton label="Refazer (Ctrl+Y)" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 size={16} />
      </ToolButton>
      <span className="rte-sep" />

      <div className="rte-dd">
        <button
          type="button"
          className="rte-dd-btn"
          onMouseDown={keepSelection}
          onClick={() => setOpenMenu(openMenu === 'block' ? null : 'block')}
        >
          {getBlockLabel(state)} <ChevronDown size={13} />
        </button>
        {openMenu === 'block' && <BlockPanel editor={editor} state={state} onDone={close} />}
      </div>
      <span className="rte-sep" />

      <ToolButton label="Negrito (Ctrl+B)" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={16} />
      </ToolButton>
      <ToolButton label="Itálico (Ctrl+I)" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={16} />
      </ToolButton>
      <ToolButton label="Tachado" active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough size={16} />
      </ToolButton>
      <ToolButton label="Código" active={state.code} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code size={16} />
      </ToolButton>

      <div className="rte-dd">
        <ToolButton
          label={state.link ? 'Remover link' : 'Adicionar link (selecione um texto)'}
          active={state.link}
          disabled={!state.link && !state.hasSelection}
          onClick={toggleLink}
        >
          {state.link ? <Unlink size={16} /> : <LinkIcon size={16} />}
        </ToolButton>
        {openMenu === 'link' && (
          <form
            className="rte-panel rte-doc-link"
            onSubmit={(event) => {
              event.preventDefault();
              applyLink();
            }}
          >
            <input
              autoFocus
              value={linkValue}
              onChange={(event) => setLinkValue(event.target.value)}
              placeholder="Cole o endereço e tecle Enter"
            />
            <button type="submit" className="rte-btn" aria-label="Aplicar link">
              <Check size={15} />
            </button>
          </form>
        )}
      </div>
      <span className="rte-sep" />

      <div className="rte-dd">
        <button
          type="button"
          className="rte-dd-btn"
          aria-label="Listas"
          title="Listas"
          onMouseDown={keepSelection}
          onClick={() => setOpenMenu(openMenu === 'list' ? null : 'list')}
        >
          <List size={16} /> <ChevronDown size={13} />
        </button>
        {openMenu === 'list' && <ListPanel editor={editor} state={state} onDone={close} />}
      </div>
      <ToolButton label="Checklist" active={state.taskList} onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <ListChecks size={16} />
      </ToolButton>
      <span className="rte-sep" />

      <ToolButton label="Citação" active={state.blockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote size={16} />
      </ToolButton>
      <ToolButton label="Bloco de código" active={state.codeBlock} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <SquareCode size={16} />
      </ToolButton>
      <ToolButton
        label="Limpar formatação"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      >
        <Eraser size={16} />
      </ToolButton>
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  variant = 'field',
  accentColor,
  footerRight,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false, link: { openOnClick: false } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({ markedOptions: { breaks: true } }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: value,
    contentType: 'markdown',
    onCreate: ({ editor: current }) => current.view.dispatch(current.state.tr),
    onUpdate: ({ editor: current }) => onChange(current.getMarkdown()),
    editorProps: { attributes: { class: 'md rte-content' } },
  });

  const state = useFormatState(editor);

  if (!editor || !state) return null;

  if (variant === 'document') {
    return (
      <div className="rte-doc">
        <DocumentToolbar editor={editor} state={state} />
        <div className="rte-doc-canvas">
          <div className="rte-doc-paper" style={{ '--doc-color': accentColor } as CSSProperties}>
            <BubbleToolbar editor={editor} state={state} />
            <EditorContent editor={editor} />
          </div>
        </div>
        <div className="rte-doc-footer">
          <span>
            {state.words} {state.words === 1 ? 'palavra' : 'palavras'} · {state.characters} caracteres
          </span>
          <span>{footerRight}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rte">
      <BubbleToolbar editor={editor} state={state} />
      <EditorContent editor={editor} />
    </div>
  );
}
