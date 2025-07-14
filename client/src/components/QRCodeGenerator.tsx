import { useEffect, useState } from "react";

interface QRCodeGeneratorProps {
  url: string;
  size?: number;
  className?: string;
}

export function QRCodeGenerator({ url, size = 200, className = "" }: QRCodeGeneratorProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    // Generate QR code using QR Server API (free service)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
    setQrCodeUrl(qrUrl);
  }, [url, size]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {qrCodeUrl && (
        <img
          src={qrCodeUrl}
          alt={`QR Code for ${url}`}
          className="border rounded-lg shadow-md"
          width={size}
          height={size}
        />
      )}
    </div>
  );
}