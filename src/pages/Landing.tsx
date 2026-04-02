import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ShirtIcon, Camera, CalendarDays, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
const heroImage = new URL('@/assets/landing-hero.jpg', import.meta.url).href;
const stylstLogo = new URL('@/assets/stylst-logo.png', import.meta.url).href;

const features = [
  { icon: Camera, title: 'Digitize Your Closet', desc: 'Photograph every piece. AI catalogs color, style, and season instantly.' },
  { icon: Sparkles, title: 'AI Outfit Curation', desc: 'Our vision AI scans your inspiration and builds looks from what you own.' },
  { icon: ShirtIcon, title: 'Curate Looks', desc: 'Save signature outfits. Build a personal lookbook that evolves with you.' },
  { icon: CalendarDays, title: 'Schedule Your Style', desc: 'Plan the week ahead. Never repeat an outfit unintentionally.' },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero — full bleed */}
      <section className="relative min-h-screen flex flex-col">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Fashion editorial"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 via-foreground/30 to-foreground/80" />
        </div>

        {/* Nav overlay */}
        <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
          <div className="flex items-center gap-3">
            <img src={stylstLogo} alt="Stylst" className="w-9 h-9 rounded" />
            <h1 className="text-2xl md:text-3xl font-display font-semibold tracking-[0.15em] text-primary-foreground uppercase">
              Stylst
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth/login">
              <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 uppercase text-[10px] tracking-[0.25em] font-semibold">
                Sign In
              </Button>
            </Link>
            <Link to="/auth/signup">
              <Button size="sm" className="bg-primary hover:bg-primary/90 uppercase text-[10px] tracking-[0.25em] font-semibold px-6 rounded-none">
                Join Now
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-4xl"
          >
            <h2 className="font-display text-5xl md:text-7xl lg:text-[6.5rem] font-light text-primary-foreground leading-[0.9] mb-8">
              From saved<br />
              <span className="italic font-normal">to Styled.</span>
            </h2>
            <p className="text-primary-foreground/70 text-base md:text-lg max-w-lg mx-auto mb-12 font-light leading-relaxed">
              Sync your boards, digitize your wardrobe, and let Stylst create outfits you can wear today.
            </p>
            <Link to="/auth/signup">
              <Button size="lg" className="bg-primary hover:bg-primary/90 rounded-none px-14 py-7 text-xs uppercase tracking-[0.25em] font-semibold shadow-2xl shadow-primary/30 transition-all duration-300 hover:shadow-primary/50 hover:scale-[1.02]">
                Start Styling
                <ArrowRight className="w-4 h-4 ml-3" />
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="relative z-10 pb-10 flex justify-center">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="w-px h-12 bg-gradient-to-b from-transparent to-primary-foreground/40"
          />
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-12 md:py-16 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <p className="text-primary text-xs tracking-[0.3em] uppercase font-semibold mb-3">The Experience</p>
          <h3 className="font-display text-3xl md:text-4xl font-light text-foreground italic">
            Fashion meets intelligence
          </h3>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 md:gap-6">
          {features.map((f, i) => (
            <Link to="/auth/signup" key={f.title}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="group relative bg-card rounded-sm p-5 md:p-8 border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 cursor-pointer h-full"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-500">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-display text-sm md:text-lg font-light text-foreground mb-2 uppercase tracking-[0.2em]">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-xs md:text-sm font-light tracking-wide">{f.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 overflow-hidden flex justify-center px-6">
        <div className="relative max-w-2xl w-full rounded-sm overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent opacity-95" />
          <div className="relative z-10 text-center px-8 py-16">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <h3 className="font-display text-3xl md:text-5xl font-light text-primary-foreground italic leading-tight mb-4">
                Your closet is full.<br />Your style shouldn't be empty.
              </h3>
              <p className="text-primary-foreground/70 text-base font-light">
                Join thousands who dress with intention — not stress.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6 text-center bg-card">
        <p className="text-[11px] tracking-[0.25em] uppercase text-muted-foreground font-medium">
          © 2026 Stylst — Your wardrobe, reimagined
        </p>
      </footer>
    </div>
  );
};

export default Landing;
