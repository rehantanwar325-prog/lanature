'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface NavbarProps {
  forceScrolled?: boolean;
}

export default function Navbar({ forceScrolled = false }: NavbarProps) {
  const [scrolled, setScrolled] = useState(forceScrolled);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (forceScrolled) return;
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [forceScrolled]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 ${
        scrolled
          ? 'bg-dark/95 backdrop-blur-[20px] py-2.5 shadow-[0_2px_20px_rgba(0,0,0,0.3)]'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3">
          <div className="w-[42px] h-[42px] bg-gradient-to-br from-accent to-accent-dark rounded-full flex items-center justify-center font-heading text-xl text-white font-bold">
            L
          </div>
          <h1 className="font-heading text-2xl text-white font-bold tracking-wide">
            La<span className="text-accent">Nature</span>
          </h1>
        </Link>

        {/* Desktop Links */}
        <ul className="hidden md:flex items-center gap-8">
          {[
            { href: '/#home', label: 'Home' },
            { href: '/#features', label: 'Experience' },
            { href: '/#gallery', label: 'Gallery' },
            { href: '/#about', label: 'About' },
            { href: '/#contact', label: 'Contact' },
          ].map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-white/80 text-sm font-medium tracking-wide relative py-1 hover:text-white transition-all duration-300 after:content-[''] after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-[2px] after:bg-accent after:transition-all after:duration-300 hover:after:w-full"
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/menu?table=1"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[12px] font-semibold text-sm bg-gradient-to-br from-accent to-accent-dark text-dark shadow-[0_4px_15px_rgba(201,168,76,0.3)] hover:translate-y-[-2px] hover:shadow-[0_6px_25px_rgba(201,168,76,0.4)] transition-all duration-300"
            >
              Order Food
            </Link>
          </li>
        </ul>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden flex flex-col gap-[5px] bg-transparent p-1"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <span className={`w-[26px] h-[2px] bg-white rounded transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
          <span className={`w-[26px] h-[2px] bg-white rounded transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
          <span className={`w-[26px] h-[2px] bg-white rounded transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-dark/98 px-5 py-5 flex flex-col gap-4 animate-fade-up">
          {[
            { href: '/#home', label: 'Home' },
            { href: '/#features', label: 'Experience' },
            { href: '/#gallery', label: 'Gallery' },
            { href: '/#about', label: 'About' },
            { href: '/#contact', label: 'Contact' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-white/80 text-sm font-medium hover:text-white transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/menu?table=1"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[12px] font-semibold text-sm bg-gradient-to-br from-accent to-accent-dark text-dark"
            onClick={() => setMobileOpen(false)}
          >
            Order Food
          </Link>
        </div>
      )}
    </nav>
  );
}
