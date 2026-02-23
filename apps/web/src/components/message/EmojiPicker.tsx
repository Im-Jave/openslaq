import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useTheme } from "../../theme/ThemeProvider";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
}

const PICKER_HEIGHT = 435;
const PICKER_WIDTH = 352;
const EDGE_MARGIN = 8;

export function EmojiPicker({ onSelect, onClose, anchorRef }: EmojiPickerProps) {
  const { resolved } = useTheme();
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    let top = rect.bottom + 4;
    let left = rect.left;

    if (top + PICKER_HEIGHT > vh - EDGE_MARGIN) {
      top = rect.top - PICKER_HEIGHT - 4;
    }
    if (left + PICKER_WIDTH > vw - EDGE_MARGIN) {
      left = vw - PICKER_WIDTH - EDGE_MARGIN;
    }
    if (left < EDGE_MARGIN) {
      left = EDGE_MARGIN;
    }

    setPosition({ top, left });
  }, [anchorRef]);

  if (!position) return null;

  return createPortal(
    <>
      {/* Transparent backdrop to capture outside clicks */}
      <div
        className="fixed inset-0 z-[99]"
        onMouseDown={onClose}
      />
      <div
        data-testid="emoji-picker"
        className="fixed z-[100]"
        style={{ top: position.top, left: position.left }}
      >
        <Picker
          data={data}
          onEmojiSelect={(emoji: { native: string }) => onSelect(emoji.native)}
          theme={resolved}
          previewPosition="none"
          skinTonePosition="none"
        />
      </div>
    </>,
    document.body,
  );
}
