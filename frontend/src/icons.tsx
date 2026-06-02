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

export function MoonIcon({ size = 18, className }: IconProps) {
  return <svg {...iconProps(size, className)}><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.7 6.7 0 0 0 21 12.8Z" /></svg>;
}

export function SunIcon({ size = 18, className }: IconProps) {
  return <svg {...iconProps(size, className)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>;
}

export function ChatIcon({ size = 18, className }: IconProps) {
  return <svg {...iconProps(size, className)}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /></svg>;
}

export function GraphIcon({ size = 18, className }: IconProps) {
  return <svg {...iconProps(size, className)}><circle cx="5" cy="12" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="19" cy="19" r="2" /><path d="m7 11 10-5" /><path d="m7 13 10 5" /></svg>;
}

export function PlusIcon({ size = 18, className }: IconProps) {
  return <svg {...iconProps(size, className)}><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
}

export function DownloadIcon({ size = 18, className }: IconProps) {
  return <svg {...iconProps(size, className)}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>;
}

export function CopyIcon({ size = 16, className }: IconProps) {
  return <svg {...iconProps(size, className)}><rect width="13" height="13" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>;
}

export function InfoIcon({ size = 16, className }: IconProps) {
  return <svg {...iconProps(size, className)}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></svg>;
}
