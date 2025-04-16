import React from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  CircleHelp, 
  Building2, 
  FileText, 
  Crown, 
  LogOut,
  Menu
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

function NavLink({ href, icon, children, className = '', onClick }: NavLinkProps) {
  const [location] = useLocation();
  const isActive = location === href;
  
  return (
    <Link href={href}>
      <a
        className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
          isActive
            ? 'bg-primary text-primary-foreground font-medium'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        } ${className}`}
        onClick={onClick}
      >
        {icon}
        <span>{children}</span>
      </a>
    </Link>
  );
}

export function NavBar() {
  const { logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/">
            <a className="flex items-center gap-2 font-semibold">
              <Building2 className="h-5 w-5" />
              <span>UAE Business Setup</span>
            </a>
          </Link>
          
          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-5">
            <NavLink href="/" icon={<Building2 className="h-4 w-4" />}>
              Dashboard
            </NavLink>
            <NavLink href="/free-zones" icon={<Building2 className="h-4 w-4" />}>
              Free Zones
            </NavLink>
            <NavLink href="/documents" icon={<FileText className="h-4 w-4" />}>
              Documents
            </NavLink>
            <NavLink href="/premium-assistant" icon={<Crown className="h-4 w-4" />}>
              Premium Assistant
            </NavLink>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Logout</span>
          </Button>
          
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[300px] sm:w-[350px]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>
                  Navigate to different sections of the application.
                </SheetDescription>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-6">
                <SheetClose asChild>
                  <NavLink href="/" icon={<Building2 className="h-4 w-4" />}>
                    Dashboard
                  </NavLink>
                </SheetClose>
                <SheetClose asChild>
                  <NavLink href="/free-zones" icon={<Building2 className="h-4 w-4" />}>
                    Free Zones
                  </NavLink>
                </SheetClose>
                <SheetClose asChild>
                  <NavLink href="/documents" icon={<FileText className="h-4 w-4" />}>
                    Documents
                  </NavLink>
                </SheetClose>
                <SheetClose asChild>
                  <NavLink href="/premium-assistant" icon={<Crown className="h-4 w-4" />}>
                    Premium Assistant
                  </NavLink>
                </SheetClose>
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 justify-start px-3 h-10 font-normal"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </Button>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}