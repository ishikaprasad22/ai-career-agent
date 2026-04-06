import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "10px",
          background: "linear-gradient(135deg, #ded1d8 0%, #8bcfd0 100%)",
          color: "#5f465b",
          fontSize: 18,
          fontWeight: 700,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
        }}
      >
        CT
      </div>
    ),
    {
      ...size,
    }
  );
}
