import { ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, Code2, Layers3, Mail, Timer, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSite } from '../context/SiteContext'
import Scene from '../components/Scene'
import Countdown from '../components/Countdown'

const STAT_ICONS = { users: Users, layers: Layers3, sparkles: Sparkles, code: Code2 }

function SmartLink({ url, children, className = '' }) {
  const external = /^https?:\/\//i.test(url || '')
  return external
    ? <a className={className} href={url} target="_blank" rel="noreferrer">{children}</a>
    : <Link className={className} to={url || '#'}>{children}</Link>
}

export default function Home() {
  const { content: d } = useSite()
  const hero = d.home?.hero || {}
  const home = d.home || {}
  const upcoming = [...d.events]
    .filter((event) => new Date(event.date).getTime() > Date.now())
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0]
  const featuredProjects = d.projects.slice(0, 3)
  const latestAnnouncements = d.announcements.slice(0, 2)

  return (
    <div className="home-page">
      <section className="hero hero-home">
        <Scene config={d.threeScene} />
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="hero-content shell">
          <div className="hero-copy">
            <div className="eyebrow"><span />{hero.eyebrow}</div>
            <h1>{hero.title}<em>{hero.accent}</em></h1>
            <p className="hero-lead">{d.site.tagline}</p>
            <p className="hero-description">{d.site.description}</p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to={hero.primaryPath || '/projects'}>{hero.primaryText || 'Explore projects'}<ArrowRight size={17} /></Link>
              <Link className="btn btn-secondary" to={hero.secondaryPath || '/events'}>{hero.secondaryText || 'View events'}</Link>
            </div>
            <div className="hero-proof">
              <span><CheckCircle2 size={15} /> Student-led</span>
              <span><CheckCircle2 size={15} /> Project-first</span>
              <span><CheckCircle2 size={15} /> Open to builders</span>
            </div>
          </div>

          {upcoming && (
            <aside className="hero-event-card">
              <div className="card-label"><Timer size={15} /> {home.nextEventLabel || 'NEXT EVENT'}</div>
              <p className="eyebrow-small">{upcoming.type} · {upcoming.status}</p>
              <h2>{upcoming.title}</h2>
              <p className="event-date"><CalendarDays size={15} /> {upcoming.dateLabel}</p>
              <p>{upcoming.description}</p>
              <Countdown target={upcoming.date} />
              <Link className="text-link" to="/events">View all events <ArrowRight size={15} /></Link>
            </aside>
          )}
        </div>
        <div className="hero-scroll">SCROLL TO EXPLORE <span>↓</span></div>
      </section>

      <section className="stat-strip shell-wide">
        {d.stats.map((stat) => {
          const Icon = STAT_ICONS[stat.icon] || Sparkles
          return (
          <div className="stat-item" key={stat.id || stat.label}>
            <Icon className="stat-icon" size={16} />
            <span className="stat-value">{stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
          )
        })}
      </section>

      <section className="section home-intro">
        <div className="shell split-intro">
          <div>
            <p className="section-kicker">01 / ABOUT DEVSPHERE</p>
            <h2>Learn by building things that actually work.</h2>
          </div>
          <div className="intro-copy">
            <p>DevSphere is a student technology club at SGGS Nanded where developers, designers and makers come together to learn modern tools, experiment with ideas and ship useful projects.</p>
            <Link className="text-link" to="/projects">See what we are building <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>

      {latestAnnouncements.length > 0 && (
        <section className="section section-soft">
          <div className="shell">
            <div className="section-heading-row">
              <div>
                <p className="section-kicker">02 / LATEST</p>
                <h2>What's happening now.</h2>
              </div>
              <Link className="text-link" to="/announcements">All announcements <ArrowRight size={15} /></Link>
            </div>
            <div className="announcement-preview">
              {latestAnnouncements.map((item) => (
                <article key={item.id}>
                  <div className="announcement-date">{item.tag}<span>{item.date}</span></div>
                  <h3>{item.title}</h3>
                  <p>{item.message}</p>
                  <SmartLink url={item.link} className="icon-link"><ArrowUpRight size={18} /></SmartLink>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="shell">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">03 / FEATURED PROJECTS</p>
              <h2>Ideas, prototypes, products.</h2>
            </div>
            <Link className="text-link" to="/projects">View all projects <ArrowRight size={15} /></Link>
          </div>
          <div className="project-grid-home">
            {featuredProjects.map((project) => (
              <article className="project-card-home" key={project.id}>
                <div className="project-cover"><img src={project.image} alt={project.title} /><span>{project.category}</span></div>
                <div className="project-card-content">
                  <div className="project-icon"><Layers3 size={17} /></div>
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                  <div className="tag-list">{(project.tech || []).map((tech) => <span key={tech}>{tech}</span>)}</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section home-cta-section">
        <div className="shell home-cta">
          <div>
            <p className="section-kicker">04 / JOIN THE BUILD</p>
            <h2>Have an idea?<br /><em>Let's build it.</em></h2>
            <p>Join a project, bring an idea, collaborate with the core team, or simply start learning with us.</p>
          </div>
          <div className="cta-actions">
            <Link className="btn btn-primary" to="/contact"><Mail size={17} /> Contact DevSphere</Link>
            <Link className="btn btn-secondary" to="/team">Meet the team</Link>
          </div>
          <div className="cta-mark"><Code2 size={30} /><span>BUILD<br />LEARN<br />SHIP</span></div>
        </div>
      </section>
    </div>
  )
}
