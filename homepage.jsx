import React, { useEffect, useState } from "react";
import axios from "axios"; // Match your working page
import { Link } from "react-router-dom";
import ScrollReveal from "../components/ScrollReveal";

const Divider = () => <div className="h-px bg-slate-800/50 mx-auto max-w-6xl" />;

// Match the env var logic from your working page
const backendUrl = process.env.REACT_APP_BACKEND_URL || "https://desci-backend.onrender.com";

export default function HomePage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Use axios.get to match your working page's behavior
        const response = await axios.get(`${backendUrl}/api/launchpad/projects`);
        
        // Axios puts the data in response.data automatically
        const data = response.data;
        setProjects(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Home page fetch failed:", error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) return <div className="p-20 text-center text-slate-400">Loading...</div>;

  return (
    <div className="text-slate-50 bg-transparent" data-testid="home-page">
      {/* HERO */}
      <section
        /* Removed py-6. Added mx-6 for horizontal snugness and mt-0 to touch the nav bar */
        className="relative h-[650px] mx-6 mt-8 mb-8 overflow-hidden rounded-3xl border border-slate-800/80"
        data-testid="home-hero-section"
      >
        <img
          src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb"
          className="absolute inset-0 h-full w-full object-cover"
          alt="Hero"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1426]/95 via-[#0d1426]/70 to-transparent" />
        <div className="relative mx-auto flex h-full max-w-7xl items-center px-6">
          <ScrollReveal>
            <div className="-mt-12 max-w-xl space-y-6" data-testid="home-hero-content">
              <span
                className="inline-flex rounded-full bg-cyan-500/15 px-3 py-1 text-[11px] uppercase tracking-wide text-cyan-300"
                data-testid="home-hero-badge"
              >
                LIVE · DECENTRALIZED SCIENCE
              </span>
              <h1 className="text-4xl md:text-6xl font-semibold" data-testid="home-hero-title">
                Funding the Future of Science
              </h1>
              <p className="text-slate-300" data-testid="home-hero-subtitle">
                Accelerating decentralized, community-driven science through
                transparent on-chain funding.
              </p>
              <div className="flex gap-3" data-testid="home-hero-actions">
                <Link
                  to="/launches"
                  className="rounded-full bg-cyan-500 px-6 py-2 text-xs font-semibold text-slate-950"
                  data-testid="home-hero-explore-launchpad-button"
                >
                  Explore Launchpad
                </Link>
                <Link
                  to="/shop"
                  className="rounded-full border border-slate-600 px-6 py-2 text-xs"
                  data-testid="home-hero-visit-shop-button"
                >
                  Visit Shop
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

    

      {/* PLATFORM */}
      <section
        className="mx-auto max-w-6xl px-6 py-9 mt-12 grid md:grid-cols-2 gap-16"
        data-testid="home-platform-section"
      >
        <ScrollReveal>
          <div data-testid="home-platform-copy">
            <h2 className="text-3xl font-semibold" data-testid="home-platform-title">
              What is DeSci Launch?
            </h2>
            <p className="mt-4 text-slate-300" data-testid="home-platform-description">
              DeSci launchpads replace slow, centralized grant committees with
              community-driven funding models, often using tokenization and
              Decentralized Autonomous Organizations (DAOs). Researchers can
              crowdfund projects directly from a global audience, and all fund
              allocations are recorded on an immutable blockchain, ensuring
              everyone can see how money is used and promoting trust.
              <br />
              These platforms foster global, permissionless collaboration by . . .
            </p>

            <Link
              to="/docs"
              /* Added mt-8 (margin-top) and inline-block */
              className="mt-8 inline-block rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition-colors"
              data-testid="home-platform-docs-link"
            >
              Read the Docs
            </Link>
          </div>
        </ScrollReveal>

        <ScrollReveal delayMs={120}>
          <img
            src="https://static.vecteezy.com/ti/photos-gratuite/p1/31403427-atomique-particule-structure-protons-les-neutrons-electrons-et-au-dela-generatif-ai-photo.jpg"
            className="rounded-2xl object-cover"
            alt="Science"
            data-testid="home-platform-image"
          />
        </ScrollReveal>
      </section>

      <Divider />

      {/* RECENT PROJECTS */}
      <section className="mx-auto max-w-6xl px-6 py-16" data-testid="home-recent-projects-section">
        <ScrollReveal y={20}>
          <h2 className="mb-10 text-3xl font-semibold">Recent Projects</h2>
        </ScrollReveal>
  
        <div className="grid md:grid-cols-3 gap-8">
          {projects.slice(0, 6).map((p, idx) => (
            <ScrollReveal key={p.id || idx} delayMs={idx * 100} y={15}>
              <Link 
                to={`/launches/${p.id}`} 
                className="group block rounded-2xl bg-slate-900/60 ring-1 ring-slate-800 hover:ring-cyan-400 transition-all overflow-hidden"
              >
                <img src={p.image_url} className="h-40 w-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all" alt={p.name} />
                <div className="p-5">
                  <h3 className="text-sm font-semibold group-hover:text-cyan-400 transition-colors">{p.name}</h3>
                  <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-1.5 bg-cyan-400 transition-all duration-1000" 
                      style={{ width: `${p.progress_percent || 0}%` }} 
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-slate-400 uppercase tracking-tight">
                    <span>{p.project_type}</span>
                    <span>{p.progress_percent || 0}% funded</span>
                  </div>
                </div>
              </Link>
              <div class="flex justify-center mt-8">
                <a href="/blog" class="border-2 border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-white font-bold py-2 px-6 rounded-lg transition duration-300">
                  View More
                </a>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>


      <Divider />
      

                {/* TIMELINE */}
                <section
                  className="mx-auto max-w-6xl px-6 py-9 grid md:grid-cols-2 gap-16"
                  data-testid="home-timeline-section"
                >
                  <ScrollReveal>
                    <div data-testid="home-mission-copy">
                      <h2 className="text-3xl font-semibold" data-testid="home-mission-title">
                        Our Mission
                      </h2>
                      <p className="mt-4 text-slate-300" data-testid="home-mission-description">
                        We are committed to accelerating scientific discovery by aligning
                        incentives, transparency, and global collaboration.
                      </p>
                    </div>
                  </ScrollReveal>
          
                  <ScrollReveal delayMs={120}>
                    <ul className="space-y-4 text-sm text-slate-300 pl-20" data-testid="home-mission-timeline">
                      <li class="transition-transform duration-300 hover:scale-110 cursor-pointer">
                        <strong>Q1 2026:</strong> Protocol launch & first cohorts
                      </li>
                      <li>
                        <strong>Q2 2026:</strong> Protocol testing & debugging
                      </li>
                      <li>
                        <strong>Q3 2026:</strong> DAO governance rollout
                      </li>
                      <li>
                        <strong>Q4 2026:</strong> Cross-chain funding expansion
                      </li>
                      <li>
                        <strong>Q1 2027:</strong> Adding new chains to the protocol
                      </li>
                      <li>
                        <strong>Q2 2027:</strong> Institutional Adoption
                      </li>
                      <li>
                        <strong>Q3 2027:</strong> Institutional partnerships
                      </li>
                      <li>
                        <strong>Q4 2027:</strong> Growing the ecosystem
                      </li>
                      <li>
                        <strong>Q1 2028:</strong> Global research marketplace
                      </li>
                    </ul>
                  </ScrollReveal>
                </section>

      <Divider />

      <section className="py-16 bg-gray-900 text-white">
          <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
            <div className="mb-8 md:mb-0 md:w-1/2">
              <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
              <p className="text-gray-400">
                Join our newsletter to get the latest breakthroughs in decentralized science delivered to your inbox.
              </p>
            </div>
            <form className="flex w-full md:w-auto gap-2" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full md:w-64" 
              />
              <button 
                type="submit" 
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg transition duration-300 whitespace-nowrap"
              >
                Join Now
              </button>
            </form>
          </div>
        </section>
      {/* RECENT UPDATES */}
      <section className="mx-auto max-w-6xl px-6 py-6" data-testid="home-recent-updates-section">
        <ScrollReveal>
          <h2 className="mb-10 text-3xl font-semibold" data-testid="home-recent-updates-title">
            Recent Updates
          </h2>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-8" data-testid="home-recent-updates-grid">
          {[1, 2, 3].map((i, idx) => (
            <ScrollReveal key={i} delayMs={idx * 110}>
              <div
                className="rounded-2xl bg-slate-900/60 ring-1 ring-slate-800 overflow-hidden"
                data-testid={`home-update-card-${i}`}
              >
                <img
                  src="https://as2.ftcdn.net/v2/jpg/02/46/77/29/1000_F_246772962_qHJsTucirASR4D77EhhdMDYqVgMKqwPW.jpg"
                  className="h-32 w-full object-cover"
                  alt="Blog"
                  data-testid={`home-update-card-image-${i}`}
                />
                <div className="p-5" data-testid={`home-update-card-body-${i}`}>
                  <h3 className="text-sm font-semibold" data-testid={`home-update-card-title-${i}`}>
                    Platform Update #{i}
                  </h3>
                  <p className="mt-2 text-xs text-slate-400" data-testid={`home-update-card-description-${i}`}>
                    Progress update on protocol development and ecosystem growth.
                  </p>
                  <a
                    href="#"
                    className="mt-4 inline-block rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950"
                    data-testid={`home-update-card-more-link-${i}`}
                  >
                    More
                  </a>
                </div>
              </div>
              <div class="flex justify-center mt-8">
                <a href="/blog" class="border-2 border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-white font-bold py-2 px-6 rounded-lg transition duration-300">
                  View More
                </a>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <Divider />

      {/* FINAL CTA (unchanged) */}
      <section className="py-6 text-center" data-testid="home-final-cta-section">
        <ScrollReveal>
          <h2 className="text-4xl font-semibold" data-testid="home-final-cta-title">
            Launch your research on-chain
          </h2>
        </ScrollReveal>
        <ScrollReveal delayMs={120}>
          <p className="mt-4 text-slate-300" data-testid="home-final-cta-subtitle">
            Apply to raise funding and build in public.
          </p>
        </ScrollReveal>
        <ScrollReveal delayMs={220}>
          <Link
            to="/apply"
            className="mt-8 inline-block rounded-full bg-cyan-500 px-8 py-4 font-semibold text-slate-950"
            data-testid="home-final-cta-apply-button"
          >
            Apply to Launch
          </Link>
        </ScrollReveal>
      </section>
    </div>
  );
}
