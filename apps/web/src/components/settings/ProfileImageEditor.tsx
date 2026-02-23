import { useState, useRef, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import imageCompression from "browser-image-compression";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";

interface ProfileImageEditorProps {
  currentImageUrl: string | null;
  displayName: string;
  onSave: (base64Url: string) => void;
}

async function getCroppedImg(imageSrc: string, crop: Area): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => {
    image.onload = resolve;
  });

  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.9);
  });
}

export function ProfileImageEditor({
  currentImageUrl,
  displayName,
  onSave,
}: ProfileImageEditorProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const compressed = await imageCompression(
        new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" }),
        { maxSizeMB: 0.1, fileType: "image/jpeg" },
      );
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(compressed);
      });
      onSave(base64);
      setImageSrc(null);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setImageSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (imageSrc) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-48 h-48 rounded-full overflow-hidden bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-48"
          aria-label="Zoom"
        />
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} data-testid="crop-save">
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="cursor-pointer bg-transparent border-none p-0 rounded-full hover:opacity-80 transition-opacity"
        data-testid="avatar-upload-button"
      >
        <Avatar
          src={currentImageUrl}
          fallback={displayName}
          size="lg"
          shape="circle"
          className="w-20 h-20 text-2xl"
        />
      </button>
      <span className="text-xs text-muted">Click to change photo</span>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="avatar-file-input"
      />
    </div>
  );
}
