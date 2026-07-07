import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Redo2,
  Search,
  Underline,
  Undo2,
} from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";
import { richTextEditorConfig } from "../../config/richTextEditor";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

const MAX_IMAGE_SIZE = richTextEditorConfig.maxImageSizeMb * 1024 * 1024;
const EMPTY_EDITOR_HTML = "<p><br></p>";

function textToHtml(value: string) {
  if (/<[a-z][\s\S]*>/i.test(value)) return value;
  const html = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join("");
  return html || EMPTY_EDITOR_HTML;
}

export default function RichTextEditor({ value, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const selectionRef = useRef<Range | null>(null);
  const emittedValueRef = useRef<string | null>(null);
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    const editor = editorRef.current;
    const html = textToHtml(value);

    if (!editor) return;
    if (
      emittedValueRef.current === value ||
      emittedValueRef.current === html ||
      editor.innerHTML === html
    ) {
      updateWordCount();
      return;
    }

    if (document.activeElement === editor) {
      return;
    }

    editor.innerHTML = html;
    emittedValueRef.current = html;
    updateWordCount();
  }, [value]);

  const updateWordCount = () => {
    const text = editorRef.current?.innerText || "";
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
  };

  const emit = () => {
    const html = editorRef.current?.innerHTML || "";
    emittedValueRef.current = html;
    onChange(html);
    updateWordCount();
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current?.contains(range.commonAncestorContainer)) {
      selectionRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (!selection || !selectionRef.current) return;
    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
  };

  const placeCaretAtEnd = () => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection) return;

    if (!editorRef.current.innerHTML.trim()) {
      editorRef.current.innerHTML = EMPTY_EDITOR_HTML;
    }

    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    selectionRef.current = range.cloneRange();
  };

  const focusEditor = (moveCaretToEnd = false) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    if (moveCaretToEnd) {
      window.requestAnimationFrame(placeCaretAtEnd);
      return;
    }

    window.requestAnimationFrame(saveSelection);
  };

  const exec = (command: string, option?: string) => {
    editorRef.current?.focus();
    if (!selectionRef.current) placeCaretAtEnd();
    restoreSelection();
    document.execCommand(command, false, option);
    saveSelection();
    emit();
  };

  const insertImage = (file: File) => {
    if (file.size > MAX_IMAGE_SIZE) {
      window.alert(
        `Attachment size should be less than ${richTextEditorConfig.maxImageSizeMb}MB`,
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || "");
      exec(
        "insertHTML",
        `<img src="${src}" alt="${richTextEditorConfig.insertedImageAlt}" style="max-width:160px;display:block;margin:4px 0 12px;" />`,
      );
    };
    reader.readAsDataURL(file);
  };

  const paste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const imageFile = Array.from(event.clipboardData.files || []).find((file) =>
      file.type.startsWith("image/"),
    );
    if (!imageFile) return;
    event.preventDefault();
    saveSelection();
    insertImage(imageFile);
  };

  return (
    <div className="w-full border border-slate-300 bg-white text-slate-600">
      <div className="flex h-11 items-center gap-6 border-b border-slate-200 px-4 text-base font-medium text-slate-600">
        {richTextEditorConfig.menuItems.map((item) => (
          <button
            key={item}
            type="button"
            tabIndex={-1}
            onMouseDown={(event) => event.preventDefault()}
            className="hover:text-navy-700 focus:outline-none"
          >
            {item} v
          </button>
        ))}
      </div>

      <div className="flex min-h-[52px] flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2">
        <Tool title="Undo" onClick={() => exec("undo")}>
          <Undo2 size={18} />
        </Tool>
        <Tool title="Redo" onClick={() => exec("redo")}>
          <Redo2 size={18} />
        </Tool>
        <Divider />
        <Tool title="Bold" onClick={() => exec("bold")}>
          <Bold size={18} />
        </Tool>
        <Tool title="Italic" onClick={() => exec("italic")}>
          <Italic size={18} />
        </Tool>
        <Tool title="Underline" onClick={() => exec("underline")}>
          <Underline size={18} />
        </Tool>
        <Divider />
        <Tool title="Align left" onClick={() => exec("justifyLeft")}>
          <AlignLeft size={18} />
        </Tool>
        <Tool title="Align center" active onClick={() => exec("justifyCenter")}>
          <AlignCenter size={18} />
        </Tool>
        <Tool title="Align right" onClick={() => exec("justifyRight")}>
          <AlignRight size={18} />
        </Tool>
        <Tool title="Bullets" onClick={() => exec("insertUnorderedList")}>
          <List size={18} />
        </Tool>
        <Tool title="Numbering" onClick={() => exec("insertOrderedList")}>
          <ListOrdered size={18} />
        </Tool>
        <Divider />
        <Tool
          title="Link"
          onClick={() => {
            const href = window.prompt("Enter link URL");
            if (href) exec("createLink", href);
          }}
        >
          <Link size={18} />
        </Tool>
        <Tool
          title="Insert image"
          active
          onClick={() => {
            saveSelection();
            fileRef.current?.click();
          }}
        >
          <Image size={18} />
        </Tool>
        <Tool title="Search">
          <Search size={18} />
        </Tool>
        <Divider />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(event) => event.preventDefault()}
          className="rounded px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus:outline-none"
        >
          A v
        </button>
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(event) => event.preventDefault()}
          className="rounded bg-slate-300 px-2 py-1 text-sm font-semibold text-slate-700 focus:outline-none"
        >
          A v
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) insertImage(file);
            event.currentTarget.value = "";
          }}
        />
      </div>

      <div className="flex items-center gap-8 border-b border-slate-200 px-4 py-2">
        <select
          className="w-40 bg-white text-base outline-none"
          onChange={(event) => exec("fontName", event.target.value)}
          defaultValue={richTextEditorConfig.defaultFont}
        >
          {richTextEditorConfig.fonts.map((font) => (
            <option key={font}>{font}</option>
          ))}
        </select>
        <select
          className="w-28 bg-white text-base outline-none"
          onChange={(event) => exec("fontSize", event.target.value)}
          defaultValue={richTextEditorConfig.defaultFontSize}
        >
          {richTextEditorConfig.fontSizes.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>
      </div>

      <div
        ref={editorRef}
        contentEditable
        tabIndex={0}
        onInput={emit}
        onBlur={emit}
        onKeyUp={saveSelection}
        onMouseDown={(event) => {
          if (event.target === editorRef.current) focusEditor(true);
        }}
        onClick={() => focusEditor()}
        onMouseUp={saveSelection}
        onFocus={() => focusEditor()}
        onPaste={paste}
        className="min-h-[190px] cursor-text px-4 py-4 text-sm leading-6 outline-none [&_img]:max-w-[160px]"
        suppressContentEditableWarning
      />

      <div className="flex items-center justify-between border-t border-slate-300 px-3 py-1 text-xs font-semibold text-slate-500">
        <span>{richTextEditorConfig.footerPrefix}</span>
        <span>
          {wordCount} WORDS {richTextEditorConfig.poweredByLabel}
        </span>
      </div>
    </div>
  );
}

function Tool({
  children,
  title,
  active,
  onClick,
}: {
  children: ReactNode;
  title: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded text-slate-600 transition hover:bg-slate-100 ${active ? "bg-slate-600 text-white hover:bg-slate-700" : ""}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="h-8 w-px bg-slate-200" />;
}
