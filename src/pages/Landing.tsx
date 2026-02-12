import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ShirtIcon, Camera, CalendarDays, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  { icon: Camera, title: 'Digitize Your Closet', desc: 'Photograph every piece. AI catalogs color, style, and season instantly.' },
  { icon: Sparkles, title: 'AI Outfit Curation', desc: 'Our vision AI scans your inspiration and builds looks from what you own.' },
  { icon: ShirtIcon, title: 'Curate Looks', desc: 'Save signature outfits. Build a personal lookbook that evolves with you.' },
  { icon: CalendarDays, title: 'Schedule Your Style', desc: 'Plan the week ahead. Never repeat an outfit unintentionally.' },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <h1 className="text-3xl font-display font-light tracking-tight text-foreground">
          <span className="font-semibold">STYLST</span>
        </h1>
        <div className="flex items-center gap-4">
          <Link to="/auth/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground uppercase text-xs tracking-widest font-medium">
              Sign In
            </Button>
          </Link>
          <Link to="/auth/signup">
            <Button size="sm" className="uppercase text-xs tracking-widest font-medium px-6">
              Join
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-32 max-w-5xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <p className="text-accent font-semibold text-xs tracking-[0.3em] uppercase mb-8">Your AI Personal Stylist</p>
          <h2 className="font-display text-5xl md:text-7xl lg:text-8xl font-light text-foreground leading-[0.95] mb-8">
            Dress with<br />
            <span className="italic font-normal text-accent">intention</span>
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto mb-12 leading-relaxed font-light">
            Where your wardrobe meets intelligence. Capture inspiration, let AI curate the look, wear it tomorrow.
          </p>
          <Link to="/auth/signup">
            <Button size="lg" className="px-12 py-7 text-sm uppercase tracking-[0.2em] font-medium rounded-none shadow-2xl hover:shadow-none transition-shadow">
              Begin Your Style Journey
              <ArrowRight className="w-4 h-4 ml-3" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Divider */}
      <div className="max-w-24 mx-auto border-t border-foreground/20" />

      {/* Features */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-xs tracking-[0.3em] uppercase text-muted-foreground mb-16 font-medium"
        >
          The Experience
        </motion.p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="bg-background p-10 md:p-14 group hover:bg-card transition-colors duration-500"
            >
              <f.icon className="w-6 h-6 text-accent mb-6 group-hover:scale-110 transition-transform duration-500" />
              <h3 className="font-display text-2xl md:text-3xl font-light text-foreground mb-3 italic">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <h3 className="font-display text-4xl md:text-5xl font-light italic mb-6">
              Your closet is full.<br />Your style shouldn't be empty.
            </h3>
            <p className="text-primary-foreground/60 text-lg mb-10 font-light">
              Join thousands styling smarter — not harder.
            </p>
            <Link to="/auth/signup">
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground hover:text-primary rounded-none px-12 py-7 text-sm uppercase tracking-[0.2em] font-medium transition-all duration-300"
              >
                Get Started Free
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6 text-center">
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">
          © 2026 Stylst — Your wardrobe, reimagined.
        </p>
      </footer>
    </div>
  );
};

export default Landing;
