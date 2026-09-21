declare module "qrcode" {
  type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

  type QrCode = {
    modules: {
      data: Uint8Array;
      size: number;
    };
  };

  const QRCode: {
    create(
      value: string,
      options?: { errorCorrectionLevel?: ErrorCorrectionLevel },
    ): QrCode;
  };

  export default QRCode;
}
