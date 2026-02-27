import { Text } from "react-native";
import { useMobileTheme } from "@/theme/ThemeProvider";

interface Props {
  headline: string;
  style?: object;
}

interface Segment {
  text: string;
  highlighted: boolean;
}

function parseHeadline(html: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /<mark>(.*?)<\/mark>/g;
  let lastIndex = 0;
  let match = regex.exec(html);

  while (match !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: html.slice(lastIndex, match.index), highlighted: false });
    }
    segments.push({ text: match[1], highlighted: true });
    lastIndex = match.index + match[0].length;
    match = regex.exec(html);
  }

  if (lastIndex < html.length) {
    segments.push({ text: html.slice(lastIndex), highlighted: false });
  }

  if (segments.length === 0 && html.length > 0) {
    segments.push({ text: html, highlighted: false });
  }

  return segments;
}

export function HeadlineRenderer({ headline, style }: Props) {
  const { theme } = useMobileTheme();
  const segments = parseHeadline(headline);

  return (
    <Text testID="headline-text" style={[{ fontSize: 14, color: theme.colors.textSecondary }, style]} numberOfLines={2}>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <Text
            key={index}
            testID="headline-mark"
            style={{ backgroundColor: theme.brand.primary + "30", color: theme.colors.textPrimary, fontWeight: "600" }}
          >
            {segment.text}
          </Text>
        ) : (
          <Text key={index}>{segment.text}</Text>
        ),
      )}
    </Text>
  );
}
