import { ComponentChildren } from "preact";

export default function Main({ children }: { children: ComponentChildren }) {
  return (
    <main class="max-w-screen-md mx-auto mt-4 px-2">
      {children}
    </main>
  );
}
