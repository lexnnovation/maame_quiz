import './globals.css';

export const metadata = {
  title: 'Officer Test Portal',
  description: 'Customer service knowledge test portal',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="portal-root" id="ptRoot">
        {children}
      </body>
    </html>
  );
}
