export function generateClaimCode(): string {
  const letters = Array.from({ length: 3 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join('')
  const digits = String(Math.floor(1000 + Math.random() * 9000))
  return `${letters}-${digits}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateUniqueClaimCode(supabase: any): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateClaimCode()
    const { data } = await supabase
      .from('lodges')
      .select('id')
      .eq('claim_code', code)
      .maybeSingle()
    if (!data) return code
  }
  return `TYR-${Date.now().toString().slice(-4)}`
}
