export function uniqueSelection(indices: number[]): number[] {
  return indices.filter((index, i) => indices.indexOf(index) === i);
}

export function toggleSelection(indices: number[], index: number, max: number): number[] {
  const unique = uniqueSelection(indices);
  if (unique.includes(index)) return unique.filter((item) => item !== index);
  if (unique.length >= max) return unique;
  return [...unique, index];
}

export function moveSelection(indices: number[], from: number, to: number): number[] {
  const next = uniqueSelection(indices);
  if (from < 0 || to < 0 || from >= next.length || to >= next.length) return next;
  const [item] = next.splice(from, 1);
  if (item === undefined) return next;
  next.splice(to, 0, item);
  return next;
}

export function swapSelection(indices: number[], a: number, b: number): number[] {
  const next = uniqueSelection(indices);
  if (a < 0 || b < 0 || a >= next.length || b >= next.length) return next;
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

export function fitSelectionToCount(
  indices: number[],
  available: number[],
  count: number,
): number[] {
  const selected = uniqueSelection(indices).filter((index) => available.includes(index));
  for (const index of available) {
    if (selected.length >= count) break;
    if (!selected.includes(index)) selected.push(index);
  }
  return selected.slice(0, count);
}
