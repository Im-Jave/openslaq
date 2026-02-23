import { useEffect, useState, useCallback, type RefObject } from "react";

interface UseFileDragOverlayOptions {
  dropRef: RefObject<HTMLElement | null>;
  onDrop: (files: FileList) => void;
}

export function useFileDragOverlay({ dropRef, onDrop }: UseFileDragOverlayOptions) {
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingFiles(false);
      if (!e.dataTransfer?.files.length) return;
      // Only accept drops within the dropRef area
      if (dropRef.current && dropRef.current.contains(e.target as Node)) {
        onDrop(e.dataTransfer.files);
      }
    },
    [dropRef, onDrop],
  );

  useEffect(() => {
    let counter = 0;

    function handleDragEnter(e: DragEvent) {
      e.preventDefault();
      if (!e.dataTransfer?.types.includes("Files")) return;
      counter++;
      if (counter === 1) setIsDraggingFiles(true);
    }

    function handleDragLeave(e: DragEvent) {
      e.preventDefault();
      if (!e.dataTransfer?.types.includes("Files")) return;
      counter--;
      if (counter === 0) setIsDraggingFiles(false);
    }

    function handleDragOver(e: DragEvent) {
      e.preventDefault();
    }

    function onDrop(e: DragEvent) {
      counter = 0;
      handleDrop(e);
    }

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", onDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [handleDrop]);

  return { isDraggingFiles };
}
