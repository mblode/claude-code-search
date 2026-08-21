export interface HighlightRun {
  bold: boolean;
  color: string;
  text: string;
}

function runColor(highlighted: boolean, isSelected: boolean): string {
  if (highlighted) {
    return "magenta";
  }
  if (isSelected) {
    return "white";
  }
  return "gray";
}

export function highlightRuns(
  text: string,
  positions: Set<number>,
  isSelected: boolean
): HighlightRun[] {
  if (text.length === 0) {
    return [];
  }
  if (positions.size === 0) {
    return [
      {
        bold: false,
        color: runColor(false, isSelected),
        text,
      },
    ];
  }

  const runs: HighlightRun[] = [];
  let start = 0;
  let highlighted = positions.has(0);
  for (let i = 1; i <= text.length; i++) {
    const nextHighlighted = i < text.length && positions.has(i);
    if (i === text.length || nextHighlighted !== highlighted) {
      runs.push({
        bold: highlighted,
        color: runColor(highlighted, isSelected),
        text: text.slice(start, i),
      });
      start = i;
      highlighted = nextHighlighted;
    }
  }
  return runs;
}
