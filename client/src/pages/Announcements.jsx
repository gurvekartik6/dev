import { ArrowUpRight, Megaphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSite } from '../context/SiteContext'
import SectionHead from '../components/SectionHead'

function SmartLink({ url, children }) {
  return /^https?:\/\//i.test(url || '')
    ? <a href={url} target="_blank" rel="noreferrer">{children}</a>
    : <Link to={url || '#'}>{children}</Link>
}

export default function Announcements() {
  const { content: d } = useSite()
  const copy = d.home?.sectionCopy?.announcements || {}

  return (
    <section className="section page-hero">
      <div className="shell">
        <SectionHead kicker={copy.kicker || 'ANNOUNCEMENTS'} title={copy.title || 'What is happening inside DevSphere.'} text={copy.text || 'Important updates, registrations, submissions and club notices.'} />
        <div className="announcement-list">
          {d.announcements.map((item) => (
            <article key={item.id}>
              <div className="announce-icon"><Megaphone size={18} /></div>
              <div>
                <div className="announce-meta"><span>{item.tag}</span><time>{item.date}</time></div>
                <h3>{item.title}</h3>
                <p>{item.message}</p>
              </div>
              <SmartLink url={item.link}><ArrowUpRight /></SmartLink>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
