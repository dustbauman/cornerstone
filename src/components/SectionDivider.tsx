interface Props {
  label: string;
}

export default function SectionDivider({ label }: Props) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-muted font-medium whitespace-nowrap flex-shrink-0">{label}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}
