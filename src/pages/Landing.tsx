import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ShirtIcon, Camera, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  { icon: Camera, title: 'Digitize Your Closet', desc: 'Snap photos, let AI tag & organize everything.' },
  { icon: Sparkles, title: 'AI Outfit Matching', desc: 'Match Pinterest inspo to clothes you already own.' },
  { icon: ShirtIcon, title: 'Build Looks', desc: 'Create, save, and schedule outfits effortlessly.' },
  { icon: CalendarDays, title: 'Plan Your Week', desc: 'Never have a "nothing to wear" morning again.' },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <h1 className="text-2xl font-display font-bold text-primary">Stylst</h1>
        <div className="flex gap-3">
          <Link to="/auth/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link to="/auth/signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-24 max-w-4xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="text-accent font-semibold text-sm tracking-widest uppercase mb-4">Your AI Personal Stylist</p>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-foreground leading-tight mb-6">
            Wear what you <span className="text-accent italic">love</span>,<br />from what you <span className="text-primary italic">own</span>.
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Sync your Pinterest boards, digitize your closet, and let AI create outfits you can wear today.
          </p>
          <Link to="/auth/signup">
            <Button size="lg" className="px-10 py-6 text-lg rounded-full shadow-lg">
              Start Styling — It's Free
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="bg-card rounded-xl p-8 border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <f.icon className="w-8 h-8 text-accent mb-4" />
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center text-sm text-muted-foreground">
        © 2026 Stylst. Your wardrobe, reimagined.
      </footer>
    </div>
  );
};

export default Landing;
