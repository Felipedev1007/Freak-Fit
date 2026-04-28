import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { X, Check } from "lucide-react";

async function getCroppedImg(imageSrc, croppedAreaPixels) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const size = Math.min(croppedAreaPixels.width, croppedAreaPixels.height);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    size,
    size
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
  });
}

export default function ImageCropModal({ imageSrc, onConfirm, onCancel, primaryColor = "#00D4AA" }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setConfirming(true);
    const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
    await onConfirm(blob);
    setConfirming(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-sm mx-4 rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)" }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Ajustar foto</p>
          <button onClick={onCancel} style={{ color: "var(--text-muted)" }}>
            <X size={18} />
          </button>
        </div>

        <div className="relative w-full" style={{ height: 320, background: "#000" }}>
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

        <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border-color)" }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="flex-1 accent-current"
              style={{ accentColor: primaryColor }}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
              style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
              Cancelar
            </button>
            <button onClick={handleConfirm} disabled={confirming}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: primaryColor, color: "#000" }}>
              <Check size={15} />
              {confirming ? "Salvando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}