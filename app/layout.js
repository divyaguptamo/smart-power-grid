import './globals.css';

export const metadata = {
  title: 'Smart Grid Console',
  description: 'Smart power grid management and energy resource allocation',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
