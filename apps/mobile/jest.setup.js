// Mock expo-secure-store with in-memory store
// The Map is created fresh per test file (jest re-runs module factories per file)
const mockSecureStore = new Map();
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn((key) => Promise.resolve(mockSecureStore.get(key) ?? null)),
  setItemAsync: jest.fn((key, value) => {
    mockSecureStore.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key) => {
    mockSecureStore.delete(key);
    return Promise.resolve();
  }),
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
  })),
  useSegments: jest.fn(() => []),
  usePathname: jest.fn(() => "/"),
  Link: "Link",
  Redirect: "Redirect",
}));

// Mock expo-auth-session
jest.mock("expo-auth-session", () => ({
  makeRedirectUri: jest.fn(() => "openslaq://redirect"),
}));

// Mock expo-web-browser
jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

// Mock expo-crypto
jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "00000000-0000-0000-0000-000000000000"),
  digestStringAsync: jest.fn(() => Promise.resolve("mock-digest")),
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  CryptoEncoding: { BASE64: "base64" },
}));

// Mock expo-apple-authentication
jest.mock("expo-apple-authentication", () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: {
    EMAIL: 1,
    FULL_NAME: 0,
  },
}));

// Mock react-native-svg (render as string tags — avoids babel/nativewind interference)
jest.mock("react-native-svg", () => ({
  __esModule: true,
  default: "Svg",
  Svg: "Svg",
  Path: "Path",
  G: "G",
  Rect: "Rect",
  Defs: "Defs",
  ClipPath: "ClipPath",
}));

// Mock react-native-css-interop runtime (loaded by nativewind JSX transform)
jest.mock("react-native-css-interop", () => ({
  cssInterop: (component) => component,
  remapProps: () => (component) => component,
}));

// Mock nativewind styled (safety net if CSS interop fails in JSDOM)
jest.mock("nativewind", () => ({
  styled: (component) => component,
}));
