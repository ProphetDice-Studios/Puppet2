import { X } from "lucide-react";

type Props = { isOpen: boolean; onClose: () => void };

export function QuickGuide({ isOpen, onClose }: Props) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-display text-lg font-bold text-slate-900">Quick Guide</h2>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4 text-sm text-slate-700 leading-relaxed">
          <section>
            <h3 className="font-semibold text-slate-900 mb-1">1. Add objects</h3>
            <p>Upload or drag-and-drop multiple PNGs. Use Character / Prop / Background buttons for the right kind. Characters get an auto-estimated skeleton.</p>
          </section>
          <section>
            <h3 className="font-semibold text-slate-900 mb-1">2. Arrange the scene</h3>
            <p>Click an object to select it. Drag to move, <kbd className="px-1 bg-slate-100 rounded text-xs">Alt</kbd>+drag to rotate, <kbd className="px-1 bg-slate-100 rounded text-xs">Shift</kbd>+drag to scale. Reorder layers in the left panel.</p>
          </section>
          <section>
            <h3 className="font-semibold text-slate-900 mb-1">3. Pose & keyframe</h3>
            <p>Scrub the timeline, adjust transforms (and bones for characters) in the inspector, then hit <strong>Keyframe</strong> to store the pose at the playhead.</p>
          </section>
          <section>
            <h3 className="font-semibold text-slate-900 mb-1">4. Play</h3>
            <p>Press <kbd className="px-1 bg-slate-100 rounded text-xs">Space</kbd> or the play button. Toggle loop as needed. Every object interpolates independently between its keyframes.</p>
          </section>
          <section>
            <h3 className="font-semibold text-slate-900 mb-1">Tips</h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Delete removes the selected object (or use the trash icon).</li>
              <li>Lock layers you don’t want to accidentally move.</li>
              <li>Backgrounds are forced toward the bottom of the stack.</li>
              <li>Auto cutout removes solid-color backgrounds on import.</li>
            </ul>
          </section>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
