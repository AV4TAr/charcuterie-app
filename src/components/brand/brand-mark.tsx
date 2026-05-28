type Props = {
  size?: number;
  mono?: boolean;
  color?: string;
  accentColor?: string;
};

export function BrandMark({ size = 28, mono = false, color = "currentColor", accentColor }: Props) {
  const accent = mono ? color : accentColor ?? "var(--accent)";
  const paper = "var(--paper)";
  const stroke = (1.2 / (size / 28)) * 0.9;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      style={{ display: "block", flexShrink: 0 }}
      aria-hidden="true"
    >
      <circle cx="14" cy="14" r="11" stroke={color} strokeWidth={stroke} fill="none" />
      <line x1="14" y1="0.5" x2="14" y2="3" stroke={color} strokeWidth={stroke} />
      <line x1="14" y1="25" x2="14" y2="27.5" stroke={color} strokeWidth={stroke} />
      <line x1="0.5" y1="14" x2="3" y2="14" stroke={color} strokeWidth={stroke} />
      <line x1="25" y1="14" x2="27.5" y2="14" stroke={color} strokeWidth={stroke} />
      <circle
        cx="14"
        cy="14"
        r="6.8"
        fill={mono ? "none" : accent}
        stroke={mono ? color : "none"}
        strokeWidth={mono ? 1 : 0}
      />
      {!mono && (
        <g fill={paper} opacity="0.85">
          <circle cx="11.4" cy="12.2" r="0.95" />
          <circle cx="16.1" cy="14.6" r="0.75" />
          <circle cx="13.2" cy="16.8" r="0.6" />
          <circle cx="15.5" cy="11.4" r="0.45" />
        </g>
      )}
    </svg>
  );
}
