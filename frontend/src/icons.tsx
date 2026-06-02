type IconProps = { size?: number; className?: string };

const iconProps = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
  "aria-hidden": true,
});

export function UploadIcon({ size = 20, className }: IconProps) {
  return <svg {...iconProps(size, className)}><path d="M12 16V3" /><path d="m7 8 5-5 5 5" /><path d="M5 12v7h14v-7" /></svg>;
}

export function FileIcon({ size = 22, className }: IconProps) {
  return <svg {...iconProps(size, className)}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>;
}

export function SendIcon({ size = 19, className }: IconProps) {
  return <svg {...iconProps(size, className)}><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>;
}

export function BookIcon({ size = 17, className }: IconProps) {
  return <svg {...iconProps(size, className)}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M4 4v15.5" /><path d="M20 22V4H6.5A2.5 2.5 0 0 0 4 6.5" /></svg>;
}

export function SparkleIcon({ size = 20, className }: IconProps) {
  return <svg {...iconProps(size, className)}><path d="m12 3-1.7 5.3L5 10l5.3 1.7L12 17l1.7-5.3L19 10l-5.3-1.7Z" /><path d="m19 17-.7 2.3L16 20l2.3.7L19 23l.7-2.3L22 20l-2.3-.7Z" /></svg>;
}

export function TrashIcon({ size = 18, className }: IconProps) {
  return <svg {...iconProps(size, className)}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6 18 21H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>;
}

export function MenuIcon({ size = 20, className }: IconProps) {
  return <svg {...iconProps(size, className)}><circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" /></svg>;
}

