import { useRef } from "react";
import { Upload, HelpCircle, ImagePlus, User, Box } from "lucide-react";

type Props = {
  onUpload: (files: FileList | File[], kind?: "character" | "prop" | "background") => void;
  onOpenGuide: () => void;
  removeBg: boolean;
  onToggleRemoveBg: (v: boolean) => void;
  sceneName: string;
  onRename: (name: string) => void;
};

export function Header({ onUpload, onOpenGuide, removeBg, onToggleRemoveBg, sceneName, onRename }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const kindRef = useRef<"character" | "prop" | "background" | undefined>(undefined);
  const pick = (kind?: "character" | "prop" | "background") => {
    kindRef.current = kind;
    fileRef.current?.click();
  };

  return (
    <header className="flex items-center justify-between gap-4 px-5 h-14 bg-white border-b border-slate-200 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <a href="#studio" className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          PuppetDrop <span className="text-blue-600">Scene</span>
        </a>
        <input type="text" value={sceneName} onChange={(e) => onRename(e.target.value)}
          className="hidden sm:block text-sm font-medium text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none px-1 max-w-[180px] truncate" />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <label className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={removeBg} onChange={(e) => onToggleRemoveBg(e.target.checked)} className="rounded accent-blue-600" />
          Auto cutout
        </label>
        <div className="hidden sm:flex items-center gap-1">
          <button type="button" onClick={() => pick("character")}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer" title="Add rigged character">
            <User className="w-3.5 h-3.5" /> Character
          </button>
          <button type="button" onClick={() => pick("prop")}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer" title="Add prop / object">
            <Box className="w-3.5 h-3.5" /> Prop
          </button>
          <button type="button" onClick={() => pick("background")}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer" title="Add background">
            <ImagePlus className="w-3.5 h-3.5" /> Background
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/webp,image/jpeg" multiple className="sr-only"
          onChange={(e) => { const files = e.target.files; if (files?.length) { onUpload(files, kindRef.current); e.target.value = ""; } }} />
        <button type="button" onClick={() => pick()}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:scale-[0.99] transition-all cursor-pointer">
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Upload Images</span>
          <span className="sm:hidden">Upload</span>
        </button>
        <button type="button" onClick={onOpenGuide}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" title="Quick Guide">
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
