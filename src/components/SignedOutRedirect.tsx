"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

// Sau khi sign out, UserButton chỉ soft-navigate → layout server (Menu/Navbar)
// còn kẹt trong Router Cache. Hard reload về "/" để hiện trang đăng nhập ngay.
const SignedOutRedirect = () => {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.location.href = "/";
    }
  }, [isLoaded, isSignedIn]);

  return null;
};

export default SignedOutRedirect;
