import { ArrowRight, ArrowUpRight, CalendarDays, Clock3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSite } from '../context/SiteContext'
import SectionHead from '../components/SectionHead'
import Countdown from '../components/Countdown'

function SmartLink({ url, children, className = '' }) {
  return /^https?:\/\//i.test(url || '')
    ? <a className={className} href={url} target="_blank" rel="noreferrer">{children}</a>
    : <Link className={className} to={url || '#'}>{children}</Link>
}

export default function Events() {
  const { content: d } = useSite()
  const copy = d.home?.sectionCopy?.events || {}
  const timeline = d.timeline || []

  return (
    <div className="page-shell">
      <section className="section page-hero">
        <div className="shell">
          <SectionHead
            kicker={copy.kicker || 'EVENTS'}
            title={copy.title || 'Events, workshops & build nights.'}
            text={copy.text || 'Follow upcoming sessions, registration links and live event countdowns.'}
          />
          <div className="grid events-grid">
            {d.events.map((event) => (
              <article className="card event" key={event.id}>
                <img src={event.image} alt={event.title} />
                <div className="card-body">
                  <div className="event-meta"><span>{event.type}</span><b>{event.status}</b></div>
                  <h3>{event.title}</h3>
                  <p className="event-date"><CalendarDays size={14} />{event.dateLabel}</p>
                  <p>{event.description}</p>
                  <div className="event-links">
                    {(event.links || []).map((link) => (
                      <SmartLink key={link.id || link.label} url={link.url} className={link.kind === 'primary' ? 'link-primary' : 'link-secondary'}>
                        {link.label}<ArrowUpRight size={14} />
                      </SmartLink>
                    ))}
                  </div>
                  <div className="event-count"><Clock3 size={14} /><Countdown target={event.date} /></div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section timeline-section">
        <div className="shell">
          <SectionHead kicker="TIMELINE" title="Where the club is heading." text="A living roadmap of launches, build cycles, workshops and milestones." />
          <div className="timeline">
            {timeline.map((item, index) => (
              <div className="timeline-item" key={item.id}>
                <div className="timeline-dot">{item.icon || String(index + 1).padStart(2, '0')}</div>
                <div className="timeline-date">{item.date}</div>
                <div><h3>{item.title}</h3><p>{item.detail}</p></div>
              </div>
            ))}
          </div>
          <Link className="text-link" to="/announcements">See announcements <ArrowRight size={15} /></Link>
        </div>
      </section>
    </div>
  )
}
