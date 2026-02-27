import { renderHook, act } from "@testing-library/react-native";
import { useFileUpload } from "../useFileUpload";

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: "file:///photo.jpg",
        fileName: "photo.jpg",
        mimeType: "image/jpeg",
      },
    ],
  }),
  launchCameraAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: "file:///camera.jpg",
        fileName: "camera.jpg",
        mimeType: "image/jpeg",
      },
    ],
  }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: "file:///doc.pdf",
        name: "doc.pdf",
        mimeType: "application/pdf",
      },
    ],
  }),
}));

jest.mock("@/lib/env", () => ({
  env: { EXPO_PUBLIC_API_URL: "http://api.test" },
}));

describe("useFileUpload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as unknown as { fetch: jest.Mock }).fetch = jest.fn();
  });

  it("starts with empty state", () => {
    const { result } = renderHook(() => useFileUpload());

    expect(result.current.pendingFiles).toHaveLength(0);
    expect(result.current.uploading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasFiles).toBe(false);
  });

  it("adds files from image picker", async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFromImagePicker();
    });

    expect(result.current.pendingFiles).toHaveLength(1);
    expect(result.current.pendingFiles[0].name).toBe("photo.jpg");
    expect(result.current.pendingFiles[0].isImage).toBe(true);
    expect(result.current.hasFiles).toBe(true);
  });

  it("adds files from camera", async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFromCamera();
    });

    expect(result.current.pendingFiles).toHaveLength(1);
    expect(result.current.pendingFiles[0].name).toBe("camera.jpg");
  });

  it("adds files from document picker", async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFromDocumentPicker();
    });

    expect(result.current.pendingFiles).toHaveLength(1);
    expect(result.current.pendingFiles[0].name).toBe("doc.pdf");
    expect(result.current.pendingFiles[0].isImage).toBe(false);
  });

  it("removes a file by id", async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFromImagePicker();
    });

    const fileId = result.current.pendingFiles[0].id;

    act(() => {
      result.current.removeFile(fileId);
    });

    expect(result.current.pendingFiles).toHaveLength(0);
    expect(result.current.hasFiles).toBe(false);
  });

  it("uploads all files and returns attachment ids", async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        attachments: [{ id: "att-1" }, { id: "att-2" }],
      }),
    });

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFromImagePicker();
    });

    let ids: string[] = [];
    await act(async () => {
      ids = await result.current.uploadAll(() => Promise.resolve("test-token"));
    });

    expect(ids).toEqual(["att-1", "att-2"]);
    expect(global.fetch as unknown as jest.Mock).toHaveBeenCalledWith(
      "http://api.test/api/uploads",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer test-token" },
      }),
    );
  });

  it("handles upload failure", async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "File too large" }),
    });

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFromImagePicker();
    });

    let error: Error | undefined;
    await act(async () => {
      try {
        await result.current.uploadAll(() => Promise.resolve("test-token"));
      } catch (e) {
        error = e as Error;
      }
    });

    expect(error?.message).toBe("File too large");
    expect(result.current.error).toBe("File too large");
    expect(result.current.uploading).toBe(false);
  });

  it("returns empty array when no files to upload", async () => {
    const { result } = renderHook(() => useFileUpload());

    let ids: string[] = [];
    await act(async () => {
      ids = await result.current.uploadAll(() => Promise.resolve("test-token"));
    });

    expect(ids).toEqual([]);
    expect(global.fetch as unknown as jest.Mock).not.toHaveBeenCalled();
  });

  it("reset clears all state", async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFromImagePicker();
    });

    expect(result.current.hasFiles).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.pendingFiles).toHaveLength(0);
    expect(result.current.error).toBeNull();
    expect(result.current.hasFiles).toBe(false);
  });
});
