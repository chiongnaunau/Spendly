import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { TranslationProvider } from '@/contexts/TranslationContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppShellWrapper } from '@/components/layout/AppShellWrapper';

export const metadata: Metadata = {
  title: 'Spendly — Personal Expense Assistant',
  description: 'AI-powered receipt scanning and expense tracking with RAG-based chat assistant.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <TranslationProvider>
            <AuthProvider>
              <AppShellWrapper>
                {children}
              </AppShellWrapper>
            </AuthProvider>
          </TranslationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
