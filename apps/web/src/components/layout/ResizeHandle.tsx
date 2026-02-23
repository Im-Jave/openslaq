interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  isDragging: boolean;
  testId?: string;
}

export function ResizeHandle({ onMouseDown, isDragging, testId }: ResizeHandleProps) {
  return (
    <div
      data-testid={testId}
      onMouseDown={onMouseDown}
      className={`w-1 shrink-0 cursor-col-resize relative transition-colors ${
        isDragging ? "bg-slack-blue" : "hover:bg-slack-blue/50"
      }`}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}
