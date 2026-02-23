import { useState, useEffect, useRef } from "react";

interface DeviceSelectorProps {
  onSelectDevice: (deviceId: string) => void;
}

export function DeviceSelector({ onSelectDevice }: DeviceSelectorProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((allDevices) => {
      setDevices(allDevices.filter((d) => d.kind === "audioinput"));
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (devices.length <= 1) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="p-1.5 rounded hover:bg-gray-700 text-gray-300 hover:text-white bg-transparent border-none cursor-pointer"
        title="Select audio device"
        data-testid="device-selector-toggle"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-56 bg-gray-700 rounded-lg shadow-lg py-1 z-50">
          {devices.map((device) => (
            <button
              key={device.deviceId}
              type="button"
              onClick={() => {
                onSelectDevice(device.deviceId);
                setOpen(false);
              }}
              className="w-full px-3 py-1.5 text-left text-xs text-gray-200 hover:bg-gray-600 bg-transparent border-none cursor-pointer truncate"
            >
              {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
