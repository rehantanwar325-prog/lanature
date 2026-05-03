'use client';

import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { FEATURES, GALLERY_ITEMS } from '@/lib/constants';

export default function HomePage() {
  return (
    <>
      <Navbar />

      {/* ═══════ Hero ═══════ */}
      <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden" id="home">
        <div className="absolute inset-0">
          <Image
            src="/images/lanature-real.jpg"
            alt="LaNature Hotel"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-dark/60 via-dark/40 to-primary/50" />
        </div>

        <div className="relative z-10 text-center text-white max-w-[700px] px-6 animate-fade-up">
          <p className="uppercase tracking-[4px] text-sm text-accent mb-4 font-semibold">
            ✦ Welcome to LaNature ✦
          </p>
          <h2 className="font-heading text-5xl md:text-7xl font-bold leading-[1.1] mb-5">
            Where Nature Meets <span className="text-accent">Luxury</span>
          </h2>
          <p className="text-lg text-white/85 mb-9 leading-relaxed">
            Indulge in exquisite dining, rejuvenating spa experiences, and breathtaking views — all nestled in the heart of nature&apos;s embrace.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/menu?table=1"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-[12px] font-semibold text-lg bg-gradient-to-br from-accent to-accent-dark text-dark shadow-[0_4px_15px_rgba(201,168,76,0.3)] hover:translate-y-[-2px] hover:shadow-[0_6px_25px_rgba(201,168,76,0.4)] transition-all duration-300"
            >
              🍽 Order Food
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-[12px] font-semibold text-lg border-2 border-accent text-accent bg-transparent hover:bg-accent hover:text-dark transition-all duration-300"
            >
              Explore More
            </a>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce-scroll">
          <span className="block w-[30px] h-[50px] border-2 border-white/40 rounded-[25px] relative">
            <span className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-2.5 bg-accent rounded-sm animate-scroll-down" />
          </span>
        </div>
      </section>

      {/* ═══════ Features ═══════ */}
      <section className="py-20" id="features">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <p className="uppercase tracking-[3px] text-xs text-accent font-semibold mb-2">Our Experience</p>
          <h2 className="font-heading text-4xl font-bold text-dark leading-tight">World-Class Hospitality</h2>
          <div className="w-[60px] h-[3px] bg-gradient-to-r from-accent to-accent-light rounded mx-auto mt-4" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="text-center px-7 py-10 rounded-[12px] bg-white shadow-DEFAULT hover:translate-y-[-6px] hover:shadow-lg transition-all duration-300"
              >
                <div className="w-[70px] h-[70px] bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center mx-auto mb-5 text-3xl">
                  {f.icon}
                </div>
                <h3 className="font-heading text-xl mb-2 text-dark">{f.title}</h3>
                <p className="text-text-light text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ Gallery ═══════ */}
      <section className="py-20 bg-bg-warm" id="gallery">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <p className="uppercase tracking-[3px] text-xs text-accent font-semibold mb-2">Visual Tour</p>
          <h2 className="font-heading text-4xl font-bold text-dark leading-tight">Our Gallery</h2>
          <div className="w-[60px] h-[3px] bg-gradient-to-r from-accent to-accent-light rounded mx-auto mt-4" />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
            {GALLERY_ITEMS.map((item) => (
              <div key={item.label} className="rounded-[12px] overflow-hidden relative aspect-[4/3] group">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-600 group-hover:scale-[1.08]"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-dark/70 flex items-end p-5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <span className="text-white font-heading text-lg">{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ About ═══════ */}
      <section className="py-20" id="about">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-15 items-center">
            <div className="rounded-[12px] overflow-hidden relative" style={{ height: '400px' }}>
              <Image
                src="/images/gallery-lounge.jpg"
                alt="About LaNature Hotel"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div>
              <p className="uppercase tracking-[3px] text-xs text-accent font-semibold mb-2">Our Story</p>
              <h3 className="font-heading text-3xl mb-4 text-dark">A Legacy of Elegance Since 2005</h3>
              <p className="text-text-light mb-4 leading-relaxed">
                Nestled amidst verdant hills and pristine forests, LaNature Hotel was born from a vision to create a sanctuary where luxury meets the untouched beauty of nature.
              </p>
              <p className="text-text-light mb-4 leading-relaxed">
                For nearly two decades, we&apos;ve welcomed guests from around the world, offering them an unforgettable blend of warm Indian hospitality, world-class dining, and serene natural surroundings.
              </p>
              <p className="text-text-light mb-4 leading-relaxed">
                Every dish on our menu tells a story — from time-honored family recipes to innovative culinary creations, our chefs pour their passion into every plate.
              </p>
              <Link
                href="/menu?table=1"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-[12px] font-semibold text-sm bg-gradient-to-br from-primary to-primary-light text-white shadow-[0_4px_15px_rgba(45,80,22,0.3)] hover:translate-y-[-2px] hover:shadow-[0_6px_25px_rgba(45,80,22,0.4)] transition-all duration-300 mt-3"
              >
                View Our Menu →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ Contact ═══════ */}
      <section className="py-20 bg-bg-warm" id="contact">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="uppercase tracking-[3px] text-xs text-accent font-semibold mb-2">Get In Touch</p>
            <h2 className="font-heading text-4xl font-bold text-dark leading-tight">Contact Us</h2>
            <div className="w-[60px] h-[3px] bg-gradient-to-r from-accent to-accent-light rounded mx-auto mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              {[
                { icon: '📍', title: 'Address', text: '42 Nature Valley Road, Green Hills, Shimla, Himachal Pradesh — 171001, India' },
                { icon: '📞', title: 'Phone', text: '+91 98765 43210\n+91 177 265 4321' },
                { icon: '✉', title: 'Email', text: 'info@lanaturehotel.com\nreservations@lanaturehotel.com' },
                { icon: '🕐', title: 'Hours', text: 'Restaurant: 7:00 AM – 11:00 PM\nSpa: 9:00 AM – 9:00 PM' },
              ].map((info) => (
                <div key={info.title} className="flex items-start gap-4 p-5 rounded-[8px] bg-bg-warm">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-xl text-white shrink-0">
                    {info.icon}
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-dark mb-1">{info.title}</h4>
                    <p className="text-sm text-text-light whitespace-pre-line">{info.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-[12px] overflow-hidden min-h-[350px]">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3544.5!2d75.1697839!3d27.5382649!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x396cbd3b1bd75577%3A0xf43be304215c97c4!2sLa%20Nature%20Hotels%20%26%20Resorts!5e0!3m2!1sen!2sin!4v1712600000000!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0, borderRadius: '12px' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="LaNature Hotel Location"
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
