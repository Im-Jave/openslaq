import { useState } from "react";
import { View, Text, Image, Pressable, Modal, Linking } from "react-native";
import type { Attachment } from "@openslaq/shared";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { env } from "@/lib/env";

interface Props {
  attachments: Attachment[];
}

function getDownloadUrl(id: string): string {
  return `${env.EXPO_PUBLIC_API_URL}/api/uploads/${id}/download`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ImageAttachment({ attachment }: { attachment: Attachment }) {
  const [fullscreen, setFullscreen] = useState(false);
  const url = getDownloadUrl(attachment.id);

  return (
    <>
      <Pressable
        testID={`attachment-image-${attachment.id}`}
        onPress={() => setFullscreen(true)}
      >
        <Image
          source={{ uri: url }}
          style={{
            maxWidth: 240,
            height: 160,
            borderRadius: 8,
          }}
          resizeMode="cover"
        />
      </Pressable>
      <Modal
        visible={fullscreen}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreen(false)}
      >
        <Pressable
          testID={`attachment-fullscreen-${attachment.id}`}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" }}
          onPress={() => setFullscreen(false)}
        >
          <Image
            source={{ uri: url }}
            style={{ width: "90%", height: "70%" }}
            resizeMode="contain"
          />
          <Text style={{ color: "#fff", marginTop: 12, fontSize: 14 }}>
            {attachment.filename}
          </Text>
        </Pressable>
      </Modal>
    </>
  );
}

function VideoAttachment({ attachment }: { attachment: Attachment }) {
  const { theme } = useMobileTheme();
  const url = getDownloadUrl(attachment.id);

  return (
    <Pressable
      testID={`attachment-video-${attachment.id}`}
      onPress={() => void Linking.openURL(url)}
      className="flex-row items-center rounded-lg px-3 py-2"
      style={{ backgroundColor: theme.colors.surfaceTertiary }}
    >
      <Text className="mr-2">🎬</Text>
      <View className="flex-1">
        <Text
          className="text-sm"
          style={{ color: theme.brand.primary }}
          numberOfLines={1}
        >
          {attachment.filename}
        </Text>
        <Text className="text-xs" style={{ color: theme.colors.textMuted }}>
          {formatSize(attachment.size)}
        </Text>
      </View>
    </Pressable>
  );
}

function FileAttachment({ attachment }: { attachment: Attachment }) {
  const { theme } = useMobileTheme();
  const url = getDownloadUrl(attachment.id);

  return (
    <Pressable
      testID={`attachment-file-${attachment.id}`}
      onPress={() => void Linking.openURL(url)}
      className="flex-row items-center rounded-lg px-3 py-2"
      style={{ backgroundColor: theme.colors.surfaceTertiary }}
    >
      <Text className="mr-2">📎</Text>
      <View className="flex-1">
        <Text
          className="text-sm"
          style={{ color: theme.brand.primary }}
          numberOfLines={1}
        >
          {attachment.filename}
        </Text>
        <Text className="text-xs" style={{ color: theme.colors.textMuted }}>
          {formatSize(attachment.size)}
        </Text>
      </View>
    </Pressable>
  );
}

export function MessageAttachments({ attachments }: Props) {
  if (attachments.length === 0) return null;

  return (
    <View testID="message-attachments" className="mt-1 gap-1.5">
      {attachments.map((att) => {
        if (att.mimeType.startsWith("image/")) {
          return <ImageAttachment key={att.id} attachment={att} />;
        }
        if (att.mimeType.startsWith("video/")) {
          return <VideoAttachment key={att.id} attachment={att} />;
        }
        return <FileAttachment key={att.id} attachment={att} />;
      })}
    </View>
  );
}
