"use client";

import { useClerk } from "@clerk/nextjs";
import Image from "next/image";

// Logout thật: signOut() rồi SignedOutRedirect trong layout hard-reload về "/".
const LogoutButton = ({ icon, label }: { icon: string; label: string }) => {
  const { signOut } = useClerk();
  return (
    <button
      onClick={() => signOut()}
      className="flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-lucasSkyLight w-full"
    >
      <Image src={icon} alt="" width={20} height={20} />
      <span className="hidden lg:block">{label}</span>
    </button>
  );
};

export default LogoutButton;
