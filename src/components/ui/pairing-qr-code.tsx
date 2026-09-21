import QRCode from "qrcode";
import { useMemo } from "react";
import Svg, { Path, Rect } from "react-native-svg";

function matrixPath(data: Uint8Array, width: number) {
  let path = "";

  for (let row = 0; row < width; row += 1) {
    for (let column = 0; column < width; column += 1) {
      if (!data[row * width + column]) continue;
      path += `M${column} ${row}h1v1h-1z`;
    }
  }

  return path;
}

export function PairingQrCode({
  value,
  size,
  quietZone = 4,
  color = "#000000",
  backgroundColor = "#FFFFFF",
}: {
  value: string;
  size: number;
  quietZone?: number;
  color?: string;
  backgroundColor?: string;
}) {
  const qr = useMemo(() => {
    const result = QRCode.create(value, { errorCorrectionLevel: "M" });
    return {
      path: matrixPath(result.modules.data, result.modules.size),
      width: result.modules.size,
    };
  }, [value]);

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`${-quietZone} ${-quietZone} ${qr.width + quietZone * 2} ${qr.width + quietZone * 2}`}
      accessibilityLabel="Pairing QR code"
      accessibilityRole="image"
    >
      <Rect
        x={-quietZone}
        y={-quietZone}
        width={qr.width + quietZone * 2}
        height={qr.width + quietZone * 2}
        fill={backgroundColor}
      />
      <Path d={qr.path} fill={color} />
    </Svg>
  );
}
