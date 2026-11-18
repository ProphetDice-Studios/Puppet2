import { useRef } from "react";
import { Eye, EyeOff, Lock, Unlock, Trash2, ChevronUp, ChevronDown, User, Box, Image as ImageIcon, Plus } from "lucide-react";
import type { SceneObject } from "../types";

type Props = {
  objects: SceneObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<SceneObject>) => void;
  onReorder: (id: string, direction: "up" | "down") => void;
  onUpload: (files: FileList) => void;
};

const kindIcon = { character: User, prop: Box, background: ImageIcon };

export function LayerPanel({ objects, selectedId, onSelect, onRemove, onUpdate, onReorder, onUpload }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const sorted = [...objects].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white flex flex-col max-h-[40vh] lg:max-h-none">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Layers</h2>
        <button type="button" onClick={() => fileRef.current?.click()}
          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer" title="Add images">
          <Plus className="w-4 h-4" />
        </button>
        <input ref={fileRef} type="file" accept="image/png,image/webp,image/jpeg" multiple className="sr-only"
          onChange={(e) => { if (e.target.files?.length) { onUpload(e.target.files); e.target.value = ""; } }} />
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {sorted.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-slate-400 leading-relaxed">
            Drop PNGs onto the stage or use Upload to add characters, props, and backgrounds.
          </div>
        )}
        {sorted.map((obj) => {
          const Icon = kindIcon[obj.kind];
          const active = obj.id === selectedId;
          return (
            <div key={obj.id} role="button" tabIndex={0}
              onClick={() => onSelect(obj.id)}
              onKeyDown={(e) => e.key === "Enter" && onSelect(obj.id)}
              className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                active ? "bg-blue-50 text-blue-900 border border-blue-200" : "hover:bg-slate-50 border border-transparent"
              }`}>
              <Icon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span className="flex-1 truncate font-medium">{obj.name}</span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" title="Move up" onClick={(e) => { e.stopPropagation(); onReorder(obj.id, "up"); }}
                  className="p-0.5 hover:bg-slate-200 rounded cursor-pointer"><ChevronUp className="w-3 h-3" /></button>
                <button type="button" title="Move down" onClick={(e) => { e.stopPropagation(); onReorder(obj.id, "down"); }}
                  className="p-0.5 hover:bg-slate-200 rounded cursor-pointer"><ChevronDown className="w-3 h-3" /></button>
                <button type="button" title={obj.visible ? "Hide" : "Show"}
                  onClick={(e) => { e.stopPropagation(); onUpdate(obj.id, { visible: !obj.visible }); }}
                  className="p-0.5 hover:bg-slate-200 rounded cursor-pointer">
                  {obj.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
                </button>
                <button type="button" title={obj.locked ? "Unlock" : "Lock"}
                  onClick={(e) => { e.stopPropagation(); onUpdate(obj.id, { locked: !obj.locked }); }}
                  className="p-0.5 hover:bg-slate-200 rounded cursor-pointer">
                  {obj.locked ? <Lock className="w-3 h-3 text-amber-600" /> : <Unlock className="w-3 h-3" />}
                </button>
                <button type="button" title="Delete" onClick={(e) => { e.stopPropagation(); onRemove(obj.id); }}
                  className="p-0.5 hover:bg-red-100 text-red-600 rounded cursor-pointer"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
