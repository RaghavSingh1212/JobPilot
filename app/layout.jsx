import "./global.css";

export const metadata = {
  title: "JobPilot",
  description: "AI-powered job discovery, ranking, and application drafting."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
