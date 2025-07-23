import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface NotesSidebarProps {
  events: SerializedNote[];
  disabledIndexes: Set<number>;
  onToggleDisable: (index: number, disabled: boolean) => void;
  onSeek: (time: number) => void;
  onPreview: (index: number) => void;
}

export default function NotesSidebar({
  events,
  disabledIndexes,
  onToggleDisable,
  onSeek,
  onPreview,
}: NotesSidebarProps) {
  return (
    <div className="w-64 bg-white border-r border-gray-300 p-2">
      <ScrollArea className="h-full space-y-2">
        {/* ✅ 添加“开始节点” */}
        <div
          className="p-2 rounded border text-sm flex items-center justify-between gap-2 hover:bg-gray-50"
          onClick={() => onSeek(0)}
        >
          <span className="flex-1 truncate">00:00.00 开始</span>
        </div>

        {events.map((e, i) => {
          const mm = String(Math.floor(e.time / 60000)).padStart(2, '0');
          const ss = String(Math.floor((e.time % 60000) / 1000)).padStart(2, '0');
          const ms = String(Math.floor((e.time % 1000) / 10)).padStart(2, '0');
          const label = `${mm}:${ss}.${ms} ${e.pitch}`;

          const disabled = disabledIndexes.has(i);
          return (
            <div
              key={i}
              className={cn(
                'p-2 rounded border text-sm flex items-center justify-between gap-2',
                disabled ? 'bg-gray-200 text-gray-400 line-through' : 'hover:bg-gray-50'
              )}
              onClick={() => {
                onSeek(e.time);
                onPreview(i);
              }}
            >
              <span className="flex-1 truncate">{label}</span>

              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onToggleDisable(i, !disabled);
                  }}
                >
                  {disabled ? '启用' : '禁用'}
                </Button>
              </div>
            </div>
          );
        })}
      </ScrollArea>
    </div>
  );
}
