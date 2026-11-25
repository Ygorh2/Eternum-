/**
 * Datas "só dia" (YYYY-MM-DD), como nascimento e falecimento, não têm hora nem
 * fuso. O JavaScript, porém, interpreta `new Date('2020-05-10')` como meia-noite
 * UTC — e no Brasil (UTC-3) isso vira 09/05 às 21h. Por isso a data aparecia um
 * dia antes. Aqui tratamos esse formato como data local.
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null;
  const match = DATE_ONLY.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

export function formatDate(
  value?: string | null,
  options?: Intl.DateTimeFormatOptions,
  locale = 'pt-BR'
): string {
  const date = parseLocalDate(value);
  return date ? date.toLocaleDateString(locale, options) : '';
}

export function getYear(value?: string | null): number | null {
  const date = parseLocalDate(value);
  return date ? date.getFullYear() : null;
}

/** Data de hoje no fuso local, no formato YYYY-MM-DD (para inputs de data). */
export function todayLocalISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
