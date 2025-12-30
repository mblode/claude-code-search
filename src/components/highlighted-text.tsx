import { Text } from "ink";

interface Props {
  text: string;
  positions: Set<number>;
  isSelected?: boolean;
  maxLength?: number;
}

export function HighlightedText({
  text,
  positions,
  isSelected = false,
  maxLength,
}: Props) {
  const display =
    maxLength && text.length > maxLength ? text.slice(0, maxLength - 1) : text;
  const truncated = maxLength && text.length > maxLength;

  return (
    <Text>
      {[...display].map((char, i) => {
        const isHighlighted = positions.has(i);
        let color = "gray";
        if (isHighlighted) {
          color = "magenta";
        } else if (isSelected) {
          color = "white";
        }

        return (
          <Text bold={isHighlighted} color={color} key={`${i}-${char}`}>
            {char}
          </Text>
        );
      })}
      {truncated && (
        <Text color="gray" dimColor>
          …
        </Text>
      )}
    </Text>
  );
}
