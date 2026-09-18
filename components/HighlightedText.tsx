import { Text } from "react-native";

/**
 * Renders text where the AI wrapped key words in **double asterisks** — those
 * parts get `highlightClassName`, the rest `className`.
 */
export function HighlightedText({
  text,
  className,
  highlightClassName,
}: {
  text: string;
  className: string;
  highlightClassName: string;
}) {
  // Splitting on a capture group keeps the matches: odd indexes are the highlights.
  const parts = text.split(/\*\*(.+?)\*\*/g);

  return (
    <Text className={className}>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <Text key={index} className={highlightClassName}>
            {part.replace(/\\\*/g, "*")}
          </Text>
        ) : (
          part.replace(/\\\*/g, "*")
        ),
      )}
    </Text>
  );
}
