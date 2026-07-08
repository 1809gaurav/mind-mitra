import React from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Quote, 
  Undo, 
  Redo 
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  darkMode?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  content, 
  onChange, 
  darkMode = false 
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
      }),
    ],
    content: content,
    onUpdate: ({ editor }: { editor: Editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `min-h-[150px] max-h-[300px] overflow-y-auto p-3 outline-none ProseMirror focus:ring-0 ${
          darkMode ? 'text-white' : 'text-gray-800'
        }`,
      },
    },
  });

  // Keep editor content in sync with props when edited externally
  React.useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleStrike = () => editor.chain().focus().toggleStrike().run();
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();
  const toggleH1 = () => editor.chain().focus().toggleHeading({ level: 1 }).run();
  const toggleH2 = () => editor.chain().focus().toggleHeading({ level: 2 }).run();
  const toggleBlockquote = () => editor.chain().focus().toggleBlockquote().run();
  const handleUndo = () => editor.chain().focus().undo().run();
  const handleRedo = () => editor.chain().focus().redo().run();

  const activeBtnClass = "p-1.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300";
  const inactiveBtnClass = `p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
    darkMode ? 'text-gray-300' : 'text-gray-600'
  }`;

  return (
    <div className={`border rounded-lg overflow-hidden ${
      darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'
    }`}>
      {/* Custom styles for ProseMirror inside this editor */}
      <style dangerouslySetInnerHTML={{ __html: `
        .ProseMirror ul {
          list-style-type: disc !important;
          padding-left: 1.5rem !important;
          margin-bottom: 0.5rem;
        }
        .ProseMirror ol {
          list-style-type: decimal !important;
          padding-left: 1.5rem !important;
          margin-bottom: 0.5rem;
        }
        .ProseMirror blockquote {
          border-left: 4px solid #cbd5e1 !important;
          padding-left: 1rem !important;
          font-style: italic !important;
          margin-bottom: 0.5rem;
        }
        .ProseMirror h1 {
          font-size: 1.5em !important;
          font-weight: bold !important;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror h2 {
          font-size: 1.25em !important;
          font-weight: bold !important;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror p {
          margin-bottom: 0.5rem;
        }
      `}} />

      {/* Toolbar */}
      <div className={`flex flex-wrap items-center gap-1 p-2 border-b ${
        darkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'
      }`}>
        <button 
          type="button"
          onClick={toggleBold}
          className={editor.isActive('bold') ? activeBtnClass : inactiveBtnClass}
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button 
          type="button"
          onClick={toggleItalic}
          className={editor.isActive('italic') ? activeBtnClass : inactiveBtnClass}
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <button 
          type="button"
          onClick={toggleStrike}
          className={editor.isActive('strike') ? activeBtnClass : inactiveBtnClass}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </button>

        <div className={`w-px h-5 mx-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />

        <button 
          type="button"
          onClick={toggleH1}
          className={editor.isActive('heading', { level: 1 }) ? activeBtnClass : inactiveBtnClass}
          title="Heading 1"
        >
          <Heading1 size={16} />
        </button>
        <button 
          type="button"
          onClick={toggleH2}
          className={editor.isActive('heading', { level: 2 }) ? activeBtnClass : inactiveBtnClass}
          title="Heading 2"
        >
          <Heading2 size={16} />
        </button>

        <div className={`w-px h-5 mx-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />

        <button 
          type="button"
          onClick={toggleBulletList}
          className={editor.isActive('bulletList') ? activeBtnClass : inactiveBtnClass}
          title="Bullet List"
        >
          <List size={16} />
        </button>
        <button 
          type="button"
          onClick={toggleOrderedList}
          className={editor.isActive('orderedList') ? activeBtnClass : inactiveBtnClass}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </button>
        <button 
          type="button"
          onClick={toggleBlockquote}
          className={editor.isActive('blockquote') ? activeBtnClass : inactiveBtnClass}
          title="Blockquote"
        >
          <Quote size={16} />
        </button>

        <div className={`w-px h-5 mx-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />

        <button 
          type="button"
          onClick={handleUndo}
          className={inactiveBtnClass}
          title="Undo"
          disabled={!editor.can().undo()}
        >
          <Undo size={16} />
        </button>
        <button 
          type="button"
          onClick={handleRedo}
          className={inactiveBtnClass}
          title="Redo"
          disabled={!editor.can().redo()}
        >
          <Redo size={16} />
        </button>
      </div>

      {/* Editor Content Area */}
      <EditorContent editor={editor} />
    </div>
  );
};
