interface Props {
  score: number;
}

export default function MatchPill({ score }: Props) {
  if (score >= 70) {
    return (
      <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-trust/10 text-trust border border-trust/20 uppercase tracking-[0.06em]">
        Strong match
      </span>
    );
  }
  if (score >= 40) {
    return (
      <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-[0.06em]">
        Possible match
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone text-muted border border-warm uppercase tracking-[0.06em]">
      Different trade
    </span>
  );
}
