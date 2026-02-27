import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import SignInScreen from "../../../app/(auth)/sign-in";

const mockSendOtp = jest.fn();
const mockVerifyOtp = jest.fn();
const mockSignInWithApple = jest.fn();
const mockSignInWithOAuth = jest.fn();

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    sendOtp: mockSendOtp,
    verifyOtp: mockVerifyOtp,
    signInWithApple: mockSignInWithApple,
    signInWithOAuth: mockSignInWithOAuth,
  }),
}));

describe("SignInScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders email input, submit button, and OAuth options", () => {
    render(<SignInScreen />);

    expect(screen.getByTestId("email-input")).toBeTruthy();
    expect(screen.getByTestId("submit-button")).toBeTruthy();
    expect(screen.getByTestId("apple-sign-in")).toBeTruthy();
    expect(screen.getByText("Continue with Google")).toBeTruthy();
    expect(screen.getByText("Continue with GitHub")).toBeTruthy();
    // OTP elements should not be visible
    expect(screen.queryByTestId("otp-input")).toBeNull();
    expect(screen.queryByTestId("verify-button")).toBeNull();
  });

  it("does not advance past email step when email is empty", () => {
    render(<SignInScreen />);

    fireEvent.press(screen.getByTestId("submit-button"));

    // Should still be on email step — sendOtp never called
    expect(screen.getByTestId("email-input")).toBeTruthy();
    expect(screen.queryByTestId("otp-input")).toBeNull();
    expect(mockSendOtp).not.toHaveBeenCalled();
  });

  it("accepts email input and shows continue button", () => {
    render(<SignInScreen />);

    fireEvent.changeText(screen.getByTestId("email-input"), "test@example.com");

    expect(screen.getByTestId("submit-button")).toBeTruthy();
    expect(screen.getByText("Continue")).toBeTruthy();
  });
});
