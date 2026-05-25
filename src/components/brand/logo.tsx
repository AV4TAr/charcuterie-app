import { BrandMark } from "./brand-mark";

type Props = {
  size?: number;
  withWord?: boolean;
  accentInWord?: boolean;
  color?: string;
  accentColor?: string;
};

export function Logo({
  size = 14,
  withWord = true,
  accentInWord = true,
  color = "currentColor",
  accentColor,
}: Props) {
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: size * 0.6 }}
    >
      <BrandMark size={size + 10} color={color} accentColor={accentColor} />
      {withWord && (
        <span
          className="serif"
          style={{
            fontSize: size + 4,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color,
          }}
        >
          Chorizo{" "}
          <em style={{ color: accentInWord ? accentColor ?? "var(--accent)" : "inherit" }}>
            Lab
          </em>
        </span>
      )}
    </span>
  );
}
