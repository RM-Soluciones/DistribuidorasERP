import { Navbar } from "./Navbar";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20 selection:text-primary">
      <Navbar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <footer className="bg-card border-t border-border mt-auto py-12">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">D</div>
            <span className="font-bold text-foreground">DistriPro</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} DistriPro Wholesale. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
